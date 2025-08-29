import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, BehaviorSubject, interval, of, timer } from 'rxjs';
import { map, tap, catchError, switchMap, filter, debounceTime } from 'rxjs/operators';
import { OdooApiService, OdooProspecto } from './odoo-api.service';

// CRM Pipeline Types
export interface ProspectScore {
  total: number;
  origen: number;
  interes: number;
  interaccion: number;
  urgencia: number;
  calidad: number;
}

export interface ProspectActivity {
  id: string;
  prospectoId: string;
  tipo: 'captura' | 'contacto' | 'seguimiento' | 'interaccion' | 'conversion' | 'descarte';
  descripcion: string;
  timestamp: Date;
  asesorId?: string;
  automatico: boolean;
  datos?: any;
}

export interface AutomationRule {
  id: string;
  nombre: string;
  activa: boolean;
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
    delay?: number;
  }[];
  estadisticas: {
    ejecutada: number;
    exitosa: number;
    fallida: number;
  };
}

export interface PipelineMetrics {
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
}

export interface PendingAction {
  id: string;
  nombre: string;
  telefono: string;
  score: number;
  accionRequerida: 'contactar_inmediato' | 'agendar_cita' | 'enviar_followup' | 'revisar_documentos';
  prioridad: 'alta' | 'media' | 'baja';
  tiempoLimite: string;
  contexto: string;
}

@Injectable({
  providedIn: 'root'
})
export class CrmPipelineService {
  private odooApi = inject(OdooApiService);
  
  // State signals
  private prospects = signal<OdooProspecto[]>([]);
  private pipelineMetrics = signal<PipelineMetrics | null>(null);
  private pendingActions = signal<PendingAction[]>([]);
  private automationRules = signal<AutomationRule[]>([]);
  private activities = signal<ProspectActivity[]>([]);
  
  // Computed signals
  allProspects = computed(() => this.prospects());
  highPriorityActions = computed(() => 
    this.pendingActions().filter(a => a.prioridad === 'alta')
  );
  todayMetrics = computed(() => this.pipelineMetrics());
  activeRules = computed(() => 
    this.automationRules().filter(r => r.activa)
  );
  recentActivities = computed(() => 
    this.activities().slice(0, 10)
  );

  // Automation engine
  private automationEngine$ = new BehaviorSubject<boolean>(true);
  private scoringEngine$ = new BehaviorSubject<boolean>(true);

  constructor() {
    this.initializeAutomation();
    this.loadInitialData();
  }

  private initializeAutomation() {
    // Run automation engine every 2 minutes
    interval(120000).pipe(
      filter(() => this.automationEngine$.value),
      switchMap(() => this.executeAutomationRules())
    ).subscribe();

    // Update pipeline metrics every 5 minutes
    interval(300000).subscribe(() => {
      this.refreshPipelineMetrics();
    });

    // Load pending actions every minute
    interval(60000).subscribe(() => {
      this.loadPendingActions();
    });
  }

  private loadInitialData() {
    this.refreshProspects();
    this.refreshPipelineMetrics();
    this.loadPendingActions();
    this.loadAutomationRules();
  }

