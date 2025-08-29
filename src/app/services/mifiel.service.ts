import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MifielDocument {
  id: string;
  original_hash: string;
  name: string;
  status: 'pending' | 'signed' | 'completed';
  download_url?: string;
  signers: MifielSigner[];
  created_at: string;
}

export interface MifielSigner {
  id: string;
  name: string;
  email: string;
  tax_id: string; // RFC
  signed_at?: string;
  status: 'pending' | 'signed';
  widget_id?: string;
}

export interface CreateDocumentRequest {
  name: string;
  content: string; // Base64 del PDF
  signers: {
    name: string;
    email: string;
    tax_id: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class MifielService {
  private readonly apiUrl = environment.mifiel.apiUrl;
  private readonly apiKey = environment.mifiel.apiKey;
  
  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Token token=${this.apiKey}`,
      'Content-Type': 'application/json'
    });
  }

  // Crear documento para firma
  createDocument(request: CreateDocumentRequest): Observable<MifielDocument> {
    return this.http.post<MifielDocument>(
      `${this.apiUrl}documents`,
      request,
      { headers: this.getHeaders() }
    );
  }

  // Obtener estado del documento
  getDocument(documentId: string): Observable<MifielDocument> {
    return this.http.get<MifielDocument>(
      `${this.apiUrl}documents/${documentId}`,
      { headers: this.getHeaders() }
    );
  }

  // Listar documentos
  getDocuments(): Observable<{ documents: MifielDocument[] }> {
    return this.http.get<{ documents: MifielDocument[] }>(
      `${this.apiUrl}documents`,
      { headers: this.getHeaders() }
    );
  }

  // Descargar documento firmado
  downloadDocument(documentId: string): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}documents/${documentId}/download`,
      {
        headers: this.getHeaders(),
        responseType: 'blob'
      }
    );
  }

  // Cargar widget de firma
  async loadSigningWidget(): Promise<any> {
    return new Promise((resolve, reject) => {
      if ((window as any).Mifiel) {
        resolve((window as any).Mifiel);
        return;
      }

      const script = document.createElement('script');
      script.src = environment.mifiel.widgetUrl;
      script.onload = () => resolve((window as any).Mifiel);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Inicializar widget de firma
  async initializeSigningWidget(
    containerId: string, 
    widgetId: string,
    onSuccess: (data: any) => void,
    onError: (error: any) => void
  ): Promise<void> {
    const Mifiel = await this.loadSigningWidget();
    
    const widget = new Mifiel.Widget({
      widgetId: widgetId,
      containerId: containerId,
      successCallback: onSuccess,
      errorCallback: onError,
      sandbox: !environment.production
    });

    widget.render();
  }
}