import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client, DocumentStatus } from '../../../types/client.types';

interface ActionDetails {
  icon: string;
  title: string;
  description: string;
  action: {
    text: string;
    onClick: () => void;
    type: 'primary' | 'secondary';
  };
  secondaryAction?: {
    text: string;
    onClick: () => void;
  };
}

@Component({
  selector: 'app-next-best-action',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (actionDetails) {
      <div class="bg-gray-800/50 p-4 rounded-lg border border-gray-700 shadow-lg mb-6 flex items-center justify-between">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <i [class]="actionDetails.icon"></i>
          </div>
          <div class="ml-4">
            <h4 class="text-lg font-bold text-white">{{ actionDetails.title }}</h4>
            <p class="text-gray-300 text-sm mt-1">{{ actionDetails.description }}</p>
          </div>
        </div>
        <div class="flex items-center gap-4 ml-8">
          @if (actionDetails.secondaryAction) {
            <button 
              (click)="actionDetails.secondaryAction!.onClick()" 
              class="px-4 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-600/50 transition-colors"
            >
              {{ actionDetails.secondaryAction.text }}
            </button>
          }
          <button 
            (click)="actionDetails.action.onClick()" 
            [class]="getActionButtonClasses(actionDetails.action.type)"
          >
            {{ actionDetails.action.text }}
            <i class="fas fa-arrow-right w-4 h-4 ml-2"></i>
          </button>
        </div>
      </div>
    }
  `
})
export class NextBestActionComponent {
  @Input() client!: Client;
  @Output() action = new EventEmitter<string>();

  get actionDetails(): ActionDetails | null {
    return this.getNextBestAction(this.client);
  }

  private getNextBestAction(client: Client): ActionDetails | null {
    // Priority 1: Meta Alcanzada (Savings Plan)
    if (client.status === 'Meta Alcanzada' && client.savingsPlan) {
      return {
        icon: 'fas fa-sparkles w-8 h-8 text-emerald-300',
        title: '¡Meta de Ahorro Completada!',
        description: `${client.name} ha acumulado lo suficiente. Es momento de decidir el siguiente paso.`,
        action: { 
          text: 'Convertir a Venta a Plazo', 
          onClick: () => this.action.emit('convertir'), 
          type: 'primary' 
        },
        secondaryAction: { 
          text: 'Liquidar de Contado', 
          onClick: () => this.action.emit('liquidar') 
        }
      };
    }

    // Priority 2: Turno Adjudicado (Collective Credit)
    if (client.status === 'Turno Adjudicado') {
      return {
        icon: 'fas fa-sparkles w-8 h-8 text-amber-300',
        title: '¡Turno de Crédito Adjudicado!',
        description: 'El cliente ha recibido su turno en el Crédito Colectivo. Puedes iniciar su proceso de Venta a Plazo.',
        action: { 
          text: 'Iniciar Proceso de Venta', 
          onClick: () => this.action.emit('transition_collective'), 
          type: 'primary' 
        }
      };
    }

    // Priority 3: Unit Ready for Delivery (Venta Directa)
    if (client.status === 'Unidad Lista para Entrega' && client.remainderAmount) {
      return {
        icon: 'fas fa-check-circle w-8 h-8 text-green-300',
        title: '¡Unidad Lista para Entrega!',
        description: 'La unidad ha sido liberada y está lista. Es momento de solicitar el pago del remanente al cliente.',
        action: { 
          text: 'Generar Pago por Remanente', 
          onClick: () => this.action.emit('pay_remainder'), 
          type: 'primary' 
        }
      };
    }

    // Priority 4: Aprobado
    if (client.status === 'Aprobado') {
      return {
        icon: 'fas fa-info-circle w-8 h-8 text-blue-300',
        title: 'Próxima Acción Requerida',
        description: 'El crédito del cliente ha sido aprobado. Configura el plan de pagos mensual para continuar.',
        action: { 
          text: 'Configurar Plan de Pagos', 
          onClick: () => this.action.emit('configure_plan'), 
          type: 'primary' 
        }
      };
    }

    // Priority 5: Expediente en Proceso
    const pendingDocsCount = client.documents.filter(d => d.status === DocumentStatus.Pendiente).length;
    if (client.status === 'Expediente en Proceso' && pendingDocsCount > 0) {
      return {
        icon: 'fas fa-lightbulb w-8 h-8 text-blue-300',
        title: 'Próxima Acción Recomendada',
        description: `Contactar a ${client.name} para completar los ${pendingDocsCount} documento(s) pendientes y avanzar en el proceso.`,
        action: { 
          text: 'Ir a Expediente', 
          onClick: () => this.action.emit('scroll_to_docs'), 
          type: 'secondary' 
        }
      };
    }

    // Default: No specific action
    return null;
  }

  getActionButtonClasses(type: 'primary' | 'secondary'): string {
    const baseClasses = 'flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg transition-transform hover:scale-105';
    const typeClasses = {
      primary: 'bg-primary-cyan-600 hover:bg-primary-cyan-700 text-white',
      secondary: 'bg-gray-600 hover:bg-gray-500 text-gray-200'
    };
    return `${baseClasses} ${typeClasses[type]}`;
  }
}