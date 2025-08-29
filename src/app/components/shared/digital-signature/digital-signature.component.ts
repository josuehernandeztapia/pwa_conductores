import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MifielService, MifielDocument } from '../../../services/mifiel.service';
import { PdfService } from '../../../services/pdf.service';
import { ToastService } from '../../../services/toast.service';
import { MakeIntegrationService } from '../../../services/make-integration.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-digital-signature',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="digital-signature-container">
      <div class="signature-header">
        <h3 class="text-lg font-semibold text-white mb-4">Firma Digital</h3>
        <div class="flex items-center gap-2 mb-4">
          <div [class]="getStatusClasses()">
            <i [class]="getStatusIcon()"></i>
            <span>{{ getStatusText() }}</span>
          </div>
        </div>
      </div>

      <!-- Formulario para crear documento -->
      @if (mode() === 'create') {
        <div class="create-form bg-gray-700 p-4 rounded-lg mb-4">
          <h4 class="text-md font-medium text-white mb-3">Crear Documento para Firma</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm text-gray-300 mb-2">Nombre del Documento</label>
              <input 
                type="text"
                [(ngModel)]="documentName"
                class="w-full px-3 py-2 bg-gray-600 text-white rounded-lg"
                placeholder="Contrato de Venta a Plazo - Juan Pérez">
            </div>
            <div>
              <label class="block text-sm text-gray-300 mb-2">Archivo PDF</label>
              <input 
                type="file"
                accept=".pdf"
                (change)="onFileSelected($event)"
                class="w-full px-3 py-2 bg-gray-600 text-white rounded-lg">
            </div>
          </div>

          <div class="signer-info bg-gray-600 p-3 rounded-lg mb-4">
            <h5 class="text-sm font-medium text-white mb-3">Datos del Firmante</h5>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input 
                type="text"
                [(ngModel)]="signerName"
                placeholder="Nombre Completo"
                class="px-3 py-2 bg-gray-500 text-white rounded">
              <input 
                type="email"
                [(ngModel)]="signerEmail"
                placeholder="correo@ejemplo.com"
                class="px-3 py-2 bg-gray-500 text-white rounded">
              <input 
                type="text"
                [(ngModel)]="signerRFC"
                placeholder="RFC (12-13 caracteres)"
                class="px-3 py-2 bg-gray-500 text-white rounded">
            </div>
          </div>

          <button 
            (click)="createDocument()"
            [disabled]="isCreating()"
            class="w-full bg-primary-cyan-600 hover:bg-primary-cyan-700 text-white py-3 px-4 rounded-lg font-medium disabled:opacity-50">
            @if (isCreating()) {
              <i class="fas fa-spinner fa-spin mr-2"></i>
              Creando documento...
            } @else {
              <i class="fas fa-file-signature mr-2"></i>
              Crear Documento para Firma
            }
          </button>
        </div>
      }

      <!-- Widget de firma -->
      @if (mode() === 'sign' && currentDocument()) {
        <div class="signing-widget bg-gray-700 p-4 rounded-lg mb-4">
          <h4 class="text-md font-medium text-white mb-3">
            Firmar: {{ currentDocument()?.name }}
          </h4>
          
          <!-- Container donde se renderiza el widget de Mifiel -->
          <div id="mifiel-widget-container" class="min-h-96 bg-white rounded-lg"></div>
          
          <div class="mt-4 flex gap-2">
            <button 
              (click)="mode.set('create')"
              class="px-4 py-2 bg-gray-600 text-white rounded-lg">
              Volver
            </button>
            <button 
              (click)="refreshDocumentStatus()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg">
              <i class="fas fa-refresh mr-2"></i>
              Actualizar Estado
            </button>
          </div>
        </div>
      }

      <!-- Lista de documentos -->
      @if (documents().length > 0) {
        <div class="documents-list">
          <h4 class="text-md font-medium text-white mb-3">Documentos Recientes</h4>
          <div class="space-y-2">
            @for (doc of documents(); track doc.id) {
              <div class="document-item bg-gray-700 p-3 rounded-lg flex items-center justify-between">
                <div class="flex items-center">
                  <i [class]="getDocumentIcon(doc.status)" class="mr-3"></i>
                  <div>
                    <p class="text-white font-medium">{{ doc.name }}</p>
                    <p class="text-sm text-gray-400">
                      {{ formatDate(doc.created_at) }} • {{ getDocumentStatusText(doc.status) }}
                    </p>
                  </div>
                </div>
                <div class="flex gap-2">
                  @if (doc.status === 'pending') {
                    <button 
                      (click)="signDocument(doc)"
                      class="px-3 py-1 bg-amber-600 text-white text-sm rounded">
                      Firmar
                    </button>
                  }
                  @if (doc.status === 'completed' && doc.download_url) {
                    <button 
                      (click)="downloadDocument(doc.id)"
                      class="px-3 py-1 bg-green-600 text-white text-sm rounded">
                      Descargar
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class DigitalSignatureComponent {
  @Input() clientId?: string;
  @Output() documentSigned = new EventEmitter<MifielDocument>();

  // State
  protected readonly mode = signal<'create' | 'sign'>('create');
  protected readonly currentDocument = signal<MifielDocument | null>(null);
  protected readonly documents = signal<MifielDocument[]>([]);
  protected readonly isCreating = signal(false);

  // Form data
  documentName = '';
  selectedFile: File | null = null;
  signerName = '';
  signerEmail = '';
  signerRFC = '';

  constructor(
    private mifielService: MifielService,
    private pdfService: PdfService,
    private toastService: ToastService,
    private makeIntegration: MakeIntegrationService
  ) {
    this.loadDocuments();
  }

  async onFileSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
    } else {
      this.toastService.error('Por favor selecciona un archivo PDF válido');
    }
  }

  async createDocument(): Promise<void> {
    if (!this.selectedFile || !this.documentName || !this.signerName || !this.signerEmail || !this.signerRFC) {
      this.toastService.error('Por favor completa todos los campos');
      return;
    }

    this.isCreating.set(true);

    try {
      // Convertir PDF a base64
      const base64Content = await this.fileToBase64(this.selectedFile);

      const request = {
        name: this.documentName,
        content: base64Content,
        signers: [{
          name: this.signerName,
          email: this.signerEmail,
          tax_id: this.signerRFC
        }]
      };

      const document = await this.mifielService.createDocument(request).toPromise();
      
      if (document) {
        this.currentDocument.set(document);
        this.documents.update(docs => [document, ...docs]);
        this.toastService.success('Documento creado exitosamente');
        
        // Reset form
        this.resetForm();
        
        // Switch to sign mode
        this.mode.set('sign');
        
        // Initialize widget
        setTimeout(() => {
          this.initializeWidget(document);
        }, 100);
      }
    } catch (error) {
      console.error('Error creating document:', error);
      this.toastService.error('Error al crear el documento');
    } finally {
      this.isCreating.set(false);
    }
  }

  async signDocument(document: MifielDocument): Promise<void> {
    this.currentDocument.set(document);
    this.mode.set('sign');
    
    setTimeout(() => {
      this.initializeWidget(document);
    }, 100);
  }

  private async initializeWidget(document: MifielDocument): Promise<void> {
    if (document.signers.length > 0) {
      const signer = document.signers[0];
      
      if (signer.widget_id) {
        try {
          await this.mifielService.initializeSigningWidget(
            'mifiel-widget-container',
            signer.widget_id,
            (data) => {
              this.toastService.success('Documento firmado exitosamente');
              
              // Send to Make.com automation (fire-and-forget)
              this.makeIntegration.sendSignatureComplete({
                clientId: this.clientId || '',
                documentId: document.id,
                documentName: document.name || 'Contrato firmado',
                signerName: document.signers[0]?.name || 'Cliente',
                signerEmail: document.signers[0]?.email || '',
                timestamp: new Date()
              }).pipe(
                catchError((error: any) => {
                  console.warn('Make.com webhook failed (non-critical):', error);
                  return of(null);
                })
              ).subscribe();
              
              this.refreshDocumentStatus();
              this.documentSigned.emit(document);
            },
            (error) => {
              console.error('Error signing document:', error);
              this.toastService.error('Error al firmar el documento');
            }
          );
        } catch (error) {
          console.error('Error initializing widget:', error);
          this.toastService.error('Error al inicializar el widget de firma');
        }
      }
    }
  }

  async refreshDocumentStatus(): Promise<void> {
    const current = this.currentDocument();
    if (current) {
      try {
        const updated = await this.mifielService.getDocument(current.id).toPromise();
        if (updated) {
          this.currentDocument.set(updated);
          this.documents.update(docs => 
            docs.map(doc => doc.id === updated.id ? updated : doc)
          );
        }
      } catch (error) {
        console.error('Error refreshing document:', error);
      }
    }
  }

  async downloadDocument(documentId: string): Promise<void> {
    try {
      const blob = await this.mifielService.downloadDocument(documentId).toPromise();
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `documento_firmado_${documentId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      this.toastService.error('Error al descargar el documento');
    }
  }

  private async loadDocuments(): Promise<void> {
    try {
      const response = await this.mifielService.getDocuments().toPromise();
      if (response?.documents) {
        this.documents.set(response.documents);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remover el prefijo "data:application/pdf;base64,"
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  }

  private resetForm(): void {
    this.documentName = '';
    this.selectedFile = null;
    this.signerName = '';
    this.signerEmail = '';
    this.signerRFC = '';
  }

  // UI Helper methods
  getStatusClasses(): string {
    return 'flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-blue-600 text-white';
  }

  getStatusIcon(): string {
    return 'fas fa-file-signature';
  }

  getStatusText(): string {
    return 'Sistema de Firma Digital';
  }

  getDocumentIcon(status: string): string {
    const icons = {
      pending: 'fas fa-clock text-amber-400',
      signed: 'fas fa-signature text-blue-400',
      completed: 'fas fa-check-circle text-green-400'
    };
    return icons[status as keyof typeof icons] || 'fas fa-file text-gray-400';
  }

  getDocumentStatusText(status: string): string {
    const statusTexts = {
      pending: 'Pendiente de firma',
      signed: 'Firmado',
      completed: 'Completado'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-MX');
  }
}