import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, BehaviorSubject, of, from, timer, interval } from 'rxjs';
import { map, tap, catchError, switchMap, filter, debounceTime } from 'rxjs/operators';
import { OdooApiService } from './odoo-api.service';

// Document Management Types
export interface DocumentUpload {
  id: string;
  expedienteId: string;
  nombre: string;
  tipo: 'INE' | 'comprobante_domicilio' | 'situacion_fiscal' | 'concesion' | 'tarjeta_circulacion' | 
        'factura_unidad' | 'carta_antiguedad' | 'acta_constitutiva' | 'poder_representante' | 'otros';
  archivo: File | string; // File object or base64
  categoria: 'identidad' | 'domicilio' | 'fiscal' | 'vehicular' | 'legal' | 'financiero';
  estado: 'pendiente' | 'subiendo' | 'procesando' | 'validado' | 'rechazado';
  progreso: number; // 0-100
  datosExtraidos?: { [key: string]: string };
  confianzaOCR?: number;
  observaciones?: string[];
  fechaSubida?: Date;
  tamano?: number;
}

export interface ExpedienteCompleto {
  expediente: {
    id: string;
    clienteId: string;
    clienteNombre: string;
    mercado: 'aguascalientes' | 'edomex';
    tipoCliente: 'individual' | 'colectivo';
    estado: 'nuevo' | 'proceso' | 'aprobado' | 'pagado' | 'firmado' | 'completado';
    fechaCreacion: string;
    fechaActualizacion: string;
  };
  documentos: DocumentUpload[];
  flujoAprobacion: {
    etapa: 'documentos' | 'validacion' | 'revision' | 'aprobacion' | 'completado';
    progreso: number;
    proximoPaso: string;
    responsable?: string;
    fechaLimite?: string;
  };
  historialCambios: {
    fecha: string;
    accion: string;
    usuario: string;
    detalles?: string;
  }[];
}

export interface DocumentValidation {
  documentoId: string;
  estadoValidacion: 'aprobado' | 'rechazado' | 'requiere_revision_manual';
  puntuacion: number;
  observaciones: {
    tipo: 'error' | 'advertencia' | 'info';
    mensaje: string;
    campo?: string;
  }[];
  requiereAccion?: {
    tipo: 'resubir' | 'completar_info' | 'revision_asesor';
    descripcion: string;
  };
}

export interface DocumentDashboard {
  documentosPendientes: {
    expedienteId: string;
    clienteNombre: string;
    documentoTipo: string;
    estado: string;
    fechaLimite: string;
    prioridad: 'alta' | 'media' | 'baja';
    asesorAsignado: string;
  }[];
  metricas: {
    totalPendientes: number;
    promedioValidacion: number;
    tasaAprobacion: number;
    documentosHoy: number;
  };
  alertas: {
    expedientesVencidos: number;
    documentosRechazados: number;
    validacionesAtrasadas: number;
  };
}

