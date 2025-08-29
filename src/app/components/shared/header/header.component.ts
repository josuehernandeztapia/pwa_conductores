import { Component, Output, EventEmitter, Input, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../modal/modal.component';
import { ToastService } from '../../../services/toast.service';
import { SimulationService } from '../../../services/simulation.service';
import { Client, Notification, Ecosystem, BusinessFlow, SimulatorMode } from '../../../models/types';

type OnboardingStep = 'flow_selection' | 'market' | 'clientType' | 'ecosystem' | 'details';
type FlowSelection = 'contado' | 'financiero' | 'ahorro';
type Market = 'aguascalientes' | 'edomex';
type ClientType = 'individual' | 'colectivo';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  template: `
    <!-- Header -->
    <header class="flex items-center justify-between h-20 px-4 md:px-8 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
      <div class="flex items-center">
        <!-- Logo -->
        <img 
          src="https://res.cloudinary.com/dytmjjb9l/image/upload/v1755053362/Add_the_text_Conductores_del_Mundo_below_the_logo_The_text_should_be_small_centered_and_in_the_same_monochromatic_style_as_the_logo_The_logo_features_the_text_Mu_in_white_centered_within_a_teal_i_rbsaxg.png"
          alt="Conductores del Mundo"
          class="h-12 w-auto mr-4"
        >
        <div>
          <h1 class="text-xl font-semibold text-white">Centro de Comando</h1>
          <p class="text-sm text-gray-400">Visión 360° de tus clientes y operaciones.</p>
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <!-- Nueva Oportunidad Button -->
        <button 
          (click)="openOpportunityModal()"
          class="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary-cyan-600 rounded-lg hover:bg-primary-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-primary-cyan-500 transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nueva Oportunidad
        </button>
        
        <!-- Notifications -->
        <div class="relative">
          <button 
            (click)="toggleNotifications()" 
            class="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
            @if (unreadCount > 0) {
              <span class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-gray-800">
                {{ unreadCount }}
              </span>
            }
          </button>
        </div>

        <!-- User Avatar -->
        <div class="flex items-center">
          <img class="h-10 w-10 rounded-full object-cover" src="https://picsum.photos/seed/advisor/100/100" alt="Avatar del Asesor" />
          <div class="ml-3 hidden md:block">
            <p class="text-sm font-medium text-white">Ricardo Montoya</p>
            <p class="text-xs text-gray-400">Asesor Senior</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Opportunity Modal -->
    <app-modal 
      [open]="isOpportunityModalOpen()" 
      [title]="'Asistente de Creación de Oportunidad'"
      (onClose)="closeOpportunityModal()"
    >
      <div class="space-y-4">
        @switch (currentStep()) {
          @case ('flow_selection') {
            <div>
              <p class="text-gray-400 mb-4">¿Qué necesita tu cliente?</p>
              
              <button 
                (click)="handleFlowSelect('contado')" 
                class="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors mb-2"
              >
                <div class="flex items-start">
                  <svg class="w-6 h-6 text-indigo-400 mr-3 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p class="font-semibold text-white">Compra de Contado</p>
                    <p class="text-sm text-gray-400">El "carril express" para clientes que liquidan con recursos propios.</p>
                  </div>
                </div>
              </button>
              
              <button 
                (click)="handleFlowSelect('financiero')" 
                class="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors mb-2"
              >
                <div class="flex items-start">
                  <svg class="w-6 h-6 text-primary-cyan-400 mr-3 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p class="font-semibold text-white">Venta a Plazo</p>
                    <p class="text-sm text-gray-400">Para clientes que requieren un plan de financiamiento.</p>
                  </div>
                </div>
              </button>
              
              <button 
                (click)="handleFlowSelect('ahorro')" 
                class="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <div class="flex items-start">
                  <svg class="w-6 h-6 text-amber-300 mr-3 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div>
                    <p class="font-semibold text-white">Plan de Ahorro / Crédito Colectivo</p>
                    <p class="text-sm text-gray-400">Para clientes que necesitan planificar o unirse a una Tanda.</p>
                  </div>
                </div>
              </button>
            </div>
          }
          
          @case ('market') {
            <div>
              <p class="text-gray-400 mb-4">¿En qué mercado se realiza la operación?</p>
              
              <button 
                (click)="handleSelectMarket('aguascalientes')" 
                class="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors mb-2"
              >
                <p class="font-semibold text-white">Aguascalientes</p>
                <p class="text-sm text-gray-400">Flujo de Venta Individual.</p>
              </button>
              
              <button 
                (click)="handleSelectMarket('edomex')" 
                class="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <p class="font-semibold text-white">Estado de México</p>
                <p class="text-sm text-gray-400">Flujo de Ecosistema de Ruta (Colateral Social).</p>
              </button>
            </div>
          }
          
          @case ('clientType') {
            <div>
              <p class="text-gray-400 mb-4">¿Este plan de ahorro es para un individuo o para un grupo?</p>
              
              <button 
                (click)="handleSelectClientType('individual')" 
                class="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors mb-2"
              >
                <p class="font-semibold text-white">Ahorro Individual</p>
                <p class="text-sm text-gray-400">Un plan de ahorro personal para alcanzar un enganche.</p>
              </button>
              
              <button 
                (click)="handleSelectClientType('colectivo')" 
                class="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <p class="font-semibold text-white">Ahorro para Crédito Colectivo (Tanda)</p>
                <p class="text-sm text-gray-400">El cliente se unirá a un grupo para ahorrar en conjunto.</p>
              </button>
            </div>
          }
          
          @case ('ecosystem') {
            <div>
              <p class="text-gray-400 mb-4">Este mercado opera con un modelo de Ecosistema. Por favor, vincula al cliente con su ruta.</p>
              
              <label for="ecosystem" class="block text-sm font-medium text-gray-300">Ecosistema (Ruta)</label>
              <select 
                id="ecosystem" 
                [(ngModel)]="selectedEcosystem" 
                class="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-gray-900 border-gray-600 focus:outline-none focus:ring-primary-cyan-500 focus:border-primary-cyan-500 sm:text-sm rounded-md text-white"
              >
                <option value="">-- Selecciona una ruta --</option>
                @for (eco of ecosystems(); track eco.id) {
                  <option [value]="eco.id">{{ eco.name }}</option>
                }
              </select>
              
              <p class="text-xs text-gray-500 mt-2">Si la ruta no existe, puedes crearla en la sección de "Ecosistemas".</p>
              
              <button 
                (click)="setCurrentStep('details')" 
                [disabled]="!selectedEcosystem" 
                class="w-full mt-4 px-4 py-2 text-sm font-medium text-white bg-primary-cyan-600 rounded-lg hover:bg-primary-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </button>
            </div>
          }
          
          @case ('details') {
            <div>
              <p class="text-gray-400 mb-4">Introduce el nombre del prospecto para crear la oportunidad.</p>
              
              <label for="clientName" class="block text-sm font-medium text-gray-300">Nombre Completo del Prospecto</label>
              <input 
                type="text" 
                id="clientName" 
                [(ngModel)]="clientName" 
                required 
                class="mt-1 w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white" 
                placeholder="Ej. Juan Pérez"
              />
              
              <button 
                (click)="handleCreateClient()" 
                [disabled]="!clientName || isLoading()" 
                class="w-full mt-4 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isLoading() ? 'Creando...' : 'Crear Oportunidad y Simular' }}
              </button>
            </div>
          }
        }
      </div>
    </app-modal>
  `
})
export class HeaderComponent implements OnInit {
  @Input() notifications: Notification[] = [];
  @Input() unreadCount: number = 0;
  
