import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, BehaviorSubject, interval, of, timer } from 'rxjs';
import { map, tap, catchError, switchMap, filter } from 'rxjs/operators';
import { OdooApiService } from './odoo-api.service';

// Business Intelligence Types
export interface ExecutiveDashboard {
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
  rendimientoPorAsesor: AdvisorPerformance[];
  rendimientoPorMercado: MarketPerformance[];
  rendimientoPorEcosistema: EcosystemPerformance[];
  tendencias: TrendsData;
  alertas: IntelligentAlert[];
}

export interface AdvisorPerformance {
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
}

export interface MarketPerformance {
  mercado: 'aguascalientes' | 'edomex';
  ventas: number;
  ingresos: number;
  clientes: number;
  ecosistemas: number;
  participacionMercado: number;
  crecimiento: number;
}

export interface EcosystemPerformance {
  ecosistemaId: string;
  ecosistemaNombre: string;
  tipoEcosistema: 'ruta' | 'cooperativa' | 'asociacion';
  clientesActivos: number;
  ingresosMes: number;
  gruposColectivos: number;
  promedioTicket: number;
  eficienciaDocumental: number;
}

export interface TrendsData {
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
}

export interface IntelligentAlert {
  tipo: 'rendimiento' | 'meta' | 'pipeline' | 'documentos';
  prioridad: 'alta' | 'media' | 'baja';
  titulo: string;
  descripcion: string;
  metrica: number;
  umbral: number;
  asesor?: string;
  ecosistema?: string;
}

export interface SalesPrediction {
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
}

export interface AutomatedReport {
  reporteId: string;
  programacionId?: string;
  url: string;
  fechaGeneracion: string;
  validoHasta: string;
  enviado: boolean;
  destinatariosNotificados: number;
}

export interface RealTimeKPIs {
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
}

export interface ReportConfiguration {
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
  kpis: string[];
  graficos: {
    tipo: 'barras' | 'lineas' | 'pastel' | 'area';
    metrica: string;
    titulo: string;
  }[];
  enviarAutomaticamente: boolean;
  horaEnvio?: string;
  diaEnvio?: 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado' | 'domingo';
}

@Injectable({
  providedIn: 'root'
})
export class BusinessIntelligenceService {
  private odooApi = inject(OdooApiService);
  
  // State signals
  private executiveDashboard = signal<ExecutiveDashboard | null>(null);
  private realTimeKPIs = signal<RealTimeKPIs | null>(null);
  private salesPredictions = signal<SalesPrediction | null>(null);
  private activeAlerts = signal<IntelligentAlert[]>([]);
  private scheduledReports = signal<ReportConfiguration[]>([]);
  
  // Update intervals
  private dashboardUpdateInterval$ = new BehaviorSubject<boolean>(true);
  private kpisUpdateInterval$ = new BehaviorSubject<boolean>(true);
  
  // Computed signals
  dashboard = computed(() => this.executiveDashboard());
  kpis = computed(() => this.realTimeKPIs());
  predictions = computed(() => this.salesPredictions());
  alerts = computed(() => this.activeAlerts());
  reports = computed(() => this.scheduledReports());
  
  // Critical alerts (high priority)
  criticalAlerts = computed(() => 
    this.activeAlerts().filter(alert => alert.prioridad === 'alta')
  );
  
  // Performance summary
  performanceSummary = computed(() => {
    const dashboard = this.executiveDashboard();
    if (!dashboard) return null;
    
    return {
      topPerformer: dashboard.rendimientoPorAsesor
        .sort((a, b) => b.ventasMes - a.ventasMes)[0],
      topMarket: dashboard.rendimientoPorMercado
        .sort((a, b) => b.ingresos - a.ingresos)[0],
      topEcosystem: dashboard.rendimientoPorEcosistema
        .sort((a, b) => b.ingresosMes - a.ingresosMes)[0],
      overallGrowth: dashboard.resumenGeneral.crecimientoVsMesAnterior
    };
  });

  constructor() {
    this.initializeService();
  }

  private initializeService() {
    // Update executive dashboard every 5 minutes
    interval(300000).pipe(
      filter(() => this.dashboardUpdateInterval$.value),
      switchMap(() => this.refreshExecutiveDashboard())
    ).subscribe();

    // Update real-time KPIs every 30 seconds
    interval(30000).pipe(
      filter(() => this.kpisUpdateInterval$.value),
      switchMap(() => this.refreshRealTimeKPIs())
    ).subscribe();

    // Load initial data
    this.loadInitialData();
    this.loadScheduledReports();
  }

  private loadInitialData() {
    this.refreshExecutiveDashboard();
    this.refreshRealTimeKPIs();
    this.loadSalesPredictions();
  }

