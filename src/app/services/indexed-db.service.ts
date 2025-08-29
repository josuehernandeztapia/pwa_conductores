import { Injectable } from '@angular/core';

export interface StoredDocument {
  id: string;
  clientId: string;
  documentName: string;
  fileName: string;
  fileType: string;
  fileData: string; // Base64 encoded file data
  timestamp: Date;
  size: number;
  market: 'aguascalientes' | 'edomex';
  product: 'venta-directa' | 'venta-plazo' | 'ahorro-programado';
}

export interface ClientDocumentSummary {
  clientId: string;
  clientName: string;
  documents: StoredDocument[];
  totalSize: number;
  lastModified: Date;
}

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private dbName = 'ConductoresDocumentStorage';
  private dbVersion = 1;
  private documentsStore = 'documents';
  private db: IDBDatabase | null = null;

  async initializeDb(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Error opening IndexedDB:', request.error);
        reject(false);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create documents object store
        if (!db.objectStoreNames.contains(this.documentsStore)) {
          const documentsStore = db.createObjectStore(this.documentsStore, { keyPath: 'id' });
          
          // Create indexes for efficient querying
          documentsStore.createIndex('clientId', 'clientId', { unique: false });
          documentsStore.createIndex('documentName', 'documentName', { unique: false });
          documentsStore.createIndex('timestamp', 'timestamp', { unique: false });
          documentsStore.createIndex('market', 'market', { unique: false });
          documentsStore.createIndex('product', 'product', { unique: false });
          
          console.log('Document store created with indexes');
        }
      };
    });
  }

  async storeDocument(document: StoredDocument): Promise<boolean> {
    if (!this.db) {
      await this.initializeDb();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.documentsStore], 'readwrite');
      const store = transaction.objectStore(this.documentsStore);
      
      const request = store.put(document);
      
      request.onsuccess = () => {
        console.log('Document stored successfully:', document.documentName);
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('Error storing document:', request.error);
        reject(false);
      };
    });
  }

  async getDocumentsByClient(clientId: string): Promise<StoredDocument[]> {
    if (!this.db) {
      await this.initializeDb();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.documentsStore], 'readonly');
      const store = transaction.objectStore(this.documentsStore);
      const index = store.index('clientId');
      
      const request = index.getAll(clientId);
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = () => {
        console.error('Error retrieving documents:', request.error);
        reject([]);
      };
    });
  }

  async getDocument(documentId: string): Promise<StoredDocument | null> {
    if (!this.db) {
      await this.initializeDb();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.documentsStore], 'readonly');
      const store = transaction.objectStore(this.documentsStore);
      
      const request = store.get(documentId);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        console.error('Error retrieving document:', request.error);
        reject(null);
      };
    });
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    if (!this.db) {
      await this.initializeDb();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.documentsStore], 'readwrite');
      const store = transaction.objectStore(this.documentsStore);
      
      const request = store.delete(documentId);
      
      request.onsuccess = () => {
        console.log('Document deleted successfully');
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('Error deleting document:', request.error);
        reject(false);
      };
    });
  }

  async getAllClients(): Promise<ClientDocumentSummary[]> {
    if (!this.db) {
      await this.initializeDb();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.documentsStore], 'readonly');
      const store = transaction.objectStore(this.documentsStore);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        const allDocuments: StoredDocument[] = request.result || [];
        const clientMap = new Map<string, ClientDocumentSummary>();
        
        allDocuments.forEach(doc => {
          if (!clientMap.has(doc.clientId)) {
            clientMap.set(doc.clientId, {
              clientId: doc.clientId,
              clientName: `Cliente ${doc.clientId}`, // Could be enhanced with actual client names
              documents: [],
              totalSize: 0,
              lastModified: doc.timestamp
            });
          }
          
          const clientSummary = clientMap.get(doc.clientId)!;
          clientSummary.documents.push(doc);
          clientSummary.totalSize += doc.size;
          
          if (doc.timestamp > clientSummary.lastModified) {
            clientSummary.lastModified = doc.timestamp;
          }
        });
        
        resolve(Array.from(clientMap.values()));
      };
      
      request.onerror = () => {
        console.error('Error retrieving all clients:', request.error);
        reject([]);
      };
    });
  }

  async getTotalStorageUsed(): Promise<number> {
    if (!this.db) {
      await this.initializeDb();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.documentsStore], 'readonly');
      const store = transaction.objectStore(this.documentsStore);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        const allDocuments: StoredDocument[] = request.result || [];
        const totalSize = allDocuments.reduce((sum, doc) => sum + doc.size, 0);
        resolve(totalSize);
      };
      
      request.onerror = () => {
        console.error('Error calculating storage usage:', request.error);
        reject(0);
      };
    });
  }

  async clearClientDocuments(clientId: string): Promise<boolean> {
    if (!this.db) {
      await this.initializeDb();
    }

    try {
      const documents = await this.getDocumentsByClient(clientId);
      const deletePromises = documents.map(doc => this.deleteDocument(doc.id));
      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      console.error('Error clearing client documents:', error);
      return false;
    }
  }

  // Utility methods for file handling
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get only base64 data
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  base64ToFile(base64Data: string, fileName: string, fileType: string): File {
    // Convert base64 to binary
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], fileName, { type: fileType });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  generateDocumentId(clientId: string, documentName: string): string {
    const timestamp = new Date().getTime();
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${clientId}_${documentName.replace(/\s+/g, '_')}_${timestamp}_${randomStr}`;
  }
}