  @Output() onClientCreated = new EventEmitter<{client: Client, mode: SimulatorMode}>();
  @Output() onNotificationAction = new EventEmitter<Notification>();
  @Output() onMarkAsRead = new EventEmitter<void>();

  private readonly toastService = inject(ToastService);
  private readonly simulationService = inject(SimulationService);

  // Modal state
  protected readonly isOpportunityModalOpen = signal(false);
  protected readonly isNotificationsOpen = signal(false);

  // Wizard state
  protected readonly currentStep = signal<OnboardingStep>('flow_selection');
  protected readonly isLoading = signal(false);
  protected readonly ecosystems = signal<Ecosystem[]>([]);

  // Form data
  protected flowSelection: FlowSelection | null = null;
  protected market: Market | null = null;
  protected clientType: ClientType | null = null;
  protected selectedEcosystem: string | null = null;
  protected clientName = '';

  ngOnInit() {
    // Load ecosystems when component initializes
    this.loadEcosystems();
  }

  private async loadEcosystems() {
    try {
      const ecosystemData = await this.simulationService.getEcosystems().toPromise();
      this.ecosystems.set(ecosystemData || []);
    } catch (error) {
      console.error('Error loading ecosystems:', error);
    }
  }

  // Modal controls
  protected openOpportunityModal() {
    this.isOpportunityModalOpen.set(true);
    this.resetWizard();
  }