export interface BatchUploadResult {
  loteId: string;
  documentosProcesados: number;
  documentosValidados: number;
  documentosRechazados: number;
  tiempoEstimado: number;
  resultados: {
    documentoId: string;
    nombre: string;
    estado: 'procesando' | 'validado' | 'rechazado';
    observaciones?: string[];
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class DocumentManagementService {
  private odooApi = inject(OdooApiService);
  
  // State signals
  private expedientes = signal<ExpedienteCompleto[]>([]);
  private uploadQueue = signal<DocumentUpload[]>([]);
  private pendingDocuments = signal<DocumentDashboard | null>(null);
  private searchResults = signal<any[]>([]);
  
  // Upload state
  private uploading = signal(false);
  private uploadProgress = signal(0);
  
  // Computed signals
  allExpedientes = computed(() => this.expedientes());
  pendingUploads = computed(() => this.uploadQueue().filter(d => d.estado === 'pendiente'));
  activeUploads = computed(() => this.uploadQueue().filter(d => d.estado === 'subiendo' || d.estado === 'procesando'));
  completedUploads = computed(() => this.uploadQueue().filter(d => d.estado === 'validado' || d.estado === 'rechazado'));
  
  documentsDashboard = computed(() => this.pendingDocuments());
  
  // Document categories for UI
  documentCategories = {
    identidad: [
      { tipo: 'INE', nombre: 'INE Vigente', requerido: true },
      { tipo: 'CURP', nombre: 'CURP', requerido: false }
    ],
    domicilio: [
      { tipo: 'comprobante_domicilio', nombre: 'Comprobante de Domicilio', requerido: true }
    ],
    fiscal: [
      { tipo: 'situacion_fiscal', nombre: 'Constancia de Situación Fiscal', requerido: true },
      { tipo: 'RFC', nombre: 'RFC', requerido: false }
    ],
    vehicular: [
      { tipo: 'concesion', nombre: 'Copia de la Concesión', requerido: true },
      { tipo: 'tarjeta_circulacion', nombre: 'Tarjeta de Circulación', requerido: true },
      { tipo: 'factura_unidad', nombre: 'Factura de la Unidad Actual', requerido: true }
    ],
    legal: [
      { tipo: 'carta_antiguedad', nombre: 'Carta de Antigüedad de la Ruta', requerido: true },
      { tipo: 'acta_constitutiva', nombre: 'Acta Constitutiva', requerido: false },
      { tipo: 'poder_representante', nombre: 'Poder del Representante Legal', requerido: false }
    ],
    financiero: [
      { tipo: 'estados_cuenta', nombre: 'Estados de Cuenta', requerido: false },
      { tipo: 'comprobantes_ingresos', nombre: 'Comprobantes de Ingresos', requerido: false }
    ]
  };

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    // Update dashboard every 30 seconds
    interval(30000).subscribe(() => {
      this.refreshDocumentsDashboard();
    });

    // Process upload queue
    this.processUploadQueue();
    
    // Load initial data
    this.refreshDocumentsDashboard();
  }

  // ===== DOCUMENT UPLOAD & PROCESSING =====
  uploadDocumentWithOCR(
    expedienteId: string, 
    file: File, 
    tipo: DocumentUpload['tipo'],
    categoria: DocumentUpload['categoria']
  ): Observable<DocumentUpload> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        
        const document: DocumentUpload = {
          id: `doc_${Date.now()}`,
          expedienteId,
          nombre: file.name,
          tipo,
          archivo: file,
          categoria,
          estado: 'subiendo',
          progreso: 0,
          fechaSubida: new Date(),
          tamano: file.size
        };

        // Add to upload queue
        this.addToUploadQueue(document);

        // Simulate upload progress
        this.simulateUploadProgress(document.id).subscribe({
          next: (progress) => {
            this.updateDocumentProgress(document.id, progress);
            if (progress === 100) {
              this.processDocumentOCR(document.id, expedienteId, base64, tipo, categoria);
            }
          }
        });

        observer.next(document);
        observer.complete();
      };

      reader.onerror = (error) => {
        observer.error(error);
      };

