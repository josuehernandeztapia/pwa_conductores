import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type SessionState = 'exploration' | 'ready_to_formalize' | 'formalizing' | 'completed';
export type SessionEvent = 'simulation_completed' | 'documents_uploaded' | 'documents_validated' | 'process_saved' | 'session_reset';

export interface SessionContext {
  clientId?: string;
  clientName?: string;
  productName?: string;
  monthlyPayment?: number;
  downPayment?: number;
  simulationComplete?: boolean;
  documentsUploaded?: boolean;
  documentsValidated?: boolean;
  documentsReady?: boolean;
  currentStep?: string;
  completionPercentage?: number;
  lastActivity?: Date;
  market?: 'aguascalientes' | 'edomex';
  product?: 'venta-directa' | 'venta-plazo' | 'ahorro-programado';
}

export interface SessionStateConfig {
  title: string;
  description: string;
  availableTools: string[];
  nextActions: string[];
  urgency: 'low' | 'normal' | 'high' | 'critical' | 'success';
  autoTransitions?: {
    event: SessionEvent;
    targetState: SessionState;
    conditions?: (context: SessionContext) => boolean;
  }[];
  validationRules?: {
    canEnter: (context: SessionContext) => boolean;
    canExit: (context: SessionContext) => boolean;
    requiredFields?: (keyof SessionContext)[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class SessionStateService {
  private readonly SESSION_STATES: Record<SessionState, SessionStateConfig> = {
    exploration: {
      title: "🔍 Explorando opciones con el cliente",
      description: "Presentando productos y simulando diferentes opciones para encontrar la mejor solución",
      availableTools: ['simulator', 'product-catalog', 'calculator', 'reset'],
      nextActions: [
        'Abrir simulador para explorar opciones',
        'Mostrar catálogo de productos',
        'Realizar cálculos personalizados'
      ],
      urgency: 'normal',
      autoTransitions: [
        {
          event: 'simulation_completed',
          targetState: 'ready_to_formalize',
          conditions: (ctx) => !!ctx.simulationComplete && !!ctx.productName
        }
      ],
      validationRules: {
        canEnter: () => true,
        canExit: (ctx) => !!ctx.clientId
      }
    },

    ready_to_formalize: {
      title: "✅ Listo para formalizar",
      description: "Cliente satisfecho con la simulación. Proceder con documentación y formalización",
      availableTools: ['simulator', 'documents', 'document-templates', 'whatsapp', 'save', 'reset'],
      nextActions: [
        'Solicitar documentos requeridos',
        'Enviar lista por WhatsApp',
        'Continuar con formalización',
        'Ajustar simulación si es necesario'
      ],
      urgency: 'high',
      autoTransitions: [
        {
          event: 'documents_uploaded',
          targetState: 'formalizing',
          conditions: (ctx) => !!ctx.documentsUploaded
        }
      ],
      validationRules: {
        canEnter: (ctx) => !!ctx.simulationComplete && !!ctx.productName,
        canExit: (ctx) => !!ctx.documentsUploaded || !!ctx.documentsReady,
        requiredFields: ['clientId', 'productName', 'monthlyPayment']
      }
    },

    formalizing: {
      title: "📋 Formalizando proceso",
      description: "Validando documentos y completando el proceso de formalización",
      availableTools: ['documents', 'document-validation', 'ai-quality-check', 'digital-signature', 'save'],
      nextActions: [
        'Validar documentos cargados',
        'Ejecutar verificación con IA',
        'Solicitar firma digital',
        'Completar formalización'
      ],
      urgency: 'critical',
      autoTransitions: [
        {
          event: 'documents_validated',
          targetState: 'completed',
          conditions: (ctx) => !!ctx.documentsValidated && ctx.completionPercentage === 100
        }
      ],
      validationRules: {
        canEnter: (ctx) => !!ctx.documentsUploaded,
        canExit: (ctx) => !!ctx.documentsValidated,
        requiredFields: ['clientId', 'documentsUploaded']
      }
    },

    completed: {
      title: "🎉 Proceso completado",
      description: "Cliente procesado exitosamente. Listo para nuevo cliente",
      availableTools: ['celebration', 'summary', 'new-client', 'export-data'],
      nextActions: [
        'Mostrar resumen final',
        'Exportar datos del proceso',
        'Iniciar con nuevo cliente',
        'Enviar confirmación'
      ],
      urgency: 'success',
      validationRules: {
        canEnter: (ctx) => !!ctx.documentsValidated,
        canExit: () => true
      }
    }
  };

  // Reactive state management
  private readonly _sessionState = signal<SessionState>('exploration');
  private readonly _sessionContext = signal<SessionContext>({});
  private readonly _sessionHistory = signal<Array<{state: SessionState; timestamp: Date; context: SessionContext}>>([]);
  
  // Observables for external components
  private readonly _stateChange$ = new BehaviorSubject<{
    previousState: SessionState;
    currentState: SessionState;
    context: SessionContext;
  } | null>(null);

  // Public getters
  readonly sessionState = this._sessionState.asReadonly();
  readonly sessionContext = this._sessionContext.asReadonly();
  readonly sessionHistory = this._sessionHistory.asReadonly();
  readonly stateChange$ = this._stateChange$.asObservable();

  // Computed properties
  readonly currentStateConfig = computed(() => 
    this.SESSION_STATES[this._sessionState()]
  );

  readonly availableTools = computed(() => 
    this.currentStateConfig().availableTools
  );

  readonly nextActions = computed(() => 
    this.currentStateConfig().nextActions
  );

  readonly urgencyLevel = computed(() => 
    this.currentStateConfig().urgency
  );

  readonly canTransitionTo = computed(() => {
    const currentContext = this._sessionContext();
    return (targetState: SessionState) => {
      const targetConfig = this.SESSION_STATES[targetState];
      return targetConfig.validationRules?.canEnter?.(currentContext) ?? true;
    };
  });

  readonly completionPercentage = computed(() => {
    const context = this._sessionContext();
    const state = this._sessionState();
    
    let percentage = 0;
    
    switch (state) {
      case 'exploration':
        percentage = context.simulationComplete ? 25 : 10;
        break;
      case 'ready_to_formalize':
        percentage = 50;
        if (context.documentsReady) percentage = 60;
        break;
      case 'formalizing':
        percentage = 75;
        if (context.documentsValidated) percentage = 90;
        break;
      case 'completed':
        percentage = 100;
        break;
    }
    
    return percentage;
  });

  readonly sessionDuration = computed(() => {
    const history = this._sessionHistory();
    if (history.length === 0) return 0;
    
    const start = history[0].timestamp;
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / 1000 / 60); // minutes
  });

  // State management methods
  transitionTo(targetState: SessionState, reason?: string): boolean {
    const currentState = this._sessionState();
    const currentContext = this._sessionContext();
    
    // Validate transition
    if (!this.canTransitionTo()(targetState)) {
      console.warn(`Cannot transition from ${currentState} to ${targetState}`, {
        context: currentContext,
        reason: 'Validation failed'
      });
      return false;
    }

    // Check exit conditions for current state
    const currentConfig = this.SESSION_STATES[currentState];
    if (currentConfig.validationRules?.canExit && 
        !currentConfig.validationRules.canExit(currentContext)) {
      console.warn(`Cannot exit current state ${currentState}`, {
        context: currentContext,
        reason: 'Exit validation failed'
      });
      return false;
    }

    // Perform transition
    const previousState = currentState;
    this._sessionState.set(targetState);
    
    // Update history
    this.addToHistory(targetState, currentContext);
    
    // Emit state change
    this._stateChange$.next({
      previousState,
      currentState: targetState,
      context: currentContext
    });

    console.log(`Session state transitioned: ${previousState} → ${targetState}`, {
      reason,
      context: currentContext,
      duration: this.sessionDuration()
    });

    return true;
  }

  updateContext(updates: Partial<SessionContext>, autoTransition = true): void {
    const currentContext = this._sessionContext();
    const newContext = { ...currentContext, ...updates, lastActivity: new Date() };
    
    this._sessionContext.set(newContext);
    
    // Check for auto-transitions
    if (autoTransition) {
      this.checkAutoTransitions(newContext);
    }

    console.log('Session context updated', {
      updates,
      newContext,
      completionPercentage: this.completionPercentage()
    });
  }

  processEvent(event: SessionEvent, eventData?: any): void {
    const currentState = this._sessionState();
    const currentContext = this._sessionContext();
    
    console.log(`Processing session event: ${event}`, {
      currentState,
      eventData
    });

    // Update context based on event
    let contextUpdates: Partial<SessionContext> = {};
    
    switch (event) {
      case 'simulation_completed':
        contextUpdates = {
          simulationComplete: true,
          productName: eventData?.productName,
          monthlyPayment: eventData?.monthlyPayment,
          downPayment: eventData?.downPayment
        };
        break;
      case 'documents_uploaded':
        contextUpdates = {
          documentsUploaded: true,
          documentsReady: eventData?.allRequired || false
        };
        break;
      case 'documents_validated':
        contextUpdates = {
          documentsValidated: true,
          completionPercentage: 100
        };
        break;
      case 'process_saved':
        contextUpdates = {
          lastActivity: new Date()
        };
        break;
      case 'session_reset':
        this.resetSession();
        return;
    }

    if (Object.keys(contextUpdates).length > 0) {
      this.updateContext(contextUpdates);
    }

    // Check for auto-transitions after event
    this.checkAutoTransitions(this._sessionContext());
  }

  resetSession(): void {
    const previousState = this._sessionState();
    
    this._sessionState.set('exploration');
    this._sessionContext.set({
      lastActivity: new Date()
    });
    
    // Clear history but keep one entry for the reset
    this.addToHistory('exploration', this._sessionContext());
    
    this._stateChange$.next({
      previousState,
      currentState: 'exploration',
      context: this._sessionContext()
    });

    console.log('Session reset to initial state');
  }

  private checkAutoTransitions(context: SessionContext): void {
    const currentState = this._sessionState();
    const currentConfig = this.SESSION_STATES[currentState];
    
    if (!currentConfig.autoTransitions) return;

    for (const autoTransition of currentConfig.autoTransitions) {
      if (autoTransition.conditions && autoTransition.conditions(context)) {
        console.log(`Auto-transitioning due to conditions met`, {
          from: currentState,
          to: autoTransition.targetState,
          trigger: autoTransition.event
        });
        
        this.transitionTo(autoTransition.targetState, `Auto-transition: ${autoTransition.event}`);
        break; // Only one auto-transition per context update
      }
    }
  }

  private addToHistory(state: SessionState, context: SessionContext): void {
    const history = this._sessionHistory();
    const newEntry = {
      state,
      timestamp: new Date(),
      context: { ...context }
    };
    
    // Keep last 50 entries
    const updatedHistory = [...history, newEntry].slice(-50);
    this._sessionHistory.set(updatedHistory);
  }

  // Utility methods
  isToolAvailable(tool: string): boolean {
    const availableTools = this.availableTools();
    const context = this._sessionContext();
    
    // Basic availability check
    if (!availableTools.includes(tool)) return false;
    
    // Tool-specific conditions
    switch (tool) {
      case 'documents':
        return !!context.simulationComplete;
      case 'save':
        return !!context.documentsReady || !!context.simulationComplete;
      case 'document-validation':
        return !!context.documentsUploaded;
      case 'digital-signature':
        return !!context.documentsValidated;
      case 'new-client':
        return this._sessionState() === 'completed';
      default:
        return true;
    }
  }

  getStateProgress(): { completed: SessionState[]; current: SessionState; pending: SessionState[] } {
    const allStates: SessionState[] = ['exploration', 'ready_to_formalize', 'formalizing', 'completed'];
    const currentState = this._sessionState();
    const currentIndex = allStates.indexOf(currentState);
    
    return {
      completed: allStates.slice(0, currentIndex),
      current: currentState,
      pending: allStates.slice(currentIndex + 1)
    };
  }

  exportSessionData(): any {
    return {
      sessionState: this._sessionState(),
      sessionContext: this._sessionContext(),
      sessionHistory: this._sessionHistory(),
      completionPercentage: this.completionPercentage(),
      sessionDuration: this.sessionDuration(),
      exportedAt: new Date().toISOString()
    };
  }
}