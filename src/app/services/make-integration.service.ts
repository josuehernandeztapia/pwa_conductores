import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Make.com Webhook Interfaces
export interface MakeWebhookResponse {
  success: boolean;
  data?: any;
  error?: string;
  scenario_id?: string;
  execution_id?: string;
}

export interface MakeScenarioTrigger {
  scenario: string;
  data: any;
  timestamp?: string;
  source?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MakeIntegrationService {
  private baseUrl = environment.make.baseUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'X-PWA-Version': environment.version,
      'X-Source': 'conductores-pwa',
      'Authorization': `Bearer ${environment.make.apiKey}`
    });
  }

  // ===== COTIZADOR → OPORTUNIDAD ODOO =====
  crearOportunidadEnOdoo(cotizacion: {
    clienteNombre: string;
    mercado: 'aguascalientes' | 'edomex';
    tipoCliente: 'individual' | 'colectivo';
    producto: 'venta-directa' | 'venta-plazo' | 'ahorro-programado';
    montoTotal: number;
    enganche: number;
    plazo: number;
    pagoMensual: number;
    configuracion: any;
  }): Observable<MakeWebhookResponse> {
    const payload: MakeScenarioTrigger = {
      scenario: 'pwa_to_odoo_opportunity',
      data: {
        ...cotizacion,
        asesorId: 'current_user', // Could be dynamic
        fechaCreacion: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      source: 'pwa_cotizador'
    };

    return this.http.post<MakeWebhookResponse>(
      `${this.baseUrl}/webhooks/cotizador-oportunidad`, 
      payload,
      { headers: this.getHeaders() }
    );
  }

  // ===== DOCUMENTOS → EXPEDIENTE ODOO =====
  subirDocumentoAOdoo(expedienteId: string, documento: {
    clientId: string;
    nombre: string;
    tipo: string;
    archivo: string; // base64
    fileName: string;
  }): Observable<MakeWebhookResponse> {
    const payload: MakeScenarioTrigger = {
      scenario: 'pwa_to_odoo_document',
      data: {
        expedienteId,
        clientId: documento.clientId,
        documento: {
          nombre: documento.nombre,
          tipo: documento.tipo,
          fileName: documento.fileName,
          fileData: documento.archivo,
          uploadDate: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString(),
      source: 'pwa_document_capture'
    };

    return this.http.post<MakeWebhookResponse>(
      `${this.baseUrl}/webhooks/documento-upload`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // ===== CONEKTA WEBHOOK → ODOO =====
  notificarPagoConfirmado(pagoData: {
    expedienteId: string;
    conektaOrderId: string;
    monto: number;
    metodoPago: string;
    estado: string;
    clienteId: string;
  }): Observable<MakeWebhookResponse> {
    const payload: MakeScenarioTrigger = {
      scenario: 'conekta_to_odoo_payment',
      data: {
        ...pagoData,
        fechaPago: new Date().toISOString(),
        moneda: 'MXN'
      },
      timestamp: new Date().toISOString(),
      source: 'pwa_conekta_webhook'
    };

    return this.http.post<MakeWebhookResponse>(
      `${this.baseUrl}/webhooks/pago-confirmado`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // ===== MIFIEL WEBHOOK → ODOO =====
  notificarFirmaCompletada(firmaData: {
    expedienteId: string;
    mifielDocumentId: string;
    contratoTipo: string;
    clienteEmail: string;
    firmanteNombre: string;
  }): Observable<MakeWebhookResponse> {
    const payload: MakeScenarioTrigger = {
      scenario: 'mifiel_to_odoo_signature',
      data: {
        ...firmaData,
        fechaFirma: new Date().toISOString(),
        estadoContrato: 'firmado'
      },
      timestamp: new Date().toISOString(),
      source: 'pwa_mifiel_webhook'
    };

    return this.http.post<MakeWebhookResponse>(
      `${this.baseUrl}/webhooks/firma-completada`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // ===== DASHBOARD DATA FROM ODOO =====
  obtenerDashboardDeOdoo(): Observable<{
    oportunidadesActivas: number;
    expedientesPendientes: number;
    pagosHoy: number;
    firmasHoy: number;
    pipeline: any;
  }> {
    // Make scenario que consulta Odoo cada 5min y cachea
    return this.http.get<any>(
      `${this.baseUrl}/webhooks/dashboard-data`,
      { headers: this.getHeaders() }
    );
  }

  // ===== TANDAS COLECTIVAS =====
  crearTandaEnOdoo(tandaData: {
    nombre: string;
    mercado: string;
    capacidad: number;
    metaEnganche: number;
    pagoMensual: number;
    miembrosIniciales: string[];
  }): Observable<MakeWebhookResponse> {
    const payload: MakeScenarioTrigger = {
      scenario: 'pwa_to_odoo_tanda',
      data: {
        ...tandaData,
        fechaCreacion: new Date().toISOString(),
        estado: 'activa',
        cicloActual: 1
      },
      timestamp: new Date().toISOString(),
      source: 'pwa_tandas'
    };

    return this.http.post<MakeWebhookResponse>(
      `${this.baseUrl}/webhooks/tanda-crear`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  avanzarCicloTandaEnOdoo(tandaId: string, cicloData: {
    unidadEntregada: boolean;
    nuevoCiclo: number;
    ahorroAcumulado: number;
    clienteId: string;
  }): Observable<MakeWebhookResponse> {
    const payload: MakeScenarioTrigger = {
      scenario: 'odoo_tanda_advance_cycle',
      data: {
        tandaId,
        ...cicloData,
        fechaAvance: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      source: 'pwa_tandas'
    };

    return this.http.post<MakeWebhookResponse>(
      `${this.baseUrl}/webhooks/tanda-ciclo`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // ===== KINBAN SCORING EVENTS =====
  sendScoringComplete(data: {
    clientId: string;
    score: number;
    level: 'excellent' | 'good' | 'fair' | 'poor' | 'rejected';
    status: 'approved' | 'conditional' | 'review' | 'rejected';
    riskLevel: 'low' | 'medium' | 'high' | 'very-high';
    timestamp: Date;
  }): Observable<MakeWebhookResponse> {
    const payload: MakeScenarioTrigger = {
      scenario: 'odoo_kinban_scoring',
      data: {
        ...data,
        timestamp: data.timestamp.toISOString()
      },
      timestamp: new Date().toISOString(),
      source: 'pwa_kinban'
    };

    return this.http.post<MakeWebhookResponse>(
      `${this.baseUrl}${environment.make.webhooks.scoringComplete || '/scoring-complete'}`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // ===== NOTIFICACIONES Y EVENTOS ESPECIALES =====
  notificarEventoEspecial(evento: {
    tipo: 'expediente_completo' | 'cliente_aprobado' | 'unidad_entregada' | 'scoring_completed';
    expedienteId: string;
    clienteId: string;
    data: any;
  }): Observable<MakeWebhookResponse> {
    const payload: MakeScenarioTrigger = {
      scenario: 'odoo_special_event',
      data: {
        ...evento,
        fechaEvento: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      source: 'pwa_eventos'
    };

    return this.http.post<MakeWebhookResponse>(
      `${this.baseUrl}/webhooks/evento-especial`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // ===== SYNC CLIENTES FROM ODOO =====
  sincronizarClientesDeOdoo(): Observable<any[]> {
    // Make scenario que obtiene clientes actualizados de Odoo
    return this.http.get<any[]>(
      `${this.baseUrl}/webhooks/sync-clientes`,
      { headers: this.getHeaders() }
    );
  }

  // ===== HEALTH CHECK =====
  verificarEscenariosMake(): Observable<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    scenarios: { [key: string]: boolean };
    lastExecution: { [key: string]: string };
  }> {
    return this.http.get<{
      status: 'healthy' | 'degraded' | 'unhealthy';
      scenarios: { [key: string]: boolean };
      lastExecution: { [key: string]: string };
    }>(`${this.baseUrl}/webhooks/health`, {
      headers: this.getHeaders()
    });
  }

  // ===== COTIZACIONES GUARDADAS =====
  guardarCotizacionEnOdoo(cotizacion: any): Observable<MakeWebhookResponse> {
    const payload: MakeScenarioTrigger = {
      scenario: 'save_quotation_odoo',
      data: cotizacion,
      timestamp: new Date().toISOString(),
      source: 'pwa_cotizador'
    };

    return this.http.post<MakeWebhookResponse>(
      `${this.baseUrl}/webhooks/guardar-cotizacion`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // ===== REPORTES Y ANALYTICS =====
  enviarAnalyticsAOdoo(analytics: {
    evento: string;
    asesorId: string;
    clienteId?: string;
    data: any;
  }): Observable<MakeWebhookResponse> {
    const payload: MakeScenarioTrigger = {
      scenario: 'pwa_analytics_to_odoo',
      data: {
        ...analytics,
        timestamp: new Date().toISOString(),
        sessionId: sessionStorage.getItem('pwa_session_id')
      },
      timestamp: new Date().toISOString(),
      source: 'pwa_analytics'
    };

    return this.http.post<MakeWebhookResponse>(
      `${this.baseUrl}/webhooks/analytics`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // ===== DOCUMENT MANAGEMENT =====
  sendDocumentUpload(data: {
    clientId: string;
    documentName: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    timestamp: Date;
    market: string;
    product: string;
  }): Observable<MakeWebhookResponse> {
    const payload: MakeScenarioTrigger = {
      scenario: 'document_upload_notification',
      data: {
        ...data,
        timestamp: data.timestamp.toISOString()
      },
      timestamp: new Date().toISOString(),
      source: 'pwa_documents'
    };

    return this.http.post<MakeWebhookResponse>(
      `${this.baseUrl}/webhooks/document-upload`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // ===== DIGITAL SIGNATURE =====
  sendSignatureComplete(data: {
    clientId: string;
    documentId: string;
    documentName: string;
    signerName: string;
    signerEmail: string;
    timestamp: Date;
  }): Observable<MakeWebhookResponse> {
    const payload: MakeScenarioTrigger = {
      scenario: 'signature_completed_notification',
      data: {
        ...data,
        timestamp: data.timestamp.toISOString()
      },
      timestamp: new Date().toISOString(),
      source: 'pwa_signatures'
    };

    return this.http.post<MakeWebhookResponse>(
      `${this.baseUrl}/webhooks/signature-complete`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // ===== PAYMENT PROCESSING =====
  sendPaymentConfirmation(data: {
    clientId: string;
    paymentId: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
    timestamp: Date;
  }): Observable<MakeWebhookResponse> {
    const payload: MakeScenarioTrigger = {
      scenario: 'payment_confirmation_notification',
      data: {
        ...data,
        timestamp: data.timestamp.toISOString()
      },
      timestamp: new Date().toISOString(),
      source: 'pwa_payments'
    };

    return this.http.post<MakeWebhookResponse>(
      `${this.baseUrl}/webhooks/payment-confirmation`,
      payload,
      { headers: this.getHeaders() }
    );
  }
}