      reader.readAsDataURL(file);
    });
  }

  private processDocumentOCR(
    documentId: string,
    expedienteId: string,
    base64: string,
    tipo: DocumentUpload['tipo'],
    categoria: DocumentUpload['categoria']
  ) {
    this.updateDocumentState(documentId, 'procesando');

    this.odooApi.subirDocumentoConOCR(expedienteId, {
      nombre: this.getDocumentFromQueue(documentId)?.nombre || '',
      tipo,
      archivo: base64,
      categoria,
      procesarOCR: true
    }).subscribe({
      next: (result) => {
        this.updateDocumentWithOCRResult(documentId, result);
        
        // Auto-validate if OCR confidence is high
        if (result.confianzaOCR && result.confianzaOCR > 85) {
          this.autoValidateDocument(result.documentoId);
        }
      },
      error: (error) => {
        console.error('Error processing document OCR:', error);
        this.updateDocumentState(documentId, 'rechazado');
        this.addDocumentObservation(documentId, 'Error al procesar OCR: ' + error.message);
      }
    });
  }

  private autoValidateDocument(documentoId: string) {
    this.odooApi.validarDocumentoAutomatico(documentoId, {
      validarTexto: true,
      validarFirmas: true,
      validarFechas: true,
      validarIdentidad: true,
      nivelValidacion: 'intermedio'
    }).subscribe({
      next: (validation) => {
        const queueDoc = this.uploadQueue().find(d => 
          d.id === documentoId || d.datosExtraidos?.['documentoId'] === documentoId
        );
        
        if (queueDoc) {
          this.updateDocumentValidation(queueDoc.id, validation);
        }
      },
      error: (error) => {
        console.error('Error auto-validating document:', error);
      }
    });
  }

  // ===== BATCH UPLOAD =====
  uploadBatchDocuments(expedienteId: string, files: File[]): Observable<BatchUploadResult> {
    const documentos = files.map(file => ({
      nombre: file.name,
      tipo: this.inferDocumentType(file.name),
      archivo: '' // Will be filled with base64
    }));

    // Convert files to base64
    const base64Promises = files.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    return from(Promise.all(base64Promises)).pipe(
      switchMap(base64Array => {
        // Update documentos with base64
        documentos.forEach((doc, index) => {
          doc.archivo = base64Array[index];
        });

        return this.odooApi.procesarLoteDocumentos(expedienteId, documentos);
      }),
      tap(result => {
        // Add batch results to queue for tracking
        result.resultados.forEach(doc => {
          const uploadDoc: DocumentUpload = {
            id: doc.documentoId,
            expedienteId,
            nombre: doc.nombre,
            tipo: 'otros', // Will be inferred
            archivo: '',
            categoria: 'legal',
            estado: doc.estado === 'validado' ? 'validado' : 
                   doc.estado === 'rechazado' ? 'rechazado' : 'procesando',
            progreso: 100,
            observaciones: doc.observaciones,
            fechaSubida: new Date()
          };
          
          this.addToUploadQueue(uploadDoc);
        });
      })
    );
  }

  private inferDocumentType(filename: string): string {
    const name = filename.toLowerCase();
    if (name.includes('ine')) return 'INE';
    if (name.includes('comprobante') || name.includes('domicilio')) return 'comprobante_domicilio';
    if (name.includes('fiscal') || name.includes('rfc')) return 'situacion_fiscal';
    if (name.includes('concesion')) return 'concesion';
    if (name.includes('circulacion')) return 'tarjeta_circulacion';
    if (name.includes('factura')) return 'factura_unidad';
    return 'otros';
  }

  // ===== EXPEDIENTE MANAGEMENT =====
  getExpedienteCompleto(expedienteId: string): Observable<ExpedienteCompleto> {
    return this.odooApi.getExpedienteCompleto(expedienteId).pipe(
      map(result => ({
        expediente: {
          id: result.expediente.id,
          clienteId: result.expediente.clienteId,
          clienteNombre: result.expediente.clienteNombre,
          mercado: result.expediente.mercado,
          tipoCliente: result.expediente.tipoCliente,
          estado: result.expediente.estado,
          fechaCreacion: result.expediente.fechaCreacion,
          fechaActualizacion: result.expediente.fechaActualizacion
        },
        documentos: result.documentos.map(doc => ({
          id: doc.id,
          expedienteId: expedienteId,
          nombre: doc.nombre,
          tipo: doc.tipo as DocumentUpload['tipo'],
          archivo: doc.url || '',
          categoria: this.getCategoryFromType(doc.tipo),
          estado: this.mapDocumentState(doc.estado),
          progreso: doc.estado === 'aprobado' ? 100 : doc.estado === 'rechazado' ? 0 : 50,
          puntuacionValidacion: doc.puntuacionValidacion,
          observaciones: doc.observaciones,
          fechaSubida: doc.fechaSubida ? new Date(doc.fechaSubida) : undefined,
          tamano: doc.tamano
        })),
        flujoAprobacion: result.flujoAprobacion,
        historialCambios: result.historialCambios
      })),
      tap(expediente => {
        // Update local cache
        this.updateExpedienteCache(expediente);
      })
    );
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
      'poder_representante': 'legal'
    };
    return typeMap[tipo] || 'legal';
  }

  private mapDocumentState(estado: string): DocumentUpload['estado'] {
    const stateMap: { [key: string]: DocumentUpload['estado'] } = {
      'pendiente': 'pendiente',
      'subido': 'procesando',
      'validando': 'procesando',
      'aprobado': 'validado',
      'rechazado': 'rechazado'
    };
    return stateMap[estado] || 'pendiente';
  }

  // ===== DOCUMENT SEARCH =====
  searchDocuments(query: {
    texto?: string;
    tipoDocumento?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    estado?: string;
    clienteNombre?: string;
    asesor?: string;
  }): Observable<any[]> {
    return this.odooApi.buscarDocumentos(query).pipe(
      map(result => result.resultados),
      tap(results => this.searchResults.set(results))
    );
  }

  // ===== DASHBOARD & METRICS =====
  refreshDocumentsDashboard(filtros?: {
    asesor?: string;
    mercado?: string;
    tipoDocumento?: string;
    prioridad?: 'alta' | 'media' | 'baja';
  }): void {
    this.odooApi.getDocumentosPendientesGlobal(filtros).subscribe({
      next: (dashboard) => {
        this.pendingDocuments.set(dashboard);
      },
      error: (error) => {
        console.error('Error loading documents dashboard:', error);
      }
    });
  }

  // ===== REPORT GENERATION =====
  generateExpedienteReport(expedienteId: string, tipo: 'resumen' | 'completo' | 'legal'): Observable<{
    reporteId: string;
    url: string;
    tipoReporte: string;
    fechaGeneracion: string;
    validoHasta: string;
  }> {
    return this.odooApi.generarReporteExpediente(expedienteId, tipo);
  }

  // ===== PRIVATE HELPER METHODS =====
  private addToUploadQueue(document: DocumentUpload): void {
    const current = this.uploadQueue();
    this.uploadQueue.set([...current, document]);
  }

  private updateDocumentProgress(documentId: string, progress: number): void {
    const current = this.uploadQueue();
    const updated = current.map(doc => 
      doc.id === documentId ? { ...doc, progreso: progress } : doc
    );
    this.uploadQueue.set(updated);
  }

  private updateDocumentState(documentId: string, estado: DocumentUpload['estado']): void {
    const current = this.uploadQueue();
    const updated = current.map(doc => 
      doc.id === documentId ? { ...doc, estado } : doc
    );
    this.uploadQueue.set(updated);
  }

  private updateDocumentWithOCRResult(documentId: string, result: any): void {
    const current = this.uploadQueue();
    const updated = current.map(doc => 
      doc.id === documentId ? {
        ...doc,
        estado: result.estado === 'validado' ? 'validado' : 'procesando',
        datosExtraidos: result.datosExtraidos,
        confianzaOCR: result.confianzaOCR,
        progreso: 100
      } : doc
    );
    this.uploadQueue.set(updated);
  }

  private updateDocumentValidation(documentId: string, validation: DocumentValidation): void {
    const current = this.uploadQueue();
    const updated = current.map(doc => 
      doc.id === documentId ? {
        ...doc,
        estado: validation.estadoValidacion === 'aprobado' ? 'validado' : 'rechazado',
        observaciones: validation.observaciones.map(obs => obs.mensaje)
      } : doc
    );
    this.uploadQueue.set(updated);
  }

  private addDocumentObservation(documentId: string, observation: string): void {
    const current = this.uploadQueue();
    const updated = current.map(doc => 
      doc.id === documentId ? {
        ...doc,
        observaciones: [...(doc.observaciones || []), observation]
      } : doc
    );
    this.uploadQueue.set(updated);
  }

  private getDocumentFromQueue(documentId: string): DocumentUpload | undefined {
    return this.uploadQueue().find(doc => doc.id === documentId);
  }

  private simulateUploadProgress(documentId: string): Observable<number> {
    return new Observable<number>(observer => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;
        
        observer.next(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          observer.complete();
        }
      }, 200);
    });
  }

  private processUploadQueue(): void {
    // Process pending uploads automatically
    interval(1000).pipe(
      filter(() => this.pendingUploads().length > 0 && !this.uploading())
    ).subscribe(() => {
      const nextUpload = this.pendingUploads()[0];
      if (nextUpload) {
        // Process next upload
        console.log('Processing next upload:', nextUpload.nombre);
      }
    });
  }

  private updateExpedienteCache(expediente: ExpedienteCompleto): void {
    const current = this.expedientes();
    const existingIndex = current.findIndex(e => e.expediente.id === expediente.expediente.id);
    
    if (existingIndex >= 0) {
      current[existingIndex] = expediente;
    } else {
      current.push(expediente);
    }
    
    this.expedientes.set([...current]);
  }

  // ===== PUBLIC UTILITY METHODS =====
  getDocumentsByCategory(categoria: DocumentUpload['categoria']): DocumentUpload[] {
    return this.uploadQueue().filter(doc => doc.categoria === categoria);
  }

  getRequiredDocumentsByType(tipoCliente: 'individual' | 'colectivo'): any[] {
    if (tipoCliente === 'colectivo') {
      return [
        ...this.documentCategories.identidad,
        ...this.documentCategories.legal,
        ...this.documentCategories.fiscal,
        ...this.documentCategories.vehicular
      ].filter(doc => doc.requerido);
    }
    
    return [
      ...this.documentCategories.identidad,
      ...this.documentCategories.domicilio,
      ...this.documentCategories.fiscal,
      ...this.documentCategories.vehicular
    ].filter(doc => doc.requerido);
  }

  calculateExpedienteCompleteness(expediente: ExpedienteCompleto): {
    percentage: number;
    completed: number;
    total: number;
    missing: string[];
  } {
    const required = this.getRequiredDocumentsByType(expediente.expediente.tipoCliente);
    const completed = expediente.documentos.filter(doc => doc.estado === 'validado');
    const missing = required
      .filter(req => !expediente.documentos.some(doc => doc.tipo === req.tipo))
      .map(req => req.nombre);
    
    return {
      percentage: Math.round((completed.length / required.length) * 100),
      completed: completed.length,
      total: required.length,
      missing
    };
  }
}