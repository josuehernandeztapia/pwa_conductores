import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Client, BusinessFlow } from '../models/types';

// Odoo API Interfaces
export interface OdooExpediente {
  id: string;
  clienteId: string;
  clienteNombre: string;
  mercado: 'aguascalientes' | 'edomex';
  tipoCliente: 'individual' | 'colectivo';
  producto: 'venta-directa' | 'venta-plazo' | 'ahorro-programado';
  estado: 'nuevo' | 'proceso' | 'aprobado' | 'pagado' | 'firmado' | 'completado';
  montoTotal?: number;
  enganche?: number;
  plazo?: number;
  pagoMensual?: number;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface OdooCotizacion {
  clienteNombre: string;
  mercado: 'aguascalientes' | 'edomex';
  tipoCliente: 'individual' | 'colectivo';
  producto: 'venta-directa' | 'venta-plazo' | 'ahorro-programado';
  montoTotal: number;
  enganche: number;
  plazo: number;
  pagoMensual: number;
  configuracion: {
    incluyeGNV: boolean;
    incluyePaqueteTec: boolean;
    incluyeBancas: boolean;
    incluyeSeguro: boolean;
  };
}

export interface OdooDocumento {
  id: string;
  expedienteId: string;
  nombre: string;
  tipo: string;
  url?: string;
  estado: 'pendiente' | 'subido' | 'aprobado' | 'rechazado';
  fechaSubida?: string;
}

export interface OdooEventoPago {
  expedienteId: string;
  conektaOrderId: string;
  monto: number;
  metodoPago: 'oxxo' | 'spei' | 'card';
  estado: 'paid' | 'pending' | 'failed';
  fechaPago?: string;
  referencia?: string;
}

export interface OdooEventoFirma {
  expedienteId: string;
  mifielDocumentId: string;
  contratoTipo: 'venta-plazo' | 'promesa-compraventa';
  firmantes: {
    email: string;
    fechaFirma?: string;
    estado: 'pending' | 'signed';
  }[];
  urlContrato?: string;
}

export interface OdooPaqueteProducto {
  mercado: 'aguascalientes' | 'edomex';
  tipo: 'venta-directa' | 'venta-plazo' | 'ahorro-programado';
  componentes: {
    vagoneta: { precio: number; obligatorio: boolean };
    gnv: { precio: number; obligatorio: boolean };
    paqueteTec: { precio: number; obligatorio: boolean };
    bancas: { precio: number; obligatorio: boolean };
    seguro: { precio: number; obligatorio: boolean };
  };
  configuracion: {
    engancheMinimo: number; // percentage
    plazosDisponibles: number[];
    tasaInteres: number;
  };
}

export interface OdooEcosistema {
  id: string;
  nombre: string;
  tipo: 'ruta' | 'cooperativa' | 'asociacion';
  mercado: 'aguascalientes' | 'edomex';
  estado: 'activo' | 'inactivo' | 'pendiente';
  representanteLegal: {
    nombre: string;
    email: string;
    telefono: string;
    curp?: string;
  };
  documentosRequeridos: string[];
  documentosCompletos: boolean;
  clientesAsociados: number;
  gruposColectivos: number;
  cartaAvalId?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface OdooProspecto {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
  mercado: 'aguascalientes' | 'edomex';
  tipoInteres: 'individual' | 'colectivo';
  ecosistemaObjetivo?: string;
  origenLead: 'web' | 'whatsapp' | 'referido' | 'evento';
  estado: 'nuevo' | 'contactado' | 'cualificado' | 'convertido' | 'descartado';
  asesorAsignado?: string;
  fechaContacto?: string;
  fechaCreacion: string;
  notas?: string;
}

export interface OdooRutaDetalle {
  id: string;
  ecosistemaId: string;
  concesionNumero: string;
  rutaTipo: string;
  capacidadVehicular: number;
  unidadesActivas: number;
  ubicacionBase: string;
  horarioOperacion: {
    inicio: string;
    fin: string;
    dias: string[];
  };
  ingresosDiarios: number;
  gastosCombustible: number;
  mantenimientoMensual: number;
}

@Injectable({
  providedIn: 'root'
})
export class OdooApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${environment.odoo?.apiKey || ''}`,
      'X-API-Version': '1.0'
    });
  }

  // ===== A) CLIENTES Y EXPEDIENTES =====
  getClientes(): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.apiUrl}/clientes`, {
      headers: this.getHeaders()
    });
  }

  getCliente(id: string): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/clientes/${id}`, {
      headers: this.getHeaders()
    });
  }

  getExpediente(id: string): Observable<OdooExpediente> {
    return this.http.get<OdooExpediente>(`${this.apiUrl}/expedientes/${id}`, {
      headers: this.getHeaders()
    });
  }

  // ===== B) CREACIÓN Y ACTUALIZACIÓN =====
  crearExpediente(expediente: Partial<OdooExpediente>): Observable<OdooExpediente> {
    return this.http.post<OdooExpediente>(`${this.apiUrl}/expedientes`, expediente, {
      headers: this.getHeaders()
    });
  }

  actualizarExpediente(id: string, updates: Partial<OdooExpediente>): Observable<OdooExpediente> {
    return this.http.put<OdooExpediente>(`${this.apiUrl}/expedientes/${id}`, updates, {
      headers: this.getHeaders()
    });
  }

  // ===== C) COTIZADOR → OPORTUNIDAD =====
  crearOportunidad(cotizacion: OdooCotizacion): Observable<{
    oportunidadId: string;
    expedienteId: string;
    numeroOportunidad: string;
  }> {
    return this.http.post<{
      oportunidadId: string;
      expedienteId: string;
      numeroOportunidad: string;
    }>(`${this.apiUrl}/cotizador/oportunidad`, cotizacion, {
      headers: this.getHeaders()
    });
  }

  getPaqueteProducto(mercado: string): Observable<OdooPaqueteProducto> {
    return this.http.get<OdooPaqueteProducto>(`${this.apiUrl}/cotizador/paquete/${mercado}`, {
      headers: this.getHeaders()
    });
  }

  // ===== D) DOCUMENTOS =====
  subirDocumento(expedienteId: string, documento: {
    nombre: string;
    tipo: string;
    archivo: string; // base64
  }): Observable<OdooDocumento> {
    return this.http.post<OdooDocumento>(`${this.apiUrl}/clientes/${expedienteId}/documentos`, documento, {
      headers: this.getHeaders()
    });
  }

  getDocumentos(expedienteId: string): Observable<OdooDocumento[]> {
    return this.http.get<OdooDocumento[]>(`${this.apiUrl}/clientes/${expedienteId}/documentos`, {
      headers: this.getHeaders()
    });
  }

  generarContrato(expedienteId: string, tipoContrato: string): Observable<{
    documentoId: string;
    url: string;
  }> {
    return this.http.post<{
      documentoId: string;
      url: string;
    }>(`${this.apiUrl}/documentos`, {
      expedienteId,
      tipo: tipoContrato,
      generar: true
    }, {
      headers: this.getHeaders()
    });
  }

  descargarDocumento(documentoId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documentos/${documentoId}`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  // ===== E) EVENTOS DE SINCRONIZACIÓN =====
  notificarEventoPago(eventoPago: OdooEventoPago): Observable<{
    success: boolean;
    expedienteEstado: string;
    proximoPaso: string;
  }> {
    return this.http.post<{
      success: boolean;
      expedienteEstado: string;
      proximoPaso: string;
    }>(`${this.apiUrl}/evento-pago`, eventoPago, {
      headers: this.getHeaders()
    });
  }

  notificarEventoFirma(eventoFirma: OdooEventoFirma): Observable<{
    success: boolean;
    expedienteEstado: string;
    contratoUrl: string;
  }> {
    return this.http.post<{
      success: boolean;
      expedienteEstado: string;
      contratoUrl: string;
    }>(`${this.apiUrl}/evento-firma`, eventoFirma, {
      headers: this.getHeaders()
    });
  }

  // ===== F) LISTADOS Y BÚSQUEDAS =====
  getOportunidades(filtros?: {
    estado?: string;
    mercado?: string;
    asesor?: string;
  }): Observable<OdooExpediente[]> {
    const params = new URLSearchParams();
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.mercado) params.append('mercado', filtros.mercado);
    if (filtros?.asesor) params.append('asesor', filtros.asesor);

    return this.http.get<OdooExpediente[]>(`${this.apiUrl}/oportunidades?${params.toString()}`, {
      headers: this.getHeaders()
    });
  }

  getExpedientesPorEstado(estado: string): Observable<OdooExpediente[]> {
    return this.http.get<OdooExpediente[]>(`${this.apiUrl}/expedientes?estatus=${estado}`, {
      headers: this.getHeaders()
    });
  }

  // ===== G) DASHBOARD Y MÉTRICAS =====
  getDashboardData(): Observable<{
    oportunidadesActivas: number;
    expedientesPendientes: number;
    pagosHoy: number;
    firmasHoy: number;
    pipeline: {
      nuevas: number;
      proceso: number;
      aprobadas: number;
      pagadas: number;
      firmadas: number;
    };
  }> {
    return this.http.get<{
      oportunidadesActivas: number;
      expedientesPendientes: number;
      pagosHoy: number;
      firmasHoy: number;
      pipeline: {
        nuevas: number;
        proceso: number;
        aprobadas: number;
        pagadas: number;
        firmadas: number;
      };
    }>(`${this.apiUrl}/dashboard`, {
      headers: this.getHeaders()
    });
  }

  // ===== H) TANDAS COLECTIVAS =====
  crearTanda(tanda: {
    nombre: string;
    mercado: string;
    capacidad: number;
    metaEnganche: number;
    pagoMensual: number;
  }): Observable<{
    tandaId: string;
    codigoInvitacion: string;
  }> {
    return this.http.post<{
      tandaId: string;
      codigoInvitacion: string;
    }>(`${this.apiUrl}/tandas`, tanda, {
      headers: this.getHeaders()
    });
  }

  avanzarCicloTanda(tandaId: string, datos: {
    unidadEntregada: boolean;
    nuevoCiclo: number;
    ahorroAcumulado: number;
  }): Observable<{
    success: boolean;
    cicloActual: number;
    siguienteMeta: number;
  }> {
    return this.http.put<{
      success: boolean;
      cicloActual: number;
      siguienteMeta: number;
    }>(`${this.apiUrl}/tandas/${tandaId}/ciclo`, datos, {
      headers: this.getHeaders()
    });
  }

  // ===== I) HEALTH CHECK =====
  healthCheck(): Observable<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    timestamp: string;
    odooConnection: boolean;
  }> {
    return this.http.get<{
      status: 'healthy' | 'degraded' | 'unhealthy';
      version: string;
      timestamp: string;
      odooConnection: boolean;
    }>(`${this.apiUrl}/health`, {
      headers: this.getHeaders()
    });
  }

  // ===== J) ECOSISTEMAS/RUTAS DINÁMICOS =====
  getEcosistemas(filtros?: {
    mercado?: string;
    tipo?: string;
    estado?: string;
  }): Observable<OdooEcosistema[]> {
    const params = new URLSearchParams();
    if (filtros?.mercado) params.append('mercado', filtros.mercado);
    if (filtros?.tipo) params.append('tipo', filtros.tipo);
    if (filtros?.estado) params.append('estado', filtros.estado);

    return this.http.get<OdooEcosistema[]>(`${this.apiUrl}/ecosistemas?${params.toString()}`, {
      headers: this.getHeaders()
    });
  }

  getEcosistema(id: string): Observable<OdooEcosistema> {
    return this.http.get<OdooEcosistema>(`${this.apiUrl}/ecosistemas/${id}`, {
      headers: this.getHeaders()
    });
  }

  crearEcosistema(ecosistema: Partial<OdooEcosistema>): Observable<OdooEcosistema> {
    return this.http.post<OdooEcosistema>(`${this.apiUrl}/ecosistemas`, ecosistema, {
      headers: this.getHeaders()
    });
  }

  actualizarEcosistema(id: string, updates: Partial<OdooEcosistema>): Observable<OdooEcosistema> {
    return this.http.put<OdooEcosistema>(`${this.apiUrl}/ecosistemas/${id}`, updates, {
      headers: this.getHeaders()
    });
  }

  // ===== K) GESTIÓN DE PROSPECTOS =====
  getProspectos(filtros?: {
    mercado?: string;
    estado?: string;
    asesor?: string;
    ecosistema?: string;
  }): Observable<OdooProspecto[]> {
    const params = new URLSearchParams();
    if (filtros?.mercado) params.append('mercado', filtros.mercado);
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.asesor) params.append('asesor', filtros.asesor);
    if (filtros?.ecosistema) params.append('ecosistema', filtros.ecosistema);

    return this.http.get<OdooProspecto[]>(`${this.apiUrl}/prospectos?${params.toString()}`, {
      headers: this.getHeaders()
    });
  }

  crearProspecto(prospecto: Partial<OdooProspecto>): Observable<OdooProspecto> {
    return this.http.post<OdooProspecto>(`${this.apiUrl}/prospectos`, prospecto, {
      headers: this.getHeaders()
    });
  }

  actualizarProspecto(id: string, updates: Partial<OdooProspecto>): Observable<OdooProspecto> {
    return this.http.put<OdooProspecto>(`${this.apiUrl}/prospectos/${id}`, updates, {
      headers: this.getHeaders()
    });
  }

  convertirProspecto(id: string, datos: {
    expedienteId?: string;
    ecosistemaAsignado?: string;
    cotizacion?: any;
  }): Observable<{
    success: boolean;
    clienteId: string;
    expedienteId: string;
  }> {
    return this.http.post<{
      success: boolean;
      clienteId: string;
      expedienteId: string;
    }>(`${this.apiUrl}/prospectos/${id}/convertir`, datos, {
      headers: this.getHeaders()
    });
  }

  // ===== L) DETALLES DE RUTAS =====
  getRutaDetalle(ecosistemaId: string): Observable<OdooRutaDetalle> {
    return this.http.get<OdooRutaDetalle>(`${this.apiUrl}/ecosistemas/${ecosistemaId}/ruta-detalle`, {
      headers: this.getHeaders()
    });
  }

  actualizarRutaDetalle(ecosistemaId: string, updates: Partial<OdooRutaDetalle>): Observable<OdooRutaDetalle> {
    return this.http.put<OdooRutaDetalle>(`${this.apiUrl}/ecosistemas/${ecosistemaId}/ruta-detalle`, updates, {
      headers: this.getHeaders()
    });
  }

  // ===== M) PIPELINE Y ANALYTICS DE ECOSISTEMAS =====
  getEcosistemaPipeline(ecosistemaId: string): Observable<{
    prospectos: {
      nuevos: number;
      contactados: number;
      cualificados: number;
      convertidos: number;
    };
    clientes: {
      activos: number;
      proceso: number;
      completados: number;
    };
    gruposColectivos: {
      activos: number;
      enFormacion: number;
      completados: number;
    };
    ingresosMes: number;
    objetivoMes: number;
  }> {
    return this.http.get<{
      prospectos: {
        nuevos: number;
        contactados: number;
        cualificados: number;
        convertidos: number;
      };
      clientes: {
        activos: number;
        proceso: number;
        completados: number;
      };
      gruposColectivos: {
        activos: number;
        enFormacion: number;
        completados: number;
      };
      ingresosMes: number;
      objetivoMes: number;
    }>(`${this.apiUrl}/ecosistemas/${ecosistemaId}/pipeline`, {
      headers: this.getHeaders()
    });
  }

  // ===== N) ASIGNACIÓN DE CLIENTES A ECOSISTEMAS =====
  asignarClienteEcosistema(clienteId: string, ecosistemaId: string): Observable<{
    success: boolean;
    mensaje: string;
  }> {
    return this.http.post<{
      success: boolean;
      mensaje: string;
    }>(`${this.apiUrl}/clientes/${clienteId}/asignar-ecosistema`, {
      ecosistemaId
    }, {
      headers: this.getHeaders()
    });
  }

  // ===== O) CRM PIPELINE AUTOMATIZADO =====
  capturaProspectoAutomatica(datos: {
    nombre: string;
    telefono: string;
    email?: string;
    origen: 'whatsapp' | 'web' | 'referido' | 'evento';
    mercado: 'aguascalientes' | 'edomex';
    tipoInteres: 'individual' | 'colectivo';
    mensaje?: string;
    utm_source?: string;
    utm_campaign?: string;
  }): Observable<{
    prospectoId: string;
    score: number;
    recomendacion: 'contactar_inmediato' | 'agendar_seguimiento' | 'nutrir_lead';
    ecosistemaSugerido?: string;
    asesorAsignado?: string;
  }> {
    return this.http.post<{
      prospectoId: string;
      score: number;
      recomendacion: 'contactar_inmediato' | 'agendar_seguimiento' | 'nutrir_lead';
      ecosistemaSugerido?: string;
      asesorAsignado?: string;
    }>(`${this.apiUrl}/crm/captura-automatica`, datos, {
      headers: this.getHeaders()
    });
  }

  actualizarScoreProspecto(prospectoId: string, interacciones: {
    respondioWhatsApp?: boolean;
    vistoSimulador?: boolean;
    descargoDocumentos?: boolean;
    asistioCita?: boolean;
    tiempoEnSitio?: number; // minutos
    paginasVistas?: number;
  }): Observable<{
    nuevoScore: number;
    recomendacion: string;
    proximaAccion: string;
  }> {
    return this.http.put<{
      nuevoScore: number;
      recomendacion: string;
      proximaAccion: string;
    }>(`${this.apiUrl}/crm/prospectos/${prospectoId}/score`, { interacciones }, {
      headers: this.getHeaders()
    });
  }

  ejecutarSeguimientoAutomatico(prospectoId: string, accion: {
    tipo: 'whatsapp' | 'email' | 'llamada';
    template: string;
    programadoPara?: string; // ISO date
    asesorId?: string;
  }): Observable<{
    success: boolean;
    mensajeEnviado: boolean;
    proximoSeguimiento: string;
  }> {
    return this.http.post<{
      success: boolean;
      mensajeEnviado: boolean;
      proximoSeguimiento: string;
    }>(`${this.apiUrl}/crm/prospectos/${prospectoId}/seguimiento`, accion, {
      headers: this.getHeaders()
    });
  }

  getPipelineMetrics(filtros?: {
    asesor?: string;
    mercado?: string;
    periodo?: 'dia' | 'semana' | 'mes';
  }): Observable<{
    prospectos: {
      nuevos: number;
      contactados: number;
      cualificados: number;
      convertidos: number;
      descartados: number;
    };
    tasasConversion: {
      contactoACualificado: number;
      cualificadoAConvertido: number;
      globalConversion: number;
    };
    tiemposPromedio: {
      contactoInicial: number; // horas
      cualificacion: number; // días
      conversion: number; // días
    };
    origenes: {
      [key: string]: {
        cantidad: number;
        conversion: number;
      };
    };
    ecosistemas: {
      [key: string]: {
        prospectos: number;
        conversiones: number;
        ingresos: number;
      };
    };
  }> {
    const params = new URLSearchParams();
    if (filtros?.asesor) params.append('asesor', filtros.asesor);
    if (filtros?.mercado) params.append('mercado', filtros.mercado);
    if (filtros?.periodo) params.append('periodo', filtros.periodo);

    return this.http.get<{
      prospectos: {
        nuevos: number;
        contactados: number;
        cualificados: number;
        convertidos: number;
        descartados: number;
      };
      tasasConversion: {
        contactoACualificado: number;
        cualificadoAConvertido: number;
        globalConversion: number;
      };
      tiemposPromedio: {
        contactoInicial: number;
        cualificacion: number;
        conversion: number;
      };
      origenes: {
        [key: string]: {
          cantidad: number;
          conversion: number;
        };
      };
      ecosistemas: {
        [key: string]: {
          prospectos: number;
          conversiones: number;
          ingresos: number;
        };
      };
    }>(`${this.apiUrl}/crm/pipeline/metrics?${params.toString()}`, {
      headers: this.getHeaders()
    });
  }

  getProspectosConAccionesPendientes(asesorId?: string): Observable<{
    id: string;
    nombre: string;
    telefono: string;
    score: number;
    accionRequerida: 'contactar_inmediato' | 'agendar_cita' | 'enviar_followup' | 'revisar_documentos';
    prioridad: 'alta' | 'media' | 'baja';
    tiempoLimite: string; // ISO date
    contexto: string;
  }[]> {
    const params = asesorId ? `?asesor=${asesorId}` : '';
    return this.http.get<{
      id: string;
      nombre: string;
      telefono: string;
      score: number;
      accionRequerida: 'contactar_inmediato' | 'agendar_cita' | 'enviar_followup' | 'revisar_documentos';
      prioridad: 'alta' | 'media' | 'baja';
      tiempoLimite: string;
      contexto: string;
    }[]>(`${this.apiUrl}/crm/acciones-pendientes${params}`, {
      headers: this.getHeaders()
    });
  }

  configurarReglasAutomatizacion(reglas: {
    id?: string;
    nombre: string;
    condiciones: {
      scoreMinimo?: number;
      scoreMaximo?: number;
      origen?: string[];
      mercado?: string[];
      diasSinContacto?: number;
      interaccionesMinimas?: number;
    };
    acciones: {
      tipo: 'asignar_asesor' | 'enviar_whatsapp' | 'enviar_email' | 'agendar_llamada' | 'mover_estado' | 'descartar';
      parametros: any;
      delay?: number; // minutos
    }[];
    activa: boolean;
  }): Observable<{
    reglaId: string;
    configuracionGuardada: boolean;
  }> {
    return this.http.post<{
      reglaId: string;
      configuracionGuardada: boolean;
    }>(`${this.apiUrl}/crm/automatizacion/reglas`, reglas, {
      headers: this.getHeaders()
    });
  }

  // ===== P) GESTIÓN DOCUMENTAL CENTRALIZADA =====
  subirDocumentoConOCR(expedienteId: string, archivo: {
    nombre: string;
    tipo: 'INE' | 'comprobante_domicilio' | 'situacion_fiscal' | 'concesion' | 'tarjeta_circulacion' | 
          'factura_unidad' | 'carta_antiguedad' | 'acta_constitutiva' | 'poder_representante' | 'otros';
    archivo: string; // base64
    categoria: 'identidad' | 'domicilio' | 'fiscal' | 'vehicular' | 'legal' | 'financiero';
    procesarOCR?: boolean;
  }): Observable<{
    documentoId: string;
    estado: 'procesando' | 'validado' | 'rechazado';
    datosExtraidos?: {
      [key: string]: string;
    };
    confianzaOCR?: number;
    siguientePaso: string;
  }> {
    const headers = this.getHeaders();
    headers.set('Content-Type', 'application/json');
    
    return this.http.post<{
      documentoId: string;
      estado: 'procesando' | 'validado' | 'rechazado';
      datosExtraidos?: {
        [key: string]: string;
      };
      confianzaOCR?: number;
      siguientePaso: string;
    }>(`${this.apiUrl}/expedientes/${expedienteId}/documentos/upload-ocr`, archivo, {
      headers
    });
  }

  validarDocumentoAutomatico(documentoId: string, criterios: {
    validarTexto?: boolean;
    validarFirmas?: boolean;
    validarSellos?: boolean;
    validarFechas?: boolean;
    validarIdentidad?: boolean;
    nivelValidacion: 'basico' | 'intermedio' | 'avanzado';
  }): Observable<{
    documentoId: string;
    estadoValidacion: 'aprobado' | 'rechazado' | 'requiere_revision_manual';
    puntuacion: number; // 0-100
    observaciones: {
      tipo: 'error' | 'advertencia' | 'info';
      mensaje: string;
      campo?: string;
    }[];
    datosCorregidos?: {
      [key: string]: string;
    };
    requiereAccion?: {
      tipo: 'resubir' | 'completar_info' | 'revision_asesor';
      descripcion: string;
    };
  }> {
    return this.http.post<{
      documentoId: string;
      estadoValidacion: 'aprobado' | 'rechazado' | 'requiere_revision_manual';
      puntuacion: number;
      observaciones: {
        tipo: 'error' | 'advertencia' | 'info';
        mensaje: string;
        campo?: string;
      }[];
      datosCorregidos?: {
        [key: string]: string;
      };
      requiereAccion?: {
        tipo: 'resubir' | 'completar_info' | 'revision_asesor';
        descripcion: string;
      };
    }>(`${this.apiUrl}/documentos/${documentoId}/validar-automatico`, criterios, {
      headers: this.getHeaders()
    });
  }

  getExpedienteCompleto(expedienteId: string): Observable<{
    expediente: OdooExpediente;
    documentos: {
      id: string;
      nombre: string;
      tipo: string;
      estado: 'pendiente' | 'subido' | 'validando' | 'aprobado' | 'rechazado';
      fechaSubida?: string;
      fechaValidacion?: string;
      puntuacionValidacion?: number;
      observaciones?: string[];
      url?: string;
      tamano?: number;
      version?: number;
    }[];
    flujoAprobacion: {
      etapa: 'documentos' | 'validacion' | 'revision' | 'aprobacion' | 'completado';
      progreso: number; // 0-100
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
  }> {
    return this.http.get<{
      expediente: OdooExpediente;
      documentos: {
        id: string;
        nombre: string;
        tipo: string;
        estado: 'pendiente' | 'subido' | 'validando' | 'aprobado' | 'rechazado';
        fechaSubida?: string;
        fechaValidacion?: string;
        puntuacionValidacion?: number;
        observaciones?: string[];
        url?: string;
        tamano?: number;
        version?: number;
      }[];
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
    }>(`${this.apiUrl}/expedientes/${expedienteId}/completo`, {
      headers: this.getHeaders()
    });
  }

  procesarLoteDocumentos(expedienteId: string, documentos: {
    nombre: string;
    tipo: string;
    archivo: string; // base64
  }[]): Observable<{
    loteId: string;
    documentosProcesados: number;
    documentosValidados: number;
    documentosRechazados: number;
    tiempoEstimado: number; // minutos
    resultados: {
      documentoId: string;
      nombre: string;
      estado: 'procesando' | 'validado' | 'rechazado';
      observaciones?: string[];
    }[];
  }> {
    return this.http.post<{
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
    }>(`${this.apiUrl}/expedientes/${expedienteId}/documentos/lote`, { documentos }, {
      headers: this.getHeaders()
    });
  }

  generarReporteExpediente(expedienteId: string, tipo: 'resumen' | 'completo' | 'legal'): Observable<{
    reporteId: string;
    url: string;
    tipoReporte: string;
    fechaGeneracion: string;
    validoHasta: string;
  }> {
    return this.http.post<{
      reporteId: string;
      url: string;
      tipoReporte: string;
      fechaGeneracion: string;
      validoHasta: string;
    }>(`${this.apiUrl}/expedientes/${expedienteId}/generar-reporte`, { tipo }, {
      headers: this.getHeaders()
    });
  }

  configurarFlujosAprobacion(configuracion: {
    tipoExpediente: 'individual' | 'colectivo';
    mercado: 'aguascalientes' | 'edomex';
    etapas: {
      nombre: string;
      responsable: 'sistema' | 'asesor' | 'supervisor' | 'gerente';
      criterios: {
        documentosRequeridos: string[];
        validacionesAutomaticas: boolean;
        tiempoMaximo?: number; // horas
      };
      acciones: {
        aprobacion: string;
        rechazo: string;
        escalacion?: string;
      };
    }[];
    notificaciones: {
      email: boolean;
      whatsapp: boolean;
      dashboard: boolean;
    };
  }): Observable<{
    flujoId: string;
    configuracionGuardada: boolean;
  }> {
    return this.http.post<{
      flujoId: string;
      configuracionGuardada: boolean;
    }>(`${this.apiUrl}/flujos-aprobacion/configurar`, configuracion, {
      headers: this.getHeaders()
    });
  }

  // Dashboard de documentos pendientes
  getDocumentosPendientesGlobal(filtros?: {
    asesor?: string;
    mercado?: string;
    tipoDocumento?: string;
    prioridad?: 'alta' | 'media' | 'baja';
  }): Observable<{
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
      promedioValidacion: number; // días
      tasaAprobacion: number; // porcentaje
      documentosHoy: number;
    };
    alertas: {
      expedientesVencidos: number;
      documentosRechazados: number;
      validacionesAtrasadas: number;
    };
  }> {
    const params = new URLSearchParams();
    if (filtros?.asesor) params.append('asesor', filtros.asesor);
    if (filtros?.mercado) params.append('mercado', filtros.mercado);
    if (filtros?.tipoDocumento) params.append('tipo', filtros.tipoDocumento);
    if (filtros?.prioridad) params.append('prioridad', filtros.prioridad);

    return this.http.get<{
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
    }>(`${this.apiUrl}/documentos/dashboard-pendientes?${params.toString()}`, {
      headers: this.getHeaders()
    });
  }

  // Búsqueda inteligente de documentos
  buscarDocumentos(query: {
    texto?: string;
    tipoDocumento?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    estado?: string;
    clienteNombre?: string;
    asesor?: string;
  }): Observable<{
    resultados: {
      documentoId: string;
      expedienteId: string;
      clienteNombre: string;
      tipoDocumento: string;
      estado: string;
      fechaSubida: string;
      relevancia: number; // 0-100
      extractoTexto?: string;
      url?: string;
    }[];
    totalResultados: number;
    tiempoBusqueda: number; // ms
  }> {
    return this.http.post<{
      resultados: {
        documentoId: string;
        expedienteId: string;
        clienteNombre: string;
        tipoDocumento: string;
        estado: string;
        fechaSubida: string;
        relevancia: number;
        extractoTexto?: string;
        url?: string;
      }[];
      totalResultados: number;
      tiempoBusqueda: number;
    }>(`${this.apiUrl}/documentos/buscar`, query, {
      headers: this.getHeaders()
    });
  }

  // ===== Q) BUSINESS INTELLIGENCE & ANALYTICS =====
  getDashboardEjecutivo(periodo: {
    fechaInicio: string;
    fechaFin: string;
    mercado?: 'aguascalientes' | 'edomex' | 'ambos';
    asesor?: string;
    ecosistema?: string;
  }): Observable<{
    resumenGeneral: {
      ventasTotales: number;
      ingresosTotales: number;
      clientesNuevos: number;
      clientesActivos: number;
      unidadesVendidas: number;
      ticketPromedio: number;
      crecimientoVsMesAnterior: number; // porcentaje
      crecimientoVsAnoAnterior: number; // porcentaje
    };
    pipeline: {
      prospectos: {
        nuevos: number;
        contactados: number;
        cualificados: number;
        convertidos: number;
        tasaConversion: number;
      };
      expedientes: {
        nuevo: number;
        proceso: number;
        aprobado: number;
        firmado: number;
        completado: number;
        tiempoPromedioComplecion: number; // días
      };
      documentos: {
        subidos: number;
        validados: number;
        rechazados: number;
        pendientes: number;
        tasaAprobacion: number;
      };
    };
    rendimientoPorAsesor: {
      asesorId: string;
      asesorNombre: string;
      ventasMes: number;
      ingresosMes: number;
      clientesNuevos: number;
      prospectos: number;
      tasaConversion: number;
      expedientesCompletados: number;
      ranking: number;
      metaMensual: number;
      cumplimientoMeta: number; // porcentaje
    }[];
    rendimientoPorMercado: {
      mercado: 'aguascalientes' | 'edomex';
      ventas: number;
      ingresos: number;
      clientes: number;
      ecosistemas: number;
      participacionMercado: number; // porcentaje
      crecimiento: number; // porcentaje vs periodo anterior
    }[];
    rendimientoPorEcosistema: {
      ecosistemaId: string;
      ecosistemaNombre: string;
      tipoEcosistema: 'ruta' | 'cooperativa' | 'asociacion';
      clientesActivos: number;
      ingresosMes: number;
      gruposColectivos: number;
      promedioTicket: number;
      eficienciaDocumental: number; // porcentaje documentos aprobados
    }[];
    tendencias: {
      ventasPorMes: {
        mes: string;
        ventas: number;
        ingresos: number;
      }[];
      clientesPorMes: {
        mes: string;
        nuevos: number;
        activos: number;
      }[];
      conversionPorMes: {
        mes: string;
        prospectos: number;
        convertidos: number;
        tasa: number;
      }[];
    };
    alertas: {
      tipo: 'rendimiento' | 'meta' | 'pipeline' | 'documentos';
      prioridad: 'alta' | 'media' | 'baja';
      titulo: string;
      descripcion: string;
      metrica: number;
      umbral: number;
      asesor?: string;
      ecosistema?: string;
    }[];
  }> {
    return this.http.post<{
      resumenGeneral: {
        ventasTotales: number;
        ingresosTotales: number;
        clientesNuevos: number;
        clientesActivos: number;
        unidadesVendidas: number;
        ticketPromedio: number;
        crecimientoVsMesAnterior: number;
        crecimientoVsAnoAnterior: number;
      };
      pipeline: {
        prospectos: {
          nuevos: number;
          contactados: number;
          cualificados: number;
          convertidos: number;
          tasaConversion: number;
        };
        expedientes: {
          nuevo: number;
          proceso: number;
          aprobado: number;
          firmado: number;
          completado: number;
          tiempoPromedioComplecion: number;
        };
        documentos: {
          subidos: number;
          validados: number;
          rechazados: number;
          pendientes: number;
          tasaAprobacion: number;
        };
      };
      rendimientoPorAsesor: {
        asesorId: string;
        asesorNombre: string;
        ventasMes: number;
        ingresosMes: number;
        clientesNuevos: number;
        prospectos: number;
        tasaConversion: number;
        expedientesCompletados: number;
        ranking: number;
        metaMensual: number;
        cumplimientoMeta: number;
      }[];
      rendimientoPorMercado: {
        mercado: 'aguascalientes' | 'edomex';
        ventas: number;
        ingresos: number;
        clientes: number;
        ecosistemas: number;
        participacionMercado: number;
        crecimiento: number;
      }[];
      rendimientoPorEcosistema: {
        ecosistemaId: string;
        ecosistemaNombre: string;
        tipoEcosistema: 'ruta' | 'cooperativa' | 'asociacion';
        clientesActivos: number;
        ingresosMes: number;
        gruposColectivos: number;
        promedioTicket: number;
        eficienciaDocumental: number;
      }[];
      tendencias: {
        ventasPorMes: {
          mes: string;
          ventas: number;
          ingresos: number;
        }[];
        clientesPorMes: {
          mes: string;
          nuevos: number;
          activos: number;
        }[];
        conversionPorMes: {
          mes: string;
          prospectos: number;
          convertidos: number;
          tasa: number;
        }[];
      };
      alertas: {
        tipo: 'rendimiento' | 'meta' | 'pipeline' | 'documentos';
        prioridad: 'alta' | 'media' | 'baja';
        titulo: string;
        descripcion: string;
        metrica: number;
        umbral: number;
        asesor?: string;
        ecosistema?: string;
      }[];
    }>(`${this.apiUrl}/bi/dashboard-ejecutivo`, periodo, {
      headers: this.getHeaders()
    });
  }

  generarReporteAutomatico(configuracion: {
    tipoReporte: 'ejecutivo' | 'ventas' | 'operativo' | 'financiero';
    frecuencia: 'diario' | 'semanal' | 'mensual' | 'trimestral';
    formato: 'pdf' | 'excel' | 'powerbi';
    destinatarios: {
      email: string;
      rol: 'gerente' | 'supervisor' | 'asesor';
    }[];
    filtros: {
      mercado?: 'aguascalientes' | 'edomex' | 'ambos';
      asesor?: string[];
      ecosistema?: string[];
      fechaInicio?: string;
      fechaFin?: string;
    };
    kpis: string[]; // Lista de KPIs a incluir
    graficos: {
      tipo: 'barras' | 'lineas' | 'pastel' | 'area';
      metrica: string;
      titulo: string;
    }[];
    enviarAutomaticamente: boolean;
    horaEnvio?: string; // HH:MM formato 24h
    diaEnvio?: 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado' | 'domingo';
  }): Observable<{
    reporteId: string;
    programacionId?: string;
    url: string;
    fechaGeneracion: string;
    validoHasta: string;
    enviado: boolean;
    destinatariosNotificados: number;
  }> {
    return this.http.post<{
      reporteId: string;
      programacionId?: string;
      url: string;
      fechaGeneracion: string;
      validoHasta: string;
      enviado: boolean;
      destinatariosNotificados: number;
    }>(`${this.apiUrl}/bi/generar-reporte-automatico`, configuracion, {
      headers: this.getHeaders()
    });
  }

  getPrediccionesVentas(parametros: {
    periodoPronostico: number; // meses hacia adelante
    mercado?: 'aguascalientes' | 'edomex' | 'ambos';
    asesor?: string;
    ecosistema?: string;
    modeloML: 'linear' | 'polynomial' | 'arima' | 'prophet';
    factoresExternos?: {
      estacionalidad: boolean;
      tendenciaMercado: boolean;
      competencia: boolean;
      economia: boolean;
    };
  }): Observable<{
    predicciones: {
      mes: string;
      ventasPredichas: number;
      ingresosPredichos: number;
      confianza: number; // 0-100
      rangoMinimo: number;
      rangoMaximo: number;
    }[];
    precision: {
      modeloUtilizado: string;
      precisonHistorica: number; // porcentaje
      factoresConsiderados: string[];
      ultimaActualizacion: string;
    };
    recomendaciones: {
      tipo: 'accion' | 'alerta' | 'oportunidad';
      titulo: string;
      descripcion: string;
      impactoEstimado: number;
      prioridad: 'alta' | 'media' | 'baja';
    }[];
  }> {
    return this.http.post<{
      predicciones: {
        mes: string;
        ventasPredichas: number;
        ingresosPredichos: number;
        confianza: number;
        rangoMinimo: number;
        rangoMaximo: number;
      }[];
      precision: {
        modeloUtilizado: string;
        precisonHistorica: number;
        factoresConsiderados: string[];
        ultimaActualizacion: string;
      };
      recomendaciones: {
        tipo: 'accion' | 'alerta' | 'oportunidad';
        titulo: string;
        descripcion: string;
        impactoEstimado: number;
        prioridad: 'alta' | 'media' | 'baja';
      }[];
    }>(`${this.apiUrl}/bi/predicciones-ventas`, parametros, {
      headers: this.getHeaders()
    });
  }

  configurarAlertasInteligentes(alertas: {
    id?: string;
    nombre: string;
    descripcion: string;
    activa: boolean;
    tipo: 'umbral' | 'tendencia' | 'anomalia' | 'prediccion';
    metrica: string;
    condiciones: {
      operador: 'mayor' | 'menor' | 'igual' | 'entre' | 'cambio_porcentual';
      valor1: number;
      valor2?: number; // Para operador 'entre'
      periodo: 'tiempo_real' | 'diario' | 'semanal' | 'mensual';
    };
    filtros: {
      mercado?: string[];
      asesor?: string[];
      ecosistema?: string[];
    };
    acciones: {
      notificarEmail: boolean;
      notificarWhatsApp: boolean;
      notificarDashboard: boolean;
      destinatarios: string[];
      plantillaMensaje?: string;
    };
    prioridad: 'critica' | 'alta' | 'media' | 'baja';
  }[]): Observable<{
    alertasConfiguradas: number;
    alertasActivas: number;
    proximaEvaluacion: string;
  }> {
    return this.http.post<{
      alertasConfiguradas: number;
      alertasActivas: number;
      proximaEvaluacion: string;
    }>(`${this.apiUrl}/bi/configurar-alertas`, { alertas }, {
      headers: this.getHeaders()
    });
  }

  getKPIsRealTime(): Observable<{
    timestamp: string;
    ventasHoy: number;
    ingresosHoy: number;
    prospectosHoy: number;
    conversionesHoy: number;
    documentosSubidos: number;
    documentosValidados: number;
    expedientesCompletados: number;
    alertasActivas: number;
    rendimientoEquipo: {
      asesorTop: {
        nombre: string;
        ventas: number;
      };
      ecosistemaTop: {
        nombre: string;
        ingresos: number;
      };
      metricaCritica: {
        nombre: string;
        valor: number;
        estado: 'ok' | 'atencion' | 'critico';
      };
    };
  }> {
    return this.http.get<{
      timestamp: string;
      ventasHoy: number;
      ingresosHoy: number;
      prospectosHoy: number;
      conversionesHoy: number;
      documentosSubidos: number;
      documentosValidados: number;
      expedientesCompletados: number;
      alertasActivas: number;
      rendimientoEquipo: {
        asesorTop: {
          nombre: string;
          ventas: number;
        };
        ecosistemaTop: {
          nombre: string;
          ingresos: number;
        };
        metricaCritica: {
          nombre: string;
          valor: number;
          estado: 'ok' | 'atencion' | 'critico';
        };
      };
    }>(`${this.apiUrl}/bi/kpis-realtime`, {
      headers: this.getHeaders()
    });
  }

  exportarDatos(configuracion: {
    formato: 'excel' | 'csv' | 'json' | 'pdf';
    datos: 'dashboard' | 'ventas' | 'clientes' | 'documentos' | 'pipeline' | 'ecosistemas';
    filtros: {
      fechaInicio: string;
      fechaFin: string;
      mercado?: string;
      asesor?: string;
    };
    columnas?: string[]; // Específicas a incluir
    incluirGraficos?: boolean;
    incluirResumen?: boolean;
  }): Observable<{
    exportId: string;
    url: string;
    tamano: number; // bytes
    registros: number;
    fechaGeneracion: string;
    validoHasta: string;
  }> {
    return this.http.post<{
      exportId: string;
      url: string;
      tamano: number;
      registros: number;
      fechaGeneracion: string;
      validoHasta: string;
    }>(`${this.apiUrl}/bi/exportar-datos`, configuracion, {
      headers: this.getHeaders()
    });
  }
}