  protected closeOpportunityModal() {
    this.isOpportunityModalOpen.set(false);
    this.resetWizard();
  }

  protected toggleNotifications() {
    this.isNotificationsOpen.update(open => !open);
    if (this.isNotificationsOpen()) {
      this.onMarkAsRead.emit();
    }
  }

  // Wizard navigation
  protected setCurrentStep(step: OnboardingStep) {
    this.currentStep.set(step);
  }

  protected handleFlowSelect(selection: FlowSelection) {
    this.flowSelection = selection;
    if (selection === 'ahorro') {
      // Ahorro disponible en ambas plazas, pero con diferentes opciones
      this.setCurrentStep('market');
    } else {
      this.setCurrentStep('market');
    }
  }

  protected handleSelectMarket(selectedMarket: Market) {
    this.market = selectedMarket;
    
    if (this.flowSelection === 'ahorro') {
      if (selectedMarket === 'edomex') {
        // EdoMex: Individual + Colectivo → Tipo Cliente → Ecosistema
        this.setCurrentStep('clientType');
      } else {
        // AGS: Solo Individual → Directo a datos (sin ecosistemas)
        this.clientType = 'individual';
        this.setCurrentStep('details');
      }
    } else if (selectedMarket === 'edomex') {
      // Contado/Financiero en EdoMex requiere ecosistema
      this.setCurrentStep('ecosystem');
    } else {
      // Contado/Financiero en AGS es directo
      this.setCurrentStep('details');
    }
  }

  protected handleSelectClientType(type: ClientType) {
    this.clientType = type;
    // En EdoMex, todos los planes de ahorro requieren ecosistema
    this.setCurrentStep('ecosystem');
  }

  protected async handleCreateClient() {
    if (!this.flowSelection || !this.market || !this.clientName) {
      this.toastService.error("Por favor, completa todos los campos.");
      return;
    }

    this.isLoading.set(true);
    try {
      let newClient: Client;
      let mode: SimulatorMode;

      if (this.flowSelection === 'ahorro') {
        // Create savings opportunity
        newClient = await this.simulationService.createClientFromOnboarding({
          name: this.clientName,
          market: this.market,
          saleType: 'financiero', // Ahorro will be converted later
          ecosystemId: this.selectedEcosystem || undefined,
        }).toPromise() as Client;
        
        // Set flow to savings plan
        newClient.flow = BusinessFlow.AhorroProgramado;
        mode = 'savings';
      } else { 
        // contado or financiero
        newClient = await this.simulationService.createClientFromOnboarding({
          name: this.clientName,
          market: this.market,
          saleType: this.flowSelection,
          ecosystemId: this.selectedEcosystem || undefined,
        }).toPromise() as Client;
        mode = 'acquisition';
      }

      this.toastService.success(`Oportunidad "${newClient.name}" creada. Modelando solución...`);
      this.onClientCreated.emit({client: newClient, mode});
      this.closeOpportunityModal();
    } catch (error) {
      this.toastService.error("Error al crear la oportunidad.");
    } finally {
      this.isLoading.set(false);
    }
  }

  private resetWizard() {
    this.currentStep.set('flow_selection');
    this.flowSelection = null;
    this.market = null;
    this.clientType = null;
    this.selectedEcosystem = null;
    this.clientName = '';
    this.isLoading.set(false);
  }
}