  // ===== PROSPECT CAPTURE & MANAGEMENT =====
  captureProspectAutomatic(datos: {
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
    return this.odooApi.capturaProspectoAutomatica(datos).pipe(
      tap(result => {
        // Log activity
        this.addActivity({
          prospectoId: result.prospectoId,
          tipo: 'captura',
          descripcion: `Nuevo prospecto capturado: ${datos.nombre} (${datos.origen})`,
          timestamp: new Date(),
          automatico: true,
          datos: { score: result.score, recomendacion: result.recomendacion }
        });

        // Refresh data
        this.refreshProspects();
        this.loadPendingActions();
      }),
      catchError(error => {
        console.error('Error capturing prospect:', error);
        // Fallback to local storage if API fails
        return this.captureProspectOffline(datos);
      })
    );
  }

  private captureProspectOffline(datos: any): Observable<any> {
    const offlineProspect = {
      prospectoId: `offline_${Date.now()}`,
      score: this.calculateOfflineScore(datos),
      recomendacion: 'agendar_seguimiento' as const
    };

    // Store for later sync
    const offlineQueue = JSON.parse(localStorage.getItem('offlineProspects') || '[]');
    offlineQueue.push({ ...datos, timestamp: new Date().toISOString() });
    localStorage.setItem('offlineProspects', JSON.stringify(offlineQueue));

    return of(offlineProspect);
  }

  private calculateOfflineScore(datos: any): number {
    let score = 50; // Base score
    
    // Origin scoring
    const origenScores = {
      'referido': 20,
      'whatsapp': 15,
      'web': 10,
      'evento': 25
    };
    score += origenScores[datos.origen as keyof typeof origenScores] || 0;

    // Interest type scoring
    if (datos.tipoInteres === 'colectivo') score += 15;
    
    // Has email
    if (datos.email) score += 10;
    
    // Has message/context
    if (datos.mensaje && datos.mensaje.length > 20) score += 10;

    return Math.min(score, 100);
  }

  updateProspectScore(prospectoId: string, interacciones: {
    respondioWhatsApp?: boolean;
    vistoSimulador?: boolean;
    descargoDocumentos?: boolean;
    asistioCita?: boolean;
    tiempoEnSitio?: number;
    paginasVistas?: number;
  }): Observable<{
    nuevoScore: number;
    recomendacion: string;
    proximaAccion: string;
  }> {
    return this.odooApi.actualizarScoreProspecto(prospectoId, interacciones).pipe(
      tap(result => {
        this.addActivity({
          prospectoId,
          tipo: 'interaccion',
          descripcion: `Score actualizado: ${result.nuevoScore}/100. ${result.recomendacion}`,
          timestamp: new Date(),
          automatico: true,
          datos: { interacciones, nuevoScore: result.nuevoScore }
        });

        this.refreshProspects();
        this.loadPendingActions();
      }),
      catchError(error => {
        console.error('Error updating prospect score:', error);
        return of({ nuevoScore: 0, recomendacion: '', proximaAccion: '' });
      })
    );
  }

  executeFollowUp(prospectoId: string, accion: {
    tipo: 'whatsapp' | 'email' | 'llamada';
    template: string;
    programadoPara?: string;
    asesorId?: string;
  }): Observable<{
    success: boolean;
    mensajeEnviado: boolean;
    proximoSeguimiento: string;
  }> {
    return this.odooApi.ejecutarSeguimientoAutomatico(prospectoId, accion).pipe(
      tap(result => {
        this.addActivity({
          prospectoId,
          tipo: 'seguimiento',
          descripcion: `Seguimiento ${accion.tipo} ${result.mensajeEnviado ? 'enviado' : 'programado'}`,
          timestamp: new Date(),
          asesorId: accion.asesorId,
          automatico: !accion.asesorId,
          datos: { accion, resultado: result }
        });

        this.refreshProspects();
        this.loadPendingActions();
      }),
      catchError(error => {
        console.error('Error executing follow-up:', error);
        return of({ success: false, mensajeEnviado: false, proximoSeguimiento: '' });
      })
    );
  }

  // ===== PIPELINE METRICS & ANALYTICS =====
  refreshPipelineMetrics(filtros?: {
    asesor?: string;
    mercado?: string;
    periodo?: 'dia' | 'semana' | 'mes';
  }): void {
    this.odooApi.getPipelineMetrics(filtros).subscribe({
      next: (metrics) => {
        this.pipelineMetrics.set(metrics);
      },
      error: (error) => {
        console.error('Error loading pipeline metrics:', error);
      }
    });
  }

  loadPendingActions(asesorId?: string): void {
    this.odooApi.getProspectosConAccionesPendientes(asesorId).subscribe({
      next: (actions) => {
        this.pendingActions.set(actions);
      },
      error: (error) => {
        console.error('Error loading pending actions:', error);
      }
    });
  }

  // ===== AUTOMATION ENGINE =====
  private executeAutomationRules(): Observable<any> {
    return this.odooApi.getProspectosConAccionesPendientes().pipe(
      switchMap(pendingActions => {
        const rules = this.activeRules();
        const executions = pendingActions.map(action => 
          this.applyRulesToProspect(action, rules)
        );
        
        return Promise.all(executions);
      }),
      catchError(error => {
        console.error('Automation engine error:', error);
        return of([]);
      })
    );
  }

  private async applyRulesToProspect(prospect: any, rules: AutomationRule[]) {
    for (const rule of rules) {
      if (this.prospectMatchesConditions(prospect, rule.condiciones)) {
        await this.executeRuleActions(prospect.id, rule);
      }
    }
  }

  private prospectMatchesConditions(prospect: any, condiciones: any): boolean {
    if (condiciones.scoreMinimo && prospect.score < condiciones.scoreMinimo) return false;
    if (condiciones.scoreMaximo && prospect.score > condiciones.scoreMaximo) return false;
    // Add more condition checks as needed
    return true;
  }

  private async executeRuleActions(prospectoId: string, rule: AutomationRule) {
    for (const accion of rule.acciones) {
      if (accion.delay) {
        await timer(accion.delay * 60000).toPromise(); // Convert minutes to milliseconds
      }

      switch (accion.tipo) {
        case 'enviar_whatsapp':
          this.executeFollowUp(prospectoId, {
            tipo: 'whatsapp',
            template: accion.parametros.template
          }).subscribe();
          break;
        
        case 'enviar_email':
          this.executeFollowUp(prospectoId, {
            tipo: 'email',
            template: accion.parametros.template
          }).subscribe();
          break;

        case 'agendar_llamada':
          this.executeFollowUp(prospectoId, {
            tipo: 'llamada',
            template: 'llamada_seguimiento',
            programadoPara: accion.parametros.programadoPara,
            asesorId: accion.parametros.asesorId
          }).subscribe();
          break;
      }
    }
  }

  loadAutomationRules(): void {
    // Load from local storage or API
    const storedRules = localStorage.getItem('automationRules');
    if (storedRules) {
      this.automationRules.set(JSON.parse(storedRules));
    } else {
      this.generateDefaultRules();
    }
  }

  private generateDefaultRules(): void {
    const defaultRules: AutomationRule[] = [
      {
        id: 'rule_1',
        nombre: 'Contacto Inmediato - Score Alto',
        activa: true,
        condiciones: {
          scoreMinimo: 80
        },
        acciones: [
          {
            tipo: 'enviar_whatsapp',
            parametros: { template: 'bienvenida_premium' },
            delay: 0
          },
          {
            tipo: 'agendar_llamada',
            parametros: { asesorId: 'auto_assign' },
            delay: 30
          }
        ],
        estadisticas: { ejecutada: 0, exitosa: 0, fallida: 0 }
      },
      {
        id: 'rule_2',
        nombre: 'Seguimiento Colectivo',
        activa: true,
        condiciones: {
          scoreMinimo: 60,
          scoreMaximo: 79
        },
        acciones: [
          {
            tipo: 'enviar_whatsapp',
            parametros: { template: 'info_colectivo' },
            delay: 60
          }
        ],
        estadisticas: { ejecutada: 0, exitosa: 0, fallida: 0 }
      },
      {
        id: 'rule_3',
        nombre: 'Nurturing Score Bajo',
        activa: true,
        condiciones: {
          scoreMaximo: 59
        },
        acciones: [
          {
            tipo: 'enviar_email',
            parametros: { template: 'educativo_general' },
            delay: 1440 // 24 horas
          }
        ],
        estadisticas: { ejecutada: 0, exitosa: 0, fallida: 0 }
      }
    ];

    this.automationRules.set(defaultRules);
    localStorage.setItem('automationRules', JSON.stringify(defaultRules));
  }

  saveAutomationRule(rule: AutomationRule): Observable<any> {
    return this.odooApi.configurarReglasAutomatizacion(rule).pipe(
      tap(result => {
        const currentRules = this.automationRules();
        const existingIndex = currentRules.findIndex(r => r.id === rule.id);
        
        if (existingIndex >= 0) {
          currentRules[existingIndex] = rule;
        } else {
          currentRules.push(rule);
        }
        
        this.automationRules.set([...currentRules]);
        localStorage.setItem('automationRules', JSON.stringify(currentRules));
      })
    );
  }

  // ===== UTILITY METHODS =====
  private refreshProspects(): void {
    this.odooApi.getProspectos().subscribe({
      next: (prospects) => {
        this.prospects.set(prospects);
      },
      error: (error) => {
        console.error('Error loading prospects:', error);
      }
    });
  }

  private addActivity(activity: Omit<ProspectActivity, 'id'>): void {
    const newActivity: ProspectActivity = {
      ...activity,
      id: `activity_${Date.now()}`
    };
    
    const currentActivities = this.activities();
    this.activities.set([newActivity, ...currentActivities.slice(0, 49)]); // Keep last 50
  }

  // Public methods for components
  toggleAutomationEngine(enabled: boolean): void {
    this.automationEngine$.next(enabled);
  }

  getProspectsByStage(stage: string): OdooProspecto[] {
    return this.prospects().filter(p => p.estado === stage);
  }

  getConversionRate(from: string, to: string): number {
    const metrics = this.pipelineMetrics();
    if (!metrics) return 0;
    
    // Calculate conversion rate based on metrics
    return metrics.tasasConversion.globalConversion;
  }

  exportPipelineData(): any {
    return {
      prospects: this.prospects(),
      metrics: this.pipelineMetrics(),
      activities: this.activities(),
      automationRules: this.automationRules(),
      exportDate: new Date().toISOString()
    };
  }
}