  // ===== EXECUTIVE DASHBOARD =====
  refreshExecutiveDashboard(filters?: {
    fechaInicio?: string;
    fechaFin?: string;
    mercado?: 'aguascalientes' | 'edomex' | 'ambos';
    asesor?: string;
    ecosistema?: string;
  }): Observable<ExecutiveDashboard> {
    const defaultPeriod = {
      fechaInicio: this.getStartOfMonth(),
      fechaFin: this.getEndOfMonth(),
      ...filters
    };

    return this.odooApi.getDashboardEjecutivo(defaultPeriod).pipe(
      tap(dashboard => {
        this.executiveDashboard.set(dashboard);
        this.processAlerts(dashboard.alertas);
      }),
      catchError(error => {
        console.error('Error loading executive dashboard:', error);
        return of(this.generateMockDashboard());
      })
    );
  }

  private processAlerts(alerts: IntelligentAlert[]) {
    this.activeAlerts.set(alerts);
    
    // Send notifications for critical alerts
    const criticalAlerts = alerts.filter(alert => alert.prioridad === 'alta');
    criticalAlerts.forEach(alert => {
      this.triggerAlertNotification(alert);
    });
  }

  private triggerAlertNotification(alert: IntelligentAlert) {
    // Implementation would send notifications via email/WhatsApp
    console.log('Critical alert triggered:', alert.titulo);
  }

  // ===== REAL-TIME KPIS =====
  refreshRealTimeKPIs(): Observable<RealTimeKPIs> {
    return this.odooApi.getKPIsRealTime().pipe(
      tap(kpis => this.realTimeKPIs.set(kpis)),
      catchError(error => {
        console.error('Error loading real-time KPIs:', error);
        return of(this.generateMockKPIs());
      })
    );
  }

  // ===== SALES PREDICTIONS =====
  loadSalesPredictions(config?: {
    periodoPronostico?: number;
    mercado?: 'aguascalientes' | 'edomex' | 'ambos';
    modeloML?: 'linear' | 'polynomial' | 'arima' | 'prophet';
  }): void {
    const defaultConfig = {
      periodoPronostico: 6, // 6 months forecast
      mercado: 'ambos' as const,
      modeloML: 'prophet' as const,
      factoresExternos: {
        estacionalidad: true,
        tendenciaMercado: true,
        competencia: false,
        economia: true
      },
      ...config
    };

    this.odooApi.getPrediccionesVentas(defaultConfig).subscribe({
      next: (predictions) => {
        this.salesPredictions.set(predictions);
      },
      error: (error) => {
        console.error('Error loading sales predictions:', error);
        this.salesPredictions.set(this.generateMockPredictions());
      }
    });
  }

  // ===== AUTOMATED REPORTS =====
  scheduleAutomatedReport(config: ReportConfiguration): Observable<AutomatedReport> {
    return this.odooApi.generarReporteAutomatico(config).pipe(
      tap(report => {
        // Add to scheduled reports list
        const currentReports = this.scheduledReports();
        this.scheduledReports.set([...currentReports, config]);
        this.saveScheduledReports();
      })
    );
  }

  generateInstantReport(config: Omit<ReportConfiguration, 'frecuencia' | 'enviarAutomaticamente'>): Observable<AutomatedReport> {
    const instantConfig = {
      ...config,
      frecuencia: 'diario' as const,
      enviarAutomaticamente: true,
      diaEnvio: undefined as 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado' | 'domingo' | undefined
    };

    return this.odooApi.generarReporteAutomatico(instantConfig);
  }

  private loadScheduledReports(): void {
    const saved = localStorage.getItem('scheduledReports');
    if (saved) {
      this.scheduledReports.set(JSON.parse(saved));
    }
  }

  private saveScheduledReports(): void {
    localStorage.setItem('scheduledReports', JSON.stringify(this.scheduledReports()));
  }

  // ===== INTELLIGENT ALERTS =====
  configureIntelligentAlerts(alertConfigs: any[]): Observable<any> {
    return this.odooApi.configurarAlertasInteligentes(alertConfigs).pipe(
      tap(result => {
        console.log('Intelligent alerts configured:', result);
      })
    );
  }

  // ===== DATA EXPORT =====
  exportBusinessData(config: {
    formato: 'excel' | 'csv' | 'json' | 'pdf';
    datos: 'dashboard' | 'ventas' | 'clientes' | 'documentos' | 'pipeline' | 'ecosistemas';
    filtros: {
      fechaInicio: string;
      fechaFin: string;
      mercado?: string;
      asesor?: string;
    };
    incluirGraficos?: boolean;
    incluirResumen?: boolean;
  }): Observable<{
    exportId: string;
    url: string;
    tamano: number;
    registros: number;
    fechaGeneracion: string;
    validoHasta: string;
  }> {
    return this.odooApi.exportarDatos(config);
  }

