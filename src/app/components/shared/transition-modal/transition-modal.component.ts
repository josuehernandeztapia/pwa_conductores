import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionContext } from '../../../services/session-state.service';

export type TransitionType = 'simulator-to-documents' | 'documents-to-formalization' | 'formalization-to-completion';
export type ModalAction = 'proceed' | 'edit_simulation' | 'cancel' | 'send_whatsapp' | 'upload_documents';

export interface TransitionData {
  type: TransitionType;
  context: SessionContext;
  requiredDocuments?: string[];
  whatsappTemplate?: string;
  estimatedTime?: number;
}

@Component({
  selector: 'app-transition-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transition-modal.component.html',
  styleUrls: ['./transition-modal.component.scss']
})
export class TransitionModalComponent {
  @Input() isVisible = signal<boolean>(false);
  @Input() transitionData = signal<TransitionData | null>(null);
  
  @Output() onAction = new EventEmitter<{ action: ModalAction; data?: any }>();
  @Output() onClose = new EventEmitter<void>();

  // Computed properties
  protected readonly modalTitle = computed(() => {
    const type = this.transitionData()?.type;
    switch (type) {
      case 'simulator-to-documents':
        return '🎯 Simulación Lista';
      case 'documents-to-formalization':
        return '📋 Documentos Completos';
      case 'formalization-to-completion':
        return '🎉 Proceso Completado';
      default:
        return 'Transición';
    }
  });

  protected readonly modalSubtitle = computed(() => {
    const type = this.transitionData()?.type;
    switch (type) {
      case 'simulator-to-documents':
        return 'Cliente satisfecho con la simulación. Procedamos con los documentos.';
      case 'documents-to-formalization':
        return 'Todos los documentos recibidos. Listo para formalizar el proceso.';
      case 'formalization-to-completion':
        return 'El expediente ha sido procesado exitosamente.';
      default:
        return '';
    }
  });

  protected readonly currentStep = computed(() => {
    const type = this.transitionData()?.type;
    switch (type) {
      case 'simulator-to-documents':
        return 1;
      case 'documents-to-formalization':
        return 2;
      case 'formalization-to-completion':
        return 3;
      default:
        return 1;
    }
  });

  protected readonly modalClasses = computed(() => {
    const type = this.transitionData()?.type;
    return `modal-${type?.replace(/-/g, '_')}`;
  });

  protected readonly actionButtonsClass = computed(() => {
    const type = this.transitionData()?.type;
    return `actions-${type?.replace(/-/g, '_')}`;
  });

  protected readonly currentDate = computed(() => {
    return new Date().toLocaleDateString();
  });

  protected readonly requiredDocuments = computed(() => {
    const docs = this.transitionData()?.requiredDocuments;
    if (docs && docs.length > 0) return docs;

    // Default required documents based on context
    const context = this.transitionData()?.context;
    const market = context?.market || 'aguascalientes';
    const product = context?.product || 'venta-directa';

    const baseDocuments = [
      'Identificación oficial vigente',
      'Comprobante de domicilio (máx. 3 meses)',
      'Comprobante de ingresos'
    ];

    if (market === 'edomex') {
      baseDocuments.push('RFC con homoclave');
      baseDocuments.push('Estado de cuenta bancario');
    }

    if (product === 'venta-plazo') {
      baseDocuments.push('Aval solidario con identificación');
      baseDocuments.push('Comprobante de ingresos del aval');
    }

    return baseDocuments;
  });

  // Event handlers
  protected onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.handleAction('cancel');
    }
  }

  protected handleAction(action: ModalAction): void {
    const type = this.transitionData()?.type;
    const context = this.transitionData()?.context;

    let actionData: any = {};

    switch (action) {
      case 'send_whatsapp':
        actionData = {
          template: this.generateWhatsAppTemplate(),
          documents: this.requiredDocuments()
        };
        break;
      case 'proceed':
        actionData = {
          transitionType: type,
          context: context
        };
        break;
      case 'edit_simulation':
        actionData = {
          returnToSimulator: true,
          currentContext: context
        };
        break;
      case 'upload_documents':
        actionData = {
          openDocumentUploader: true
        };
        break;
    }

    this.onAction.emit({ action, data: actionData });

    // Close modal after most actions (except edit_simulation)
    if (action !== 'edit_simulation') {
      this.closeModal();
    }
  }

  private generateWhatsAppTemplate(): string {
    const context = this.transitionData()?.context;
    const docs = this.requiredDocuments();
    
    const template = `¡Hola! 👋

Hemos completado la simulación para tu ${context?.productName}:

💰 Pago mensual: $${context?.monthlyPayment?.toLocaleString()}/mes
💵 Enganche: $${context?.downPayment?.toLocaleString()}

Para continuar con el proceso, necesitamos los siguientes documentos:

${docs.map((doc, index) => `${index + 1}. ${doc}`).join('\n')}

Por favor, ten listos estos documentos para agilizar el proceso.

¡Gracias! 😊

_Conductores del Mundo_`;

    return template;
  }

  private closeModal(): void {
    this.isVisible.set(false);
    this.onClose.emit();
  }

  // Public methods for parent component
  show(data: TransitionData): void {
    this.transitionData.set(data);
    this.isVisible.set(true);
  }

  hide(): void {
    this.closeModal();
  }
}