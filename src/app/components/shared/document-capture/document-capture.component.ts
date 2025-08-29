import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentRulesEngineService, DocumentRequirement, ProductConfiguration } from '../../../services/document-rules-engine.service';
import { IndexedDbService, StoredDocument } from '../../../services/indexed-db.service';
import { MakeIntegrationService } from '../../../services/make-integration.service';
import { catchError, of } from 'rxjs';

export interface CapturedDocument {
  name: string;
  file: File;
  timestamp: Date;
  preview?: string;
}

@Component({
  selector: 'app-document-capture',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-full sm:max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 space-y-2 sm:space-y-0">
        <h2 class="text-lg sm:text-xl font-semibold text-gray-900">
          Documentos Requeridos - {{clientName}}
        </h2>
        <div class="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {{completedDocuments().length}} / {{requiredDocuments().length}} completados
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="mb-6">
        <div class="bg-gray-200 rounded-full h-2">
          <div 
            class="bg-primary-cyan-400 h-2 rounded-full transition-all duration-300"
            [style.width.%]="completionPercentage()">
          </div>
        </div>
        <div class="text-center mt-2 text-sm text-gray-600">
          {{completionPercentage()}}% completado
        </div>
      </div>

      <!-- Configuration Display -->
      <div class="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm">
          <div>
            <span class="font-medium text-gray-700">Mercado:</span>
            <div class="text-gray-900 capitalize">{{configuration.market}}</div>
          </div>
          <div>
            <span class="font-medium text-gray-700">Producto:</span>
            <div class="text-gray-900 capitalize">{{configuration.product.replace('-', ' ')}}</div>
          </div>
          <div *ngIf="configuration.clientType">
            <span class="font-medium text-gray-700">Tipo:</span>
            <div class="text-gray-900 capitalize">{{configuration.clientType}}</div>
          </div>
        </div>
      </div>

      <!-- Document List -->
      <div class="space-y-4">
        @for (doc of requiredDocuments(); track doc.name) {
          <div class="border rounded-lg p-3 sm:p-4 transition-all duration-200" 
               [class.bg-green-50]="isDocumentCompleted(doc.name)"
               [class.border-green-300]="isDocumentCompleted(doc.name)"
               [class.bg-white]="!isDocumentCompleted(doc.name)"
               [class.border-gray-200]="!isDocumentCompleted(doc.name)">
            
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                  @if (isDocumentCompleted(doc.name)) {
                    <div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                  } @else {
                    <div class="w-6 h-6 border-2 border-gray-300 rounded-full flex items-center justify-center">
                      <div class="w-3 h-3 bg-gray-300 rounded-full"></div>
                    </div>
                  }
                </div>
                
                <div>
                  <h3 class="font-medium text-gray-900">{{doc.name}}</h3>
                  @if (doc.tooltip) {
                    <p class="text-sm text-gray-600">{{doc.tooltip}}</p>
                  }
                </div>
              </div>
              
              <!-- Status Badge -->
              @if (isDocumentCompleted(doc.name)) {
                <span class="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Completado
                </span>
              } @else if (doc.isRequired) {
                <span class="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Requerido
                </span>
              } @else {
                <span class="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Opcional
                </span>
              }
            </div>

            <!-- Upload Instructions -->
            <div class="mb-3 text-sm text-gray-600">
              {{getUploadInstructions(doc.name)}}
            </div>

            <!-- Existing Document Preview -->
            @if (getStoredDocument(doc.name); as storedDoc) {
              <div class="mb-3 p-3 bg-gray-50 rounded-lg border">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0">
                      @if (storedDoc.fileType.startsWith('image/')) {
                        <img 
                          [src]="'data:' + storedDoc.fileType + ';base64,' + storedDoc.fileData" 
                          alt="Document preview"
                          class="w-12 h-12 object-cover rounded border">
                      } @else {
                        <div class="w-12 h-12 bg-gray-200 rounded border flex items-center justify-center">
                          <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                        </div>
                      }
                    </div>
                    <div>
                      <div class="font-medium text-gray-900">{{storedDoc.fileName}}</div>
                      <div class="text-sm text-gray-500">
                        {{formatFileSize(storedDoc.size)}} • {{formatDate(storedDoc.timestamp)}}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    (click)="removeDocument(storedDoc.id)"
                    class="text-red-600 hover:text-red-800 text-sm font-medium">
                    Eliminar
                  </button>
                </div>
              </div>
            }

            <!-- Upload Actions -->
            @if (!isDocumentCompleted(doc.name)) {
              <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <!-- Camera Capture -->
                <button
                  type="button"
                  (click)="startCameraCapture(doc.name)"
                  [disabled]="isCapturing()"
                  class="flex-1 bg-primary-cyan-600 hover:bg-primary-cyan-700 active:bg-primary-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 sm:py-2 rounded-lg font-medium text-sm flex items-center justify-center space-x-2 min-h-[44px] touch-manipulation">
                  <svg class="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <span>Fotografiar</span>
                </button>

                <!-- File Upload -->
                <button
                  type="button"
                  (click)="triggerFileInput(doc.name)"
                  class="flex-1 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white px-4 py-3 sm:py-2 rounded-lg font-medium text-sm flex items-center justify-center space-x-2 min-h-[44px] touch-manipulation">
                  <svg class="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                  <span>Subir Archivo</span>
                </button>
              </div>
            }
          </div>
        }
      </div>

      <!-- Camera Modal -->
      @if (showCamera()) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-lg max-h-[90vh] flex flex-col">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold truncate pr-2">Capturar {{currentDocumentName()}}</h3>
              <button
                type="button"
                (click)="closeCamera()"
                class="text-gray-500 hover:text-gray-700 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Camera Preview -->
            <div class="mb-4 flex-1 flex items-center justify-center">
              <video 
                #videoElement
                class="w-full max-h-[40vh] sm:max-h-[50vh] rounded-lg border bg-black object-cover"
                autoplay
                playsinline>
              </video>
            </div>

            <!-- Camera Controls -->
            <div class="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                type="button"
                (click)="capturePhoto()"
                class="bg-primary-cyan-600 hover:bg-primary-cyan-700 active:bg-primary-cyan-800 text-white px-6 py-3 sm:py-2 rounded-lg font-medium flex items-center justify-center space-x-2 min-h-[44px] touch-manipulation">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span>Capturar</span>
              </button>
              
              <button
                type="button"
                (click)="closeCamera()"
                class="bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white px-6 py-3 sm:py-2 rounded-lg font-medium min-h-[44px] touch-manipulation">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Loading State -->
      @if (isCapturing()) {
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-6 text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-cyan-600 mx-auto mb-4"></div>
            <p class="text-gray-600">Guardando documento...</p>
          </div>
        </div>
      }

      <!-- File Input (Hidden) -->
      <input
        #fileInput
        type="file"
        accept="image/*,.pdf"
        style="display: none"
        (change)="onFileSelected($event)">
      
      <!-- Canvas (Hidden) -->
      <canvas #canvasElement style="display: none"></canvas>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class DocumentCaptureComponent {
  @Input() clientId!: string;
  @Input() clientName!: string;
  @Input() configuration!: ProductConfiguration;
  
  @Output() documentCaptured = new EventEmitter<CapturedDocument>();
  @Output() documentsUpdated = new EventEmitter<void>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Signals
  private storedDocuments = signal<StoredDocument[]>([]);
  private requiredDocs = signal<DocumentRequirement[]>([]);
  
  showCamera = signal(false);
  currentDocumentName = signal('');
  isCapturing = signal(false);
  
  private mediaStream: MediaStream | null = null;
  private currentDocumentForUpload = '';

  // Computed values
  requiredDocuments = computed(() => this.requiredDocs());
  
  completedDocuments = computed(() => 
    this.requiredDocs().filter(doc => 
      this.storedDocuments().some(stored => stored.documentName === doc.name)
    )
  );
  
  completionPercentage = computed(() => {
    const total = this.requiredDocs().length;
    const completed = this.completedDocuments().length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  });

  constructor(
    private documentRulesEngine: DocumentRulesEngineService,
    private makeIntegration: MakeIntegrationService,
    private indexedDbService: IndexedDbService
  ) {}

  async ngOnInit() {
    await this.loadRequiredDocuments();
    await this.loadStoredDocuments();
  }

  ngOnDestroy() {
    this.closeCamera();
  }

  private async loadRequiredDocuments() {
    const docs = this.documentRulesEngine.getRequiredDocuments(this.configuration);
    this.requiredDocs.set(docs);
  }

  private async loadStoredDocuments() {
    try {
      const docs = await this.indexedDbService.getDocumentsByClient(this.clientId);
      this.storedDocuments.set(docs);
    } catch (error) {
      console.error('Error loading stored documents:', error);
    }
  }

  isDocumentCompleted(documentName: string): boolean {
    return this.storedDocuments().some(doc => doc.documentName === documentName);
  }

  getStoredDocument(documentName: string): StoredDocument | undefined {
    return this.storedDocuments().find(doc => doc.documentName === documentName);
  }

  getUploadInstructions(documentName: string): string {
    return this.documentRulesEngine.getDocumentUploadInstructions(documentName);
  }

  async startCameraCapture(documentName: string) {
    this.currentDocumentName.set(documentName);
    this.showCamera.set(true);

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera by default
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setTimeout(() => {
        if (this.videoElement?.nativeElement && this.mediaStream) {
          this.videoElement.nativeElement.srcObject = this.mediaStream;
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('No se pudo acceder a la cámara. Por favor, usa la opción de subir archivo.');
      this.closeCamera();
    }
  }

  closeCamera() {
    this.showCamera.set(false);
    this.currentDocumentName.set('');
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  async capturePhoto() {
    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d')!;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    this.isCapturing.set(true);

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
      });

      // Create file from blob
      const fileName = `${this.currentDocumentName()}_${new Date().getTime()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      await this.saveDocument(this.currentDocumentName(), file);
      this.closeCamera();
    } catch (error) {
      console.error('Error capturing photo:', error);
      alert('Error al capturar la foto. Intenta de nuevo.');
    } finally {
      this.isCapturing.set(false);
    }
  }

  triggerFileInput(documentName: string) {
    this.currentDocumentForUpload = documentName;
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.isCapturing.set(true);
      
      try {
        await this.saveDocument(this.currentDocumentForUpload, file);
      } catch (error) {
        console.error('Error saving file:', error);
        alert('Error al guardar el archivo. Intenta de nuevo.');
      } finally {
        this.isCapturing.set(false);
      }
    }

    // Reset input
    input.value = '';
    this.currentDocumentForUpload = '';
  }

  private async saveDocument(documentName: string, file: File) {
    try {
      // Convert file to base64
      const base64Data = await this.indexedDbService.fileToBase64(file);
      
      // Create stored document
      const storedDocument: StoredDocument = {
        id: this.indexedDbService.generateDocumentId(this.clientId, documentName),
        clientId: this.clientId,
        documentName: documentName,
        fileName: file.name,
        fileType: file.type,
        fileData: base64Data,
        timestamp: new Date(),
        size: file.size,
        market: this.configuration.market,
        product: this.configuration.product
      };

      // Save to IndexedDB
      await this.indexedDbService.storeDocument(storedDocument);
      
      // Reload stored documents
      await this.loadStoredDocuments();
      
      // Send to Make.com automation (fire-and-forget)
      this.makeIntegration.sendDocumentUpload({
        clientId: this.clientId,
        documentName: documentName,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        timestamp: new Date(),
        market: this.configuration.market,
        product: this.configuration.product
      }).pipe(
        catchError((error: any) => {
          console.warn('Make.com webhook failed (non-critical):', error);
          return of(null);
        })
      ).subscribe();
      
      // Emit events
      this.documentCaptured.emit({
        name: documentName,
        file: file,
        timestamp: new Date()
      });
      
      this.documentsUpdated.emit();

    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  }

  async removeDocument(documentId: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este documento?')) {
      try {
        await this.indexedDbService.deleteDocument(documentId);
        await this.loadStoredDocuments();
        this.documentsUpdated.emit();
      } catch (error) {
        console.error('Error removing document:', error);
        alert('Error al eliminar el documento. Intenta de nuevo.');
      }
    }
  }

  formatFileSize(bytes: number): string {
    return this.indexedDbService.formatFileSize(bytes);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }
}