  // ===== UTILITY METHODS =====
  pauseDashboardUpdates(): void {
    this.dashboardUpdateInterval$.next(false);
  }

  resumeDashboardUpdates(): void {
    this.dashboardUpdateInterval$.next(true);
  }

  pauseKPIsUpdates(): void {
    this.kpisUpdateInterval$.next(false);
  }

  resumeKPIsUpdates(): void {
    this.kpisUpdateInterval$.next(true);
  }

  private getStartOfMonth(): string {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }

  private getEndOfMonth(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 1, 0);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }

  // ===== MOCK DATA GENERATORS (for offline/demo) =====
  private generateMockDashboard(): ExecutiveDashboard {
    return {
      resumenGeneral: {
        ventasTotales: 127,
        ingresosTotales: 101530000,
        clientesNuevos: 34,
        clientesActivos: 312,
        unidadesVendidas: 127,
        ticketPromedio: 799000,
        crecimientoVsMesAnterior: 12.5,
        crecimientoVsAnoAnterior: 34.2
      },
      pipeline: {
        prospectos: {
          nuevos: 89,
          contactados: 67,
          cualificados: 45,
          convertidos: 34,
          tasaConversion: 38.2
        },
        expedientes: {
          nuevo: 23,
          proceso: 34,
          aprobado: 45,
          firmado: 28,
          completado: 127,
          tiempoPromedioComplecion: 18.5
        },
        documentos: {
          subidos: 456,
          validados: 398,
          rechazados: 23,
          pendientes: 35,
          tasaAprobacion: 87.3
        }
      },
      rendimientoPorAsesor: [
        {
          asesorId: 'asesor_1',
          asesorNombre: 'Carlos Mendoza',
          ventasMes: 23,
          ingresosMes: 18377000,
          clientesNuevos: 8,
          prospectos: 34,
          tasaConversion: 23.5,
          expedientesCompletados: 19,
          ranking: 1,
          metaMensual: 15000000,
          cumplimientoMeta: 122.5
        },
        {
          asesorId: 'asesor_2',
          asesorNombre: 'María González',
          ventasMes: 19,
          ingresosMes: 15181000,
          clientesNuevos: 6,
          prospectos: 28,
          tasaConversion: 21.4,
          expedientesCompletados: 16,
          ranking: 2,
          metaMensual: 15000000,
          cumplimientoMeta: 101.2
        }
      ],
      rendimientoPorMercado: [
        {
          mercado: 'aguascalientes',
          ventas: 67,
          ingresos: 53533000,
          clientes: 189,
          ecosistemas: 8,
          participacionMercado: 52.8,
          crecimiento: 18.3
        },
        {
          mercado: 'edomex',
          ventas: 60,
          ingresos: 47997000,
          clientes: 123,
          ecosistemas: 12,
          participacionMercado: 47.2,
          crecimiento: 8.7
        }
      ],
      rendimientoPorEcosistema: [
        {
          ecosistemaId: 'eco_ruta25',
          ecosistemaNombre: 'Ruta 25 Los Pinos',
          tipoEcosistema: 'ruta',
          clientesActivos: 45,
          ingresosMes: 35955000,
          gruposColectivos: 3,
          promedioTicket: 799000,
          eficienciaDocumental: 92.1
        }
      ],
      tendencias: {
        ventasPorMes: [
          { mes: 'Enero', ventas: 89, ingresos: 71111000 },
          { mes: 'Febrero', ventas: 76, ingresos: 60724000 },
          { mes: 'Marzo', ventas: 92, ingresos: 73508000 },
          { mes: 'Abril', ventas: 105, ingresos: 83895000 },
          { mes: 'Mayo', ventas: 127, ingresos: 101530000 }
        ],
        clientesPorMes: [
          { mes: 'Enero', nuevos: 28, activos: 245 },
          { mes: 'Febrero', nuevos: 24, activos: 269 },
          { mes: 'Marzo', nuevos: 31, activos: 300 },
          { mes: 'Abril', nuevos: 29, activos: 329 },
          { mes: 'Mayo', nuevos: 34, activos: 363 }
        ],
        conversionPorMes: [
          { mes: 'Enero', prospectos: 67, convertidos: 28, tasa: 41.8 },
          { mes: 'Febrero', prospectos: 59, convertidos: 24, tasa: 40.7 },
          { mes: 'Marzo', prospectos: 73, convertidos: 31, tasa: 42.5 },
          { mes: 'Abril', prospectos: 71, convertidos: 29, tasa: 40.8 },
          { mes: 'Mayo', prospectos: 89, convertidos: 34, tasa: 38.2 }
        ]
      },
      alertas: [
        {
          tipo: 'meta',
          prioridad: 'alta',
          titulo: 'Meta mensual en riesgo',
          descripcion: 'Aguascalientes está 15% por debajo de la meta mensual',
          metrica: 85,
          umbral: 100,
          asesor: 'asesor_3'
        }
      ]
    };
  }

  private generateMockKPIs(): RealTimeKPIs {
    return {
      timestamp: new Date().toISOString(),
      ventasHoy: 8,
      ingresosHoy: 6392000,
      prospectosHoy: 12,
      conversionesHoy: 3,
      documentosSubidos: 24,
      documentosValidados: 19,
      expedientesCompletados: 5,
      alertasActivas: 2,
      rendimientoEquipo: {
        asesorTop: {
          nombre: 'Carlos Mendoza',
          ventas: 3
        },
        ecosistemaTop: {
          nombre: 'Ruta 25 Los Pinos',
          ingresos: 2397000
        },
        metricaCritica: {
          nombre: 'Tasa de conversión',
          valor: 25.0,
          estado: 'atencion'
        }
      }
    };
  }

  private generateMockPredictions(): SalesPrediction {
    return {
      predicciones: [
        { mes: 'Junio 2024', ventasPredichas: 134, ingresosPredichos: 107066000, confianza: 87, rangoMinimo: 120, rangoMaximo: 148 },
        { mes: 'Julio 2024', ventasPredichas: 142, ingresosPredichos: 113458000, confianza: 84, rangoMinimo: 125, rangoMaximo: 159 },
        { mes: 'Agosto 2024', ventasPredichas: 156, ingresosPredichos: 124644000, confianza: 81, rangoMinimo: 135, rangoMaximo: 177 },
        { mes: 'Septiembre 2024', ventasPredichas: 149, ingresosPredichos: 119051000, confianza: 83, rangoMinimo: 130, rangoMaximo: 168 },
        { mes: 'Octubre 2024', ventasPredichas: 167, ingresosPredichos: 133433000, confianza: 79, rangoMinimo: 145, rangoMaximo: 189 },
        { mes: 'Noviembre 2024', ventasPredichas: 178, ingresosPredichos: 142222000, confianza: 76, rangoMinimo: 155, rangoMaximo: 201 }
      ],
      precision: {
        modeloUtilizado: 'Prophet',
        precisonHistorica: 87.3,
        factoresConsiderados: ['Estacionalidad', 'Tendencia de mercado', 'Economía'],
        ultimaActualizacion: new Date().toISOString()
      },
      recomendaciones: [
        {
          tipo: 'oportunidad',
          titulo: 'Incrementar inventario para Octubre',
          descripcion: 'Se prevé un aumento del 34% en ventas durante Octubre-Noviembre',
          impactoEstimado: 15,
          prioridad: 'alta'
        },
        {
          tipo: 'accion',
          titulo: 'Reforzar equipo comercial',
          descripcion: 'Contratar 2 asesores adicionales para manejar el crecimiento previsto',
          impactoEstimado: 8,
          prioridad: 'media'
        }
      ]
    };
  }

  // ===== PUBLIC UTILITY METHODS =====
  getTopPerformingAdvisor(): AdvisorPerformance | null {
    const dashboard = this.executiveDashboard();
    if (!dashboard || dashboard.rendimientoPorAsesor.length === 0) return null;
    
    return dashboard.rendimientoPorAsesor
      .sort((a, b) => b.ventasMes - a.ventasMes)[0];
  }

  getMarketComparison(): { leader: MarketPerformance; follower: MarketPerformance } | null {
    const dashboard = this.executiveDashboard();
    if (!dashboard || dashboard.rendimientoPorMercado.length < 2) return null;
    
    const markets = dashboard.rendimientoPorMercado
      .sort((a, b) => b.ingresos - a.ingresos);
    
    return {
      leader: markets[0],
      follower: markets[1]
    };
  }

  calculateTotalROI(): number {
    const dashboard = this.executiveDashboard();
    if (!dashboard) return 0;
    
    // Simple ROI calculation based on growth
    return dashboard.resumenGeneral.crecimientoVsMesAnterior;
  }

  getPredictedGrowthRate(): number {
    const predictions = this.salesPredictions();
    if (!predictions || predictions.predicciones.length < 2) return 0;
    
    const first = predictions.predicciones[0];
    const last = predictions.predicciones[predictions.predicciones.length - 1];
    
    return ((last.ingresosPredichos - first.ingresosPredichos) / first.ingresosPredichos) * 100;
  }
}