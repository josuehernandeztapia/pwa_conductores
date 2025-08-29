import { Component, OnInit, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { 
  DocumentManagementService, 
  DocumentUpload, 
  ExpedienteCompleto,
  DocumentDashboard,
  BatchUploadResult 
} from '../../../services/document-management.service';

@Component({
  selector: 'app-document-center',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="document-center-container">
      
      <!-- Header with stats -->
      <div class="document-header">
        <div class="header-left">
          <h2 class="center-title">
            <span class="title-icon">📋</span>
            Centro de Documentos
          </h2>
          <p class="center-subtitle">Gestión centralizada de expedientes digitales con validación automática</p>
        </div>
        
        <div class="header-stats" *ngIf="dashboard()">
          <div class="stat-card pending">
            <div class="stat-number">{{ dashboard()?.metricas.totalPendientes || 0 }}</div>
            <div class="stat-label">Pendientes</div>
          </div>
          <div class="stat-card approval">
            <div class="stat-number">{{ (dashboard()?.metricas.tasaAprobacion || 0) | number:'1.0-0' }}%</div>
            <div class="stat-label">Aprobación</div>
          </div>
          <div class="stat-card today">
            <div class="stat-number">{{ dashboard()?.metricas.documentosHoy || 0 }}</div>
            <div class="stat-label">Hoy</div>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="action-bar">
        <div class="action-buttons">
          <button class="btn btn-primary" (click)="showUploadModal.set(true)">
            <span class="btn-icon">📁</span>
            Subir Documentos
          </button>
          
          <button class="btn btn-secondary" (click)="showBatchModal.set(true)">
            <span class="btn-icon">📦</span>
            Subida Masiva
          </button>
          
          <button class="btn btn-secondary" (click)="showSearchModal.set(true)">
            <span class="btn-icon">🔍</span>
            Buscar
          </button>
          
          <button class="btn btn-secondary" (click)="refreshData()">
            <span class="btn-icon">🔄</span>
            Actualizar
          </button>
        </div>
        
        <div class="view-toggles">
          <button 
            *ngFor="let view of views"
            class="view-toggle"
            [class.active]="activeView() === view.id"
            (click)="setActiveView(view.id)">
            <span class="view-icon">{{ view.icon }}</span>
            {{ view.label }}
          </button>
        </div>
      </div>

      <!-- Alerts panel -->
      <div class="alerts-panel" *ngIf="dashboard()?.alertas && hasAlerts()">
        <div class="alert-item critical" *ngIf="dashboard()!.alertas.expedientesVencidos > 0">
          <span class="alert-icon">⚠️</span>
          <span class="alert-text">
            {{ dashboard()!.alertas.expedientesVencidos }} expedientes vencidos
          </span>
          <button class="alert-action">Ver</button>
        </div>
        
        <div class="alert-item warning" *ngIf="dashboard()!.alertas.documentosRechazados > 0">
          <span class="alert-icon">❌</span>
          <span class="alert-text">
            {{ dashboard()!.alertas.documentosRechazados }} documentos rechazados
          </span>
          <button class="alert-action">Revisar</button>
        </div>
        
        <div class="alert-item info" *ngIf="dashboard()!.alertas.validacionesAtrasadas > 0">
          <span class="alert-icon">⏰</span>
          <span class="alert-text">
            {{ dashboard()!.alertas.validacionesAtrasadas }} validaciones atrasadas
          </span>
          <button class="alert-action">Procesar</button>
        </div>
      </div>

      <!-- Main content -->
      <div class="main-content">

        <!-- Upload Queue View -->
        <div *ngIf="activeView() === 'uploads'" class="uploads-view">
          <div class="upload-sections">
            
            <!-- Active uploads -->
            <div class="upload-section active" *ngIf="activeUploads().length > 0">
              <h3 class="section-title">
                <span class="section-icon">⏳</span>
                Procesando ({{ activeUploads().length }})
              </h3>
              
              <div class="upload-list">
                <div *ngFor="let doc of activeUploads()" class="upload-item active">
                  <div class="upload-info">
                    <div class="file-icon">{{ getFileIcon(doc.tipo) }}</div>
                    <div class="file-details">
                      <div class="file-name">{{ doc.nombre }}</div>
                      <div class="file-meta">
                        <span class="file-type">{{ getDocumentTypeName(doc.tipo) }}</span>
                        <span class="file-size" *ngIf="doc.tamano">{{ formatFileSize(doc.tamano) }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="upload-progress">
                    <div class="progress-info">
                      <span class="progress-text">{{ getProgressText(doc.estado) }}</span>
                      <span class="progress-percent">{{ doc.progreso }}%</span>
                    </div>
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="doc.progreso"></div>
                    </div>
                  </div>
                  
                  <div class="upload-actions">
                    <button class="action-btn cancel" (click)="cancelUpload(doc.id)">
                      ❌
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Completed uploads -->
            <div class="upload-section completed" *ngIf="completedUploads().length > 0">
              <h3 class="section-title">
                <span class="section-icon">✅</span>
                Completados ({{ completedUploads().length }})
              </h3>
              
              <div class="upload-list">
                <div *ngFor="let doc of completedUploads()" class="upload-item" [class]="doc.estado">
                  <div class="upload-info">
                    <div class="file-icon">{{ getFileIcon(doc.tipo) }}</div>
                    <div class="file-details">
                      <div class="file-name">{{ doc.nombre }}</div>
                      <div class="file-meta">
                        <span class="file-type">{{ getDocumentTypeName(doc.tipo) }}</span>
                        <span class="validation-score" *ngIf="doc.confianzaOCR">
                          OCR: {{ doc.confianzaOCR }}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="upload-status">
                    <span class="status-badge" [class]="doc.estado">
                      {{ getStatusText(doc.estado) }}
                    </span>
                    <div class="extracted-data" *ngIf="doc.datosExtraidos && hasExtractedData(doc.datosExtraidos)">
                      <span class="data-label">Datos extraídos:</span>
                      <div class="data-items">
                        <span *ngFor="let item of getExtractedDataItems(doc.datosExtraidos)" class="data-item">
                          {{ item.key }}: {{ item.value }}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="upload-actions">
                    <button class="action-btn view" (click)="viewDocument(doc)" title="Ver documento">
                      👁️
                    </button>
                    <button class="action-btn download" (click)="downloadDocument(doc)" title="Descargar">
                      📥
                    </button>
                    <button *ngIf="doc.estado === 'rechazado'" class="action-btn retry" (click)="retryDocument(doc)" title="Reintentar">
                      🔄
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Empty state -->
            <div *ngIf="uploadQueue().length === 0" class="empty-state">
              <div class="empty-icon">📂</div>
              <div class="empty-title">No hay documentos en cola</div>
              <div class="empty-subtitle">Sube documentos para comenzar el procesamiento automático</div>
              <button class="btn btn-primary" (click)="showUploadModal.set(true)">
                <span class="btn-icon">📁</span>
                Subir Primer Documento
              </button>
            </div>

          </div>
        </div>

        <!-- Pending Documents View -->
        <div *ngIf="activeView() === 'pending'" class="pending-view">
          <div class="pending-header">
            <h3>Documentos Pendientes de Revisión</h3>
            <div class="pending-filters">
              <select [(ngModel)]="selectedPriority" (change)="filterPendingDocs()">
                <option value="">Todas las prioridades</option>
                <option value="alta">Alta prioridad</option>
                <option value="media">Media prioridad</option>
                <option value="baja">Baja prioridad</option>
              </select>
            </div>
          </div>

          <div class="pending-list" *ngIf="dashboard()?.documentosPendientes">
            <div 
              *ngFor="let doc of filteredPendingDocs()"
              class="pending-item"
              [class]="doc.prioridad">
              
              <div class="pending-info">
                <div class="client-info">
                  <strong>{{ doc.clienteNombre }}</strong>
                  <span class="expediente-id">Exp: {{ doc.expedienteId }}</span>
                </div>
                <div class="document-info">
                  <span class="document-type">{{ doc.documentoTipo }}</span>
                  <span class="document-state">{{ doc.estado }}</span>
                </div>
                <div class="timeline-info">
                  <span class="deadline">⏰ {{ formatDeadline(doc.fechaLimite) }}</span>
                  <span class="assigned">👤 {{ doc.asesorAsignado }}</span>
                </div>
              </div>

              <div class="pending-actions">
                <div class="priority-indicator" [class]="doc.prioridad">
                  {{ getPriorityLabel(doc.prioridad) }}
                </div>
                <button class="action-btn review" (click)="reviewDocument(doc.expedienteId)">
                  📋 Revisar
                </button>
                <button class="action-btn approve" (click)="approveDocument(doc.expedienteId)">
                  ✅ Aprobar
                </button>
                <button class="action-btn reject" (click)="rejectDocument(doc.expedienteId)">
                  ❌ Rechazar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Expedientes View -->
        <div *ngIf="activeView() === 'expedientes'" class="expedientes-view">
          <div class="expedientes-grid">
            <div *ngFor="let exp of expedientes()" class="expediente-card">
              
              <div class="expediente-header">
                <div class="client-info">
                  <h4>{{ exp.expediente.clienteNombre }}</h4>
                  <span class="expediente-id">{{ exp.expediente.id }}</span>
                </div>
                <div class="expediente-status">
                  <span class="status-badge" [class]="exp.expediente.estado">
                    {{ getExpedienteStatusText(exp.expediente.estado) }}
                  </span>
                </div>
              </div>

              <div class="expediente-progress">
                <div class="progress-info">
                  <span>Completitud: {{ getExpedienteCompleteness(exp).percentage }}%</span>
                  <span>{{ getExpedienteCompleteness(exp).completed }}/{{ getExpedienteCompleteness(exp).total }}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="getExpedienteCompleteness(exp).percentage"></div>
                </div>
              </div>

              <div class="expediente-documents">
                <div class="document-categories">
                  <div *ngFor="let category of documentCategories | keyvalue" class="category">
                    <span class="category-name">{{ getCategoryName(category.key) }}</span>
                    <div class="category-docs">
                      <span 
                        *ngFor="let docType of category.value"
                        class="doc-status"
                        [class]="getDocumentStatusInExpediente(exp, docType.tipo)">
                        {{ docType.nombre.substring(0, 3) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="expediente-actions">
                <button class="btn btn-sm btn-secondary" (click)="openExpediente(exp.expediente.id)">
                  📂 Ver Expediente
                </button>
                <button class="btn btn-sm btn-primary" (click)="generateReport(exp.expediente.id)">
                  📊 Generar Reporte
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Upload Modal -->
      <div *ngIf="showUploadModal()" class="modal-overlay" (click)="closeModals()">
        <div class="modal-content upload-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>📁 Subir Documentos</h3>
            <button class="close-btn" (click)="closeModals()">✕</button>
          </div>

          <div class="upload-form">
            <div class="expediente-selector">
              <label>Expediente de destino:</label>
              <select [(ngModel)]="selectedExpedienteId" class="expediente-select">
                <option value="">Seleccionar expediente</option>
                <option *ngFor="let exp of expedientes()" [value]="exp.expediente.id">
                  {{ exp.expediente.clienteNombre }} - {{ exp.expediente.id }}
                </option>
              </select>
            </div>

            <div class="file-drop-zone" 
                 [class.drag-over]="isDragOver"
                 (dragover)="onDragOver($event)"
                 (dragleave)="onDragLeave($event)"
                 (drop)="onFilesDrop($event)"
                 (click)="fileInput.click()">
              
              <input #fileInput 
                     type="file" 
                     multiple 
                     accept=".pdf,.jpg,.jpeg,.png"
                     (change)="onFilesSelected($event)"
                     style="display: none">
              
              <div class="drop-content">
                <div class="drop-icon">📁</div>
                <div class="drop-text">
                  <strong>Arrastra archivos aquí</strong> o haz clic para seleccionar
                </div>
                <div class="drop-subtitle">
                  Formatos soportados: PDF, JPG, PNG (máx. 10MB cada uno)
                </div>
              </div>
            </div>

            <div class="selected-files" *ngIf="selectedFiles.length > 0">
              <h4>Archivos seleccionados:</h4>
              <div class="file-list">
                <div *ngFor="let file of selectedFiles; let i = index" class="file-item">
                  <div class="file-info">
                    <span class="file-name">{{ file.name }}</span>
                    <span class="file-size">{{ formatFileSize(file.size) }}</span>
                  </div>
                  <div class="file-type-selector">
                    <select [(ngModel)]="fileTypes[i]">
                      <option value="">Tipo de documento</option>
                      <option value="INE">INE Vigente</option>
                      <option value="comprobante_domicilio">Comprobante de Domicilio</option>
                      <option value="situacion_fiscal">Constancia Fiscal</option>
                      <option value="concesion">Concesión</option>
                      <option value="tarjeta_circulacion">Tarjeta de Circulación</option>
                      <option value="factura_unidad">Factura de Unidad</option>
                      <option value="carta_antiguedad">Carta de Antigüedad</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>
                  <button class="remove-file" (click)="removeFile(i)">❌</button>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeModals()">
              Cancelar
            </button>
            <button 
              class="btn btn-primary" 
              [disabled]="!canUpload()"
              (click)="uploadSelectedFiles()">
              <span *ngIf="uploading()" class="spinner"></span>
              {{ uploading() ? 'Subiendo...' : 'Subir Documentos' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Batch Upload Modal -->
      <div *ngIf="showBatchModal()" class="modal-overlay" (click)="closeModals()">
        <div class="modal-content batch-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>📦 Subida Masiva de Documentos</h3>
            <button class="close-btn" (click)="closeModals()">✕</button>
          </div>

          <div class="batch-content">
            <div class="batch-info">
              <h4>Sube múltiples documentos de una vez</h4>
              <p>El sistema procesará automáticamente todos los archivos y los clasificará usando IA.</p>
            </div>

            <div class="expediente-selector">
              <label>Expediente de destino:</label>
              <select [(ngModel)]="selectedExpedienteId" class="expediente-select">
                <option value="">Seleccionar expediente</option>
                <option *ngFor="let exp of expedientes()" [value]="exp.expediente.id">
                  {{ exp.expediente.clienteNombre }} - {{ exp.expediente.id }}
                </option>
              </select>
            </div>

            <div class="batch-drop-zone" 
                 (click)="batchFileInput.click()">
              
              <input #batchFileInput 
                     type="file" 
                     multiple 
                     accept=".pdf,.jpg,.jpeg,.png"
                     (change)="onBatchFilesSelected($event)"
                     style="display: none">
              
              <div class="drop-content">
                <div class="drop-icon">📦</div>
                <div class="drop-text">
                  <strong>Seleccionar archivos para procesamiento masivo</strong>
                </div>
              </div>
            </div>

            <div class="batch-files" *ngIf="batchFiles.length > 0">
              <h4>{{ batchFiles.length }} archivos seleccionados</h4>
              <div class="batch-summary">
                <span class="file-count">Total: {{ batchFiles.length }} archivos</span>
                <span class="size-total">Tamaño: {{ getTotalBatchSize() }}</span>
                <span class="estimated-time">Tiempo estimado: ~{{ getBatchEstimatedTime() }} min</span>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeModals()">
              Cancelar
            </button>
            <button 
              class="btn btn-primary" 
              [disabled]="!canBatchUpload()"
              (click)="processBatchUpload()">
              <span *ngIf="batchProcessing()" class="spinner"></span>
              {{ batchProcessing() ? 'Procesando...' : 'Procesar Lote' }}
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styleUrls: ['./document-center.component.scss']
})
export class DocumentCenterComponent implements OnInit {
  private documentService = inject(DocumentManagementService);
  
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('batchFileInput') batchFileInput!: ElementRef;

  // State signals
  activeView = signal<'uploads' | 'pending' | 'expedientes'>('uploads');
  showUploadModal = signal(false);
  showBatchModal = signal(false);
  showSearchModal = signal(false);
  
  // Upload state
  selectedExpedienteId = '';
  selectedFiles: File[] = [];
  fileTypes: string[] = [];
  batchFiles: File[] = [];
  isDragOver = false;
  uploading = signal(false);
  batchProcessing = signal(false);
  selectedPriority = '';

  // Data from service
  uploadQueue = computed(() => this.documentService.uploadQueue());
  activeUploads = computed(() => this.documentService.activeUploads());
  completedUploads = computed(() => this.documentService.completedUploads());
  dashboard = computed(() => this.documentService.documentsDashboard());
  expedientes = computed(() => this.documentService.allExpedientes());

  // Document categories
  documentCategories = this.documentService.documentCategories;

  // Filtered data
  filteredPendingDocs = computed(() => {
    const pending = this.dashboard()?.documentosPendientes || [];
    if (!this.selectedPriority) return pending;
    return pending.filter(doc => doc.prioridad === this.selectedPriority);
  });

  // View configuration
  views = [
    { id: 'uploads', label: 'Cola de Subida', icon: '📤' },
    { id: 'pending', label: 'Pendientes', icon: '⏳' },
    { id: 'expedientes', label: 'Expedientes', icon: '📂' }
  ];

  ngOnInit() {
    this.refreshData();
  }

  // ===== VIEW MANAGEMENT =====
  setActiveView(view: 'uploads' | 'pending' | 'expedientes') {
    this.activeView.set(view);
  }

  refreshData() {
    this.documentService.refreshDocumentsDashboard();
  }

  // ===== FILE UPLOAD HANDLING =====
  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onFilesDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = Array.from(event.dataTransfer?.files || []);
    this.handleSelectedFiles(files);
  }

  onFilesSelected(event: any) {
    const files = Array.from(event.target.files || []);
    this.handleSelectedFiles(files);
  }

  private handleSelectedFiles(files: File[]) {
    const validFiles = files.filter(file => this.isValidFile(file));
    this.selectedFiles = [...this.selectedFiles, ...validFiles];
    this.fileTypes = [...this.fileTypes, ...new Array(validFiles.length).fill('')];
  }

  onBatchFilesSelected(event: any) {
    const files = Array.from(event.target.files || []);
    this.batchFiles = files.filter(file => this.isValidFile(file));
  }

  private isValidFile(file: File): boolean {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    
    return file.size <= maxSize && allowedTypes.includes(file.type);
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.fileTypes.splice(index, 1);
  }

  canUpload(): boolean {
    return this.selectedFiles.length > 0 && 
           this.selectedExpedienteId.length > 0 && 
           this.fileTypes.every(type => type.length > 0) &&
           !this.uploading();
  }

  canBatchUpload(): boolean {
    return this.batchFiles.length > 0 && 
           this.selectedExpedienteId.length > 0 && 
           !this.batchProcessing();
  }

  uploadSelectedFiles() {
    if (!this.canUpload()) return;
    
    this.uploading.set(true);
    
    const uploads = this.selectedFiles.map((file, index) => 
      this.documentService.uploadDocumentWithOCR(
        this.selectedExpedienteId,
        file,
        this.fileTypes[index] as any,
        this.getCategoryFromType(this.fileTypes[index])
      )
    );

    // Process uploads sequentially
    uploads.forEach(upload$ => {
      upload$.subscribe({
        next: (result) => {
          console.log('Document uploaded:', result);
        },
        error: (error) => {
          console.error('Upload error:', error);
        }
      });
    });

    // Reset form after short delay
    setTimeout(() => {
      this.uploading.set(false);
      this.closeModals();
      this.resetUploadForm();
    }, 1000);
  }

  processBatchUpload() {
    if (!this.canBatchUpload()) return;
    
    this.batchProcessing.set(true);
    
    this.documentService.uploadBatchDocuments(this.selectedExpedienteId, this.batchFiles).subscribe({
      next: (result: BatchUploadResult) => {
        console.log('Batch upload result:', result);
        this.batchProcessing.set(false);
        this.closeModals();
        this.resetBatchForm();
      },
      error: (error) => {
        console.error('Batch upload error:', error);
        this.batchProcessing.set(false);
      }
    });
  }

  private resetUploadForm() {
    this.selectedFiles = [];
    this.fileTypes = [];
    this.selectedExpedienteId = '';
  }

  private resetBatchForm() {
    this.batchFiles = [];
    this.selectedExpedienteId = '';
  }

  // ===== DOCUMENT ACTIONS =====
  cancelUpload(documentId: string) {
    // Implementation would cancel the upload
    console.log('Cancelling upload:', documentId);
  }

  viewDocument(document: DocumentUpload) {
    // Implementation would open document viewer
    console.log('Viewing document:', document);
  }

  downloadDocument(document: DocumentUpload) {
    // Implementation would download document
    console.log('Downloading document:', document);
  }

  retryDocument(document: DocumentUpload) {
    // Implementation would retry failed upload
    console.log('Retrying document:', document);
  }

  reviewDocument(expedienteId: string) {
    console.log('Reviewing document for expediente:', expedienteId);
  }

  approveDocument(expedienteId: string) {
    console.log('Approving document for expediente:', expedienteId);
  }

  rejectDocument(expedienteId: string) {
    console.log('Rejecting document for expediente:', expedienteId);
  }

  openExpediente(expedienteId: string) {
    console.log('Opening expediente:', expedienteId);
  }

  generateReport(expedienteId: string) {
    this.documentService.generateExpedienteReport(expedienteId, 'completo').subscribe({
      next: (report) => {
        window.open(report.url, '_blank');
      },
      error: (error) => {
        console.error('Error generating report:', error);
      }
    });
  }

  // ===== UTILITY METHODS =====
  closeModals() {
    this.showUploadModal.set(false);
    this.showBatchModal.set(false);
    this.showSearchModal.set(false);
  }

  hasAlerts(): boolean {
    const alerts = this.dashboard()?.alertas;
    return !!(alerts && (alerts.expedientesVencidos > 0 || alerts.documentosRechazados > 0 || alerts.validacionesAtrasadas > 0));
  }

  filterPendingDocs() {
    // Computed property handles this automatically
  }

  getFileIcon(tipo: string): string {
    const icons: { [key: string]: string } = {
      'INE': '🆔',
      'comprobante_domicilio': '🏠',
      'situacion_fiscal': '📋',
      'concesion': '📜',
      'tarjeta_circulacion': '🚗',
      'factura_unidad': '📄',
      'carta_antiguedad': '📝',
      'acta_constitutiva': '⚖️',
      'poder_representante': '👤',
      'otros': '📄'
    };
    return icons[tipo] || '📄';
  }

  getDocumentTypeName(tipo: string): string {
    const names: { [key: string]: string } = {
      'INE': 'INE',
      'comprobante_domicilio': 'Comprobante Domicilio',
      'situacion_fiscal': 'Situación Fiscal',
      'concesion': 'Concesión',
      'tarjeta_circulacion': 'Tarjeta Circulación',
      'factura_unidad': 'Factura Unidad',
      'carta_antiguedad': 'Carta Antigüedad',
      'acta_constitutiva': 'Acta Constitutiva',
      'poder_representante': 'Poder Representante',
      'otros': 'Otros'
    };
    return names[tipo] || tipo;
  }

  getProgressText(estado: DocumentUpload['estado']): string {
    const texts = {
      'pendiente': 'En cola',
      'subiendo': 'Subiendo',
      'procesando': 'Procesando OCR',
      'validado': 'Validado',
      'rechazado': 'Rechazado'
    };
    return texts[estado] || estado;
  }

  getStatusText(estado: DocumentUpload['estado']): string {
    const texts = {
      'pendiente': 'Pendiente',
      'subiendo': 'Subiendo',
      'procesando': 'Procesando',
      'validado': 'Aprobado',
      'rechazado': 'Rechazado'
    };
    return texts[estado] || estado;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDeadline(deadline: string): string {
    const date = new Date(deadline);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Vencido';
    if (hours < 24) return `${hours}h restantes`;
    const days = Math.floor(hours / 24);
    return `${days}d restantes`;
  }

  getPriorityLabel(priority: string): string {
    const labels = {
      'alta': '🔴 Alta',
      'media': '🟡 Media',
      'baja': '🟢 Baja'
    };
    return labels[priority as keyof typeof labels] || priority;
  }

  getExpedienteStatusText(estado: string): string {
    const texts = {
      'nuevo': 'Nuevo',
      'proceso': 'En Proceso',
      'aprobado': 'Aprobado',
      'pagado': 'Pagado',
      'firmado': 'Firmado',
      'completado': 'Completado'
    };
    return texts[estado as keyof typeof texts] || estado;
  }

  getCategoryName(key: string): string {
    const names = {
      'identidad': 'ID',
      'domicilio': 'DOM',
      'fiscal': 'FISC',
      'vehicular': 'VEH',
      'legal': 'LEG',
      'financiero': 'FIN'
    };
    return names[key as keyof typeof names] || key;
  }

  getExpedienteCompleteness(expediente: ExpedienteCompleto) {
    return this.documentService.calculateExpedienteCompleteness(expediente);
  }

  getDocumentStatusInExpediente(expediente: ExpedienteCompleto, tipo: string): string {
    const doc = expediente.documentos.find(d => d.tipo === tipo);
    if (!doc) return 'missing';
    return doc.estado;
  }

  hasExtractedData(data: any): boolean {
    return data && Object.keys(data).length > 0;
  }

  getExtractedDataItems(data: any): { key: string; value: string }[] {
    return Object.entries(data || {})
      .slice(0, 3) // Show only first 3 items
      .map(([key, value]) => ({ key, value: String(value) }));
  }

  private getCategoryFromType(tipo: string): DocumentUpload['categoria'] {
    const typeMap: { [key: string]: DocumentUpload['categoria'] } = {
      'INE': 'identidad',
      'comprobante_domicilio': 'domicilio',
      'situacion_fiscal': 'fiscal',
      'concesion': 'vehicular',
      'tarjeta_circulacion': 'vehicular',
      'factura_unidad': 'vehicular',
      'carta_antiguedad': 'legal',
      'acta_constitutiva': 'legal',
      'poder_representante': 'legal',
      'otros': 'legal'
    };
    return typeMap[tipo] || 'legal';
  }

  getTotalBatchSize(): string {
    const totalBytes = this.batchFiles.reduce((sum, file) => sum + file.size, 0);
    return this.formatFileSize(totalBytes);
  }

  getBatchEstimatedTime(): number {
    // Estimate 30 seconds per file for processing
    return Math.ceil(this.batchFiles.length * 0.5);
  }
}