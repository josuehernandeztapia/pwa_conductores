import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CrmPipelineService, PipelineMetrics, PendingAction, AutomationRule } from '../../../services/crm-pipeline.service';
import { OdooProspecto } from '../../../services/odoo-api.service';

@Component({
  selector: 'app-crm-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="crm-pipeline-container">
      
      <!-- Header with metrics overview -->
      <div class="pipeline-header">
        <div class="header-left">
          <h2 class="pipeline-title">
            <span class="title-icon">📈</span>
            CRM Pipeline Automatizado
          </h2>
          <p class="pipeline-subtitle">Gestión inteligente de prospectos conectada a Odoo</p>
        </div>
        
        <div class="header-actions">
          <button 
            class="btn btn-primary"
            (click)="showCaptureForm.set(true)">
            <span class="btn-icon">➕</span>
            Capturar Prospecto
          </button>
          
          <button 
            class="btn btn-secondary"
            (click)="refreshData()">
            <span class="btn-icon">🔄</span>
            Actualizar
          </button>
          
          <div class="automation-toggle">
            <label class="toggle-label">
              <input 
                type="checkbox" 
                [checked]="automationEnabled()"
                (change)="toggleAutomation($event)">
              <span class="toggle-slider"></span>
              Automatización
            </label>
          </div>
        </div>
      </div>

      <!-- Pipeline Metrics Cards -->
      <div class="metrics-grid" *ngIf="pipelineMetrics()">
        <div class="metric-card prospects">
          <div class="metric-header">
            <span class="metric-icon">👥</span>
            <h3>Prospectos</h3>
          </div>
          <div class="metric-numbers">
            <div class="main-number">{{ pipelineMetrics()?.prospectos.nuevos || 0 }}</div>
            <div class="sub-metrics">
              <span class="sub-metric">
                <span class="dot contacted"></span>
                {{ pipelineMetrics()?.prospectos.contactados || 0 }} Contactados
              </span>
              <span class="sub-metric">
                <span class="dot qualified"></span>
                {{ pipelineMetrics()?.prospectos.cualificados || 0 }} Cualificados
              </span>
            </div>
          </div>
        </div>

        <div class="metric-card conversions">
          <div class="metric-header">
            <span class="metric-icon">🎯</span>
            <h3>Conversiones</h3>
          </div>
          <div class="metric-numbers">
            <div class="main-number">{{ pipelineMetrics()?.prospectos.convertidos || 0 }}</div>
            <div class="conversion-rate">
              {{ (pipelineMetrics()?.tasasConversion.globalConversion || 0) | number:'1.1-1' }}% Global
            </div>
          </div>
        </div>

        <div class="metric-card timing">
          <div class="metric-header">
            <span class="metric-icon">⏱️</span>
            <h3>Tiempo Promedio</h3>
          </div>
          <div class="metric-numbers">
            <div class="time-metrics">
              <span class="time-metric">
                <strong>{{ pipelineMetrics()?.tiemposPromedio.contactoInicial || 0 }}h</strong>
                <span>Contacto inicial</span>
              </span>
              <span class="time-metric">
                <strong>{{ pipelineMetrics()?.tiemposPromedio.conversion || 0 }}d</strong>
                <span>Conversión</span>
              </span>
            </div>
          </div>
        </div>

        <div class="metric-card actions">
          <div class="metric-header">
            <span class="metric-icon">⚡</span>
            <h3>Acciones Pendientes</h3>
          </div>
          <div class="metric-numbers">
            <div class="main-number">{{ pendingActions().length }}</div>
            <div class="priority-breakdown">
              <span class="priority alta">{{ highPriorityActions().length }} Alta</span>
              <span class="priority media">{{ mediumPriorityActions().length }} Media</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Tabs -->
      <div class="pipeline-tabs">
        <button 
          *ngFor="let tab of tabs"
          class="tab-button"
          [class.active]="activeTab() === tab.id"
          (click)="setActiveTab(tab.id)">
          <span class="tab-icon">{{ tab.icon }}</span>
          {{ tab.label }}
          <span *ngIf="tab.count" class="tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        
        <!-- Prospects Pipeline View -->
        <div *ngIf="activeTab() === 'pipeline'" class="pipeline-view">
          <div class="pipeline-stages">
            
            <div class="pipeline-stage nuevos">
              <div class="stage-header">
                <h3>🆕 Nuevos</h3>
                <span class="stage-count">{{ getProspectsByStage('nuevo').length }}</span>
              </div>
              <div class="prospects-list">
                <div 
                  *ngFor="let prospect of getProspectsByStage('nuevo')"
                  class="prospect-card nuevo">
                  <div class="prospect-header">
                    <strong>{{ prospect.nombre }}</strong>
                    <span class="prospect-score" [class]="getScoreClass(getProspectScore(prospect))">
                      {{ getProspectScore(prospect) }}
                    </span>
                  </div>
                  <div class="prospect-details">
                    <span class="prospect-phone">{{ prospect.telefono }}</span>
                    <span class="prospect-origin">{{ getOriginLabel(prospect.origenLead) }}</span>
                  </div>
                  <div class="prospect-actions">
                    <button class="action-btn contact" (click)="contactProspect(prospect.id)">
                      📞 Contactar
                    </button>
                    <button class="action-btn qualify" (click)="qualifyProspect(prospect.id)">
                      ✅ Cualificar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="pipeline-stage contactados">
              <div class="stage-header">
                <h3>📞 Contactados</h3>
                <span class="stage-count">{{ getProspectsByStage('contactado').length }}</span>
              </div>
              <div class="prospects-list">
                <div 
                  *ngFor="let prospect of getProspectsByStage('contactado')"
                  class="prospect-card contactado">
                  <div class="prospect-header">
                    <strong>{{ prospect.nombre }}</strong>
                    <span class="follow-up-date">{{ getNextFollowUp(prospect) }}</span>
                  </div>
                  <div class="prospect-details">
                    <span class="prospect-phone">{{ prospect.telefono }}</span>
                    <span class="prospect-interest">{{ getInterestLabel(prospect.tipoInteres) }}</span>
                  </div>
                  <div class="prospect-actions">
                    <button class="action-btn followup" (click)="scheduleFollowUp(prospect.id)">
                      ⏰ Seguimiento
                    </button>
                    <button class="action-btn qualify" (click)="qualifyProspect(prospect.id)">
                      ⬆️ Cualificar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="pipeline-stage cualificados">
              <div class="stage-header">
                <h3>⭐ Cualificados</h3>
                <span class="stage-count">{{ getProspectsByStage('cualificado').length }}</span>
              </div>
              <div class="prospects-list">
                <div 
                  *ngFor="let prospect of getProspectsByStage('cualificado')"
                  class="prospect-card cualificado">
                  <div class="prospect-header">
                    <strong>{{ prospect.nombre }}</strong>
                    <span class="ecosystem-tag" *ngIf="prospect.ecosistemaObjetivo">
                      {{ getEcosystemName(prospect.ecosistemaObjetivo) }}
                    </span>
                  </div>
                  <div class="prospect-details">
                    <span class="prospect-phone">{{ prospect.telefono }}</span>
                    <span class="prospect-market">{{ getMarketLabel(prospect.mercado) }}</span>
                  </div>
                  <div class="prospect-actions">
                    <button class="action-btn convert" (click)="convertProspect(prospect.id)">
                      🎯 Convertir
                    </button>
                    <button class="action-btn assign" (click)="assignToEcosystem(prospect.id)">
                      🏢 Asignar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="pipeline-stage convertidos">
              <div class="stage-header">
                <h3>🎉 Convertidos</h3>
                <span class="stage-count">{{ getProspectsByStage('convertido').length }}</span>
              </div>
              <div class="prospects-list">
                <div 
                  *ngFor="let prospect of getProspectsByStage('convertido')"
                  class="prospect-card convertido">
                  <div class="prospect-header">
                    <strong>{{ prospect.nombre }}</strong>
                    <span class="success-badge">✅ Cliente</span>
                  </div>
                  <div class="prospect-details">
                    <span class="conversion-date">{{ getConversionDate(prospect) }}</span>
                    <span class="assigned-advisor">{{ getAssignedAdvisor(prospect) }}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Pending Actions View -->
        <div *ngIf="activeTab() === 'actions'" class="actions-view">
          <div class="actions-header">
            <h3>⚡ Acciones Requeridas</h3>
            <div class="actions-filters">
              <select [(ngModel)]="selectedPriority" (change)="filterActionsByPriority()">
                <option value="">Todas las prioridades</option>
                <option value="alta">Alta prioridad</option>
                <option value="media">Media prioridad</option>
                <option value="baja">Baja prioridad</option>
              </select>
            </div>
          </div>

          <div class="actions-list">
            <div 
              *ngFor="let action of filteredActions()"
              class="action-item"
              [class]="action.prioridad">
              
              <div class="action-info">
                <div class="action-client">
                  <strong>{{ action.nombre }}</strong>
                  <span class="client-phone">{{ action.telefono }}</span>
                </div>
                <div class="action-details">
                  <span class="action-type">{{ getActionLabel(action.accionRequerida) }}</span>
                  <span class="action-deadline">⏰ {{ formatDeadline(action.tiempoLimite) }}</span>
                </div>
                <div class="action-context">{{ action.contexto }}</div>
              </div>

              <div class="action-controls">
                <div class="priority-indicator" [class]="action.prioridad">
                  {{ getPriorityLabel(action.prioridad) }}
                </div>
                <div class="score-indicator">
                  Score: {{ action.score }}
                </div>
                <button 
                  class="execute-action-btn"
                  [class]="action.accionRequerida"
                  (click)="executeAction(action)">
                  {{ getActionButtonLabel(action.accionRequerida) }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Automation Rules View -->
        <div *ngIf="activeTab() === 'automation'" class="automation-view">
          <div class="automation-header">
            <h3>🤖 Reglas de Automatización</h3>
            <button class="btn btn-primary" (click)="createAutomationRule()">
              ➕ Nueva Regla
            </button>
          </div>

          <div class="automation-rules">
            <div 
              *ngFor="let rule of automationRules()"
              class="rule-card"
              [class.active]="rule.activa">
              
              <div class="rule-header">
                <div class="rule-info">
                  <h4>{{ rule.nombre }}</h4>
                  <div class="rule-stats">
                    <span class="stat">{{ rule.estadisticas.ejecutada }} ejecutadas</span>
                    <span class="stat success">{{ rule.estadisticas.exitosa }} exitosas</span>
                    <span class="stat error">{{ rule.estadisticas.fallida }} fallidas</span>
                  </div>
                </div>
                
                <div class="rule-controls">
                  <label class="toggle-rule">
                    <input 
                      type="checkbox" 
                      [checked]="rule.activa"
                      (change)="toggleRule(rule.id, $event)">
                    <span class="toggle-slider"></span>
                  </label>
                  <button class="btn-icon edit" (click)="editRule(rule.id)">✏️</button>
                  <button class="btn-icon delete" (click)="deleteRule(rule.id)">🗑️</button>
                </div>
              </div>

              <div class="rule-conditions">
                <h5>Condiciones:</h5>
                <div class="condition-tags">
                  <span *ngIf="rule.condiciones.scoreMinimo" class="condition-tag">
                    Score ≥ {{ rule.condiciones.scoreMinimo }}
                  </span>
                  <span *ngIf="rule.condiciones.scoreMaximo" class="condition-tag">
                    Score ≤ {{ rule.condiciones.scoreMaximo }}
                  </span>
                  <span *ngIf="rule.condiciones.diasSinContacto" class="condition-tag">
                    {{ rule.condiciones.diasSinContacto }} días sin contacto
                  </span>
                </div>
              </div>

              <div class="rule-actions">
                <h5>Acciones:</h5>
                <div class="action-tags">
                  <span *ngFor="let accion of rule.acciones" class="action-tag">
                    {{ getAutomationActionLabel(accion.tipo) }}
                    <span *ngIf="accion.delay" class="delay">(+{{ accion.delay }}min)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Prospect Capture Modal -->
      <div *ngIf="showCaptureForm()" class="modal-overlay" (click)="closeModals()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>📝 Capturar Nuevo Prospecto</h3>
            <button class="close-btn" (click)="closeModals()">✕</button>
          </div>

          <form [formGroup]="captureForm" (ngSubmit)="submitProspectCapture()">
            <div class="form-grid">
              
              <div class="form-group">
                <label for="nombre">Nombre completo *</label>
                <input 
                  id="nombre"
                  type="text"
                  formControlName="nombre"
                  placeholder="Ej: Juan Pérez García">
              </div>

              <div class="form-group">
                <label for="telefono">Teléfono *</label>
                <input 
                  id="telefono"
                  type="tel"
                  formControlName="telefono"
                  placeholder="55 1234 5678">
              </div>

              <div class="form-group">
                <label for="email">Email</label>
                <input 
                  id="email"
                  type="email"
                  formControlName="email"
                  placeholder="juan.perez@email.com">
              </div>

              <div class="form-group">
                <label for="origen">Origen del lead *</label>
                <select id="origen" formControlName="origen">
                  <option value="">Seleccionar origen</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="web">Sitio Web</option>
                  <option value="referido">Referido</option>
                  <option value="evento">Evento</option>
                </select>
              </div>

              <div class="form-group">
                <label for="mercado">Mercado *</label>
                <select id="mercado" formControlName="mercado">
                  <option value="">Seleccionar mercado</option>
                  <option value="aguascalientes">Aguascalientes</option>
                  <option value="edomex">Estado de México</option>
                </select>
              </div>

              <div class="form-group">
                <label for="tipoInteres">Tipo de interés *</label>
                <select id="tipoInteres" formControlName="tipoInteres">
                  <option value="">Seleccionar tipo</option>
                  <option value="individual">Individual</option>
                  <option value="colectivo">Colectivo</option>
                </select>
              </div>

              <div class="form-group full-width">
                <label for="mensaje">Mensaje/Contexto</label>
                <textarea 
                  id="mensaje"
                  formControlName="mensaje"
                  rows="3"
                  placeholder="Información adicional del prospecto...">
                </textarea>
              </div>

            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="closeModals()">
                Cancelar
              </button>
              <button 
                type="submit" 
                class="btn btn-primary"
                [disabled]="captureForm.invalid || submitting()">
                <span *ngIf="submitting()" class="spinner"></span>
                {{ submitting() ? 'Capturando...' : '📝 Capturar Prospecto' }}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styleUrls: ['./crm-pipeline.component.scss']
})
export class CrmPipelineComponent implements OnInit {
  private crmService = inject(CrmPipelineService);
  private fb = inject(FormBuilder);

  // State signals
  activeTab = signal<'pipeline' | 'actions' | 'automation'>('pipeline');
  showCaptureForm = signal(false);
  submitting = signal(false);
  automationEnabled = signal(true);
  selectedPriority = '';

  // Data from service
  prospects = computed(() => this.crmService.allProspects());
  pipelineMetrics = computed(() => this.crmService.todayMetrics());
  pendingActions = computed(() => this.crmService.pendingActions());
  highPriorityActions = computed(() => this.crmService.highPriorityActions());
  automationRules = computed(() => this.crmService.automationRules());

  // Filtered data
  mediumPriorityActions = computed(() => 
    this.pendingActions().filter(a => a.prioridad === 'media')
  );

  filteredActions = computed(() => {
    if (!this.selectedPriority) return this.pendingActions();
    return this.pendingActions().filter(a => a.prioridad === this.selectedPriority);
  });

  // Form
  captureForm: FormGroup;

  // Tab configuration
  tabs = computed(() => [
    { 
      id: 'pipeline', 
      label: 'Pipeline', 
      icon: '📈',
      count: this.prospects().length
    },
    { 
      id: 'actions', 
      label: 'Acciones', 
      icon: '⚡',
      count: this.pendingActions().length
    },
    { 
      id: 'automation', 
      label: 'Automatización', 
      icon: '🤖',
      count: this.automationRules().filter(r => r.activa).length
    }
  ]);

  constructor() {
    this.captureForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      email: ['', [Validators.email]],
      origen: ['', Validators.required],
      mercado: ['', Validators.required],
      tipoInteres: ['', Validators.required],
      mensaje: ['']
    });
  }

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    this.crmService.refreshPipelineMetrics();
    this.crmService.loadPendingActions();
  }

  // Tab management
  setActiveTab(tab: 'pipeline' | 'actions' | 'automation') {
    this.activeTab.set(tab);
  }

  // Prospect management
  getProspectsByStage(stage: string): OdooProspecto[] {
    return this.prospects().filter(p => p.estado === stage);
  }

  getProspectScore(prospect: OdooProspecto): number {
    // Mock scoring logic - in real app this would come from the API
    let score = 50;
    if (prospect.origenLead === 'referido') score += 20;
    if (prospect.tipoInteres === 'colectivo') score += 15;
    if (prospect.email) score += 10;
    return Math.min(score, 100);
  }

  getScoreClass(score: number): string {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  // Prospect actions
  contactProspect(prospectoId: string) {
    this.crmService.executeFollowUp(prospectoId, {
      tipo: 'whatsapp',
      template: 'contacto_inicial'
    }).subscribe({
      next: (result) => {
        console.log('Contacto ejecutado:', result);
      }
    });
  }

  qualifyProspect(prospectoId: string) {
    this.crmService.updateProspectScore(prospectoId, {
      respondioWhatsApp: true,
      vistoSimulador: true
    }).subscribe({
      next: (result) => {
        console.log('Prospecto cualificado:', result);
      }
    });
  }

  scheduleFollowUp(prospectoId: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    this.crmService.executeFollowUp(prospectoId, {
      tipo: 'whatsapp',
      template: 'seguimiento_automatico',
      programadoPara: tomorrow.toISOString()
    }).subscribe({
      next: (result) => {
        console.log('Seguimiento programado:', result);
      }
    });
  }

  convertProspect(prospectoId: string) {
    // Implementation would call conversion service
    console.log('Converting prospect:', prospectoId);
  }

  assignToEcosystem(prospectoId: string) {
    // Implementation would show ecosystem assignment modal
    console.log('Assigning to ecosystem:', prospectoId);
  }

  // Prospect capture
  submitProspectCapture() {
    if (this.captureForm.valid) {
      this.submitting.set(true);
      
      const formData = this.captureForm.value;
      
      this.crmService.captureProspectAutomatic(formData).subscribe({
        next: (result) => {
          console.log('Prospecto capturado:', result);
          this.submitting.set(false);
          this.closeModals();
          this.captureForm.reset();
          this.refreshData();
        },
        error: (error) => {
          console.error('Error capturing prospect:', error);
          this.submitting.set(false);
        }
      });
    }
  }

  closeModals() {
    this.showCaptureForm.set(false);
  }

  // Actions management
  executeAction(action: PendingAction) {
    switch (action.accionRequerida) {
      case 'contactar_inmediato':
        this.contactProspect(action.id);
        break;
      case 'agendar_cita':
        this.scheduleFollowUp(action.id);
        break;
      case 'enviar_followup':
        this.scheduleFollowUp(action.id);
        break;
      case 'revisar_documentos':
        // Implementation for document review
        break;
    }
  }

  filterActionsByPriority() {
    // Computed property handles this automatically
  }

  // Automation management
  toggleAutomation(event: any) {
    const enabled = event.target.checked;
    this.automationEnabled.set(enabled);
    this.crmService.toggleAutomationEngine(enabled);
  }

  toggleRule(ruleId: string, event: any) {
    const enabled = event.target.checked;
    // Implementation would update rule status
    console.log('Toggling rule:', ruleId, enabled);
  }

  createAutomationRule() {
    // Implementation would show rule creation modal
    console.log('Creating automation rule');
  }

  editRule(ruleId: string) {
    console.log('Editing rule:', ruleId);
  }

  deleteRule(ruleId: string) {
    console.log('Deleting rule:', ruleId);
  }

  // Utility methods
  getOriginLabel(origin: string): string {
    const labels = {
      'whatsapp': '💬 WhatsApp',
      'web': '🌐 Web',
      'referido': '👥 Referido',
      'evento': '🎪 Evento'
    };
    return labels[origin as keyof typeof labels] || origin;
  }

  getInterestLabel(type: string): string {
    return type === 'colectivo' ? '👥 Colectivo' : '👤 Individual';
  }

  getMarketLabel(market: string): string {
    return market === 'aguascalientes' ? '🏛️ AGS' : '🏢 EDOMEX';
  }

  getEcosystemName(id: string): string {
    // Mock implementation - would get from ecosystem service
    return id === 'eco_ruta25' ? 'Ruta 25' : 'Cooperativa Norte';
  }

  getNextFollowUp(prospect: OdooProspecto): string {
    // Mock implementation
    return 'Mañana 10:00';
  }

  getConversionDate(prospect: OdooProspecto): string {
    return 'Hoy';
  }

  getAssignedAdvisor(prospect: OdooProspecto): string {
    return prospect.asesorAsignado || 'Sin asignar';
  }

  getActionLabel(action: string): string {
    const labels = {
      'contactar_inmediato': '📞 Contacto urgente',
      'agendar_cita': '📅 Agendar cita',
      'enviar_followup': '📧 Enviar seguimiento',
      'revisar_documentos': '📋 Revisar documentos'
    };
    return labels[action as keyof typeof labels] || action;
  }

  getActionButtonLabel(action: string): string {
    const labels = {
      'contactar_inmediato': '📞 Contactar',
      'agendar_cita': '📅 Agendar',
      'enviar_followup': '📧 Enviar',
      'revisar_documentos': '📋 Revisar'
    };
    return labels[action as keyof typeof labels] || 'Ejecutar';
  }

  getPriorityLabel(priority: string): string {
    const labels = {
      'alta': '🔴 Alta',
      'media': '🟡 Media',
      'baja': '🟢 Baja'
    };
    return labels[priority as keyof typeof labels] || priority;
  }

  formatDeadline(deadline: string): string {
    const date = new Date(deadline);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Urgente';
    if (hours < 24) return `En ${hours}h`;
    return `En ${Math.floor(hours / 24)}d`;
  }

  getAutomationActionLabel(action: string): string {
    const labels = {
      'enviar_whatsapp': '💬 WhatsApp',
      'enviar_email': '📧 Email',
      'agendar_llamada': '📞 Llamada',
      'asignar_asesor': '👤 Asignar',
      'mover_estado': '➡️ Mover',
      'descartar': '❌ Descartar'
    };
    return labels[action as keyof typeof labels] || action;
  }
}