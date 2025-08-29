import { Component, Input, Output, EventEmitter, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionStateService, SessionContext as ImportedSessionContext, SessionState as ImportedSessionState } from '../../../services/session-state.service';
import { ResponsiveLayoutService } from '../../../services/responsive-layout.service';
import { Subscription } from 'rxjs';

export type SessionState = 'exploration' | 'ready_to_formalize' | 'formalizing' | 'completed';
export type ControlAction = 'openSimulator' | 'showRequiredDocs' | 'saveAndContinue' | 'resetSession';

export interface SessionContext {
  productName?: string;
  monthlyPayment?: number;
  downPayment?: number;
  simulationComplete?: boolean;
  documentsReady?: boolean;
}

@Component({
  selector: 'app-advisor-control-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './advisor-control-panel.component.html',
  styleUrls: ['./advisor-control-panel.component.scss']
})
export class AdvisorControlPanelComponent implements OnInit, OnDestroy {
  private responsiveLayoutService = inject(ResponsiveLayoutService);
  private sessionStateService = inject(SessionStateService);
  
  @Input() context = signal<SessionContext>({});
  @Input() deviceType: 'mobile' | 'tablet' | 'desktop' = 'mobile';

  @Output() onAction = new EventEmitter<ControlAction>();
  @Output() onStateChange = new EventEmitter<SessionState>();
  
  private subscription = new Subscription();

  // Estados de sesión y herramientas disponibles
  private readonly SESSION_CONFIG = {
    exploration: {
      title: "Explorando opciones con el cliente",
      availableTools: ['simulator', 'cancel'],
      nextActions: ['show-documents', 'continue-exploring'],
      urgency: 'normal'
    },
    ready_to_formalize: {
      title: "✅ Listo para formalizar", 
      availableTools: ['simulator', 'documents', 'save', 'cancel'],
      urgency: 'high'
    },
    formalizing: {
      title: "Formalizando proceso",
      availableTools: ['documents', 'save'],
      urgency: 'high'
    },
    completed: {
      title: "🎉 Proceso completado",
      availableTools: ['cancel'], // Reset para nuevo cliente
      urgency: 'success'
    }
  } as const;

  // Computed properties using services
  protected readonly sessionState = computed(() => this.sessionStateService.sessionState());
  protected readonly sessionContext = computed(() => this.sessionStateService.sessionContext());
  protected readonly currentStateConfig = computed(() => this.sessionStateService.currentStateConfig());
  protected readonly responsiveClasses = computed(() => this.responsiveLayoutService.responsiveClassString());
  protected readonly deviceTypeFromService = computed(() => this.responsiveLayoutService.deviceType());
  
  protected readonly isCompact = computed(() => 
    this.responsiveLayoutService.isMobile() || this.responsiveLayoutService.isCompactLayout()
  );
  
  protected readonly currentStateTitle = computed(() => 
    this.currentStateConfig().title
  );

  protected readonly statusClass = computed(() => {
    const urgency = this.currentStateConfig().urgency;
    return `status-${urgency}`;
  });

  protected readonly panelClasses = computed(() => {
    const baseClasses = 'advisor-control-panel';
    const deviceClass = `device-${this.deviceTypeFromService()}`;
    const stateClass = `state-${this.sessionState()}`;
    const responsiveClass = this.responsiveClasses();
    
    return `${baseClasses} ${deviceClass} ${stateClass} ${responsiveClass}`;
  });

  ngOnInit(): void {
    // Subscribe to session state changes
    this.subscription.add(
      this.sessionStateService.stateChange$.subscribe(change => {
        if (change) {
          this.onStateChange.emit(change.currentState);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // Determinar qué herramientas están disponibles
  protected isToolAvailable(tool: string): boolean {
    return this.sessionStateService.isToolAvailable(tool);
  }

  // Manejar acciones del asesor
  protected handleAction(action: ControlAction): void {
    // Para reset/cancel, confirmar primero
    if (action === 'resetSession') {
      const confirmed = confirm('¿Está seguro de cancelar la sesión actual?');
      if (!confirmed) return;
    }

    this.onAction.emit(action);
    
    // Delegar al servicio de estado para manejar transiciones
    switch (action) {
      case 'openSimulator':
        this.sessionStateService.transitionTo('exploration', 'User opened simulator');
        break;
        
      case 'saveAndContinue':
        if (this.sessionState() === 'ready_to_formalize') {
          this.sessionStateService.transitionTo('formalizing', 'User chose to save and continue');
        }
        break;
        
      case 'resetSession':
        this.sessionStateService.resetSession();
        break;
    }
  }

  // Actualizar contexto desde componente padre
  updateContext(newContext: Partial<SessionContext>): void {
    this.sessionStateService.updateContext(newContext);
  }
}