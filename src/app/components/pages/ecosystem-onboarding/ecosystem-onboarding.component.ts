import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  Ecosystem, 
  EcosystemType, 
  EcosystemStatus, 
  EcosystemOnboardingStage,
  EcosystemDocument,
  LegalRepresentative,
  getEcosystemDocumentRequirements,
  getEcosystemOnboardingStages,
  calculateEcosystemCompletionPercentage,
  getNextPendingStage
} from '../../../models/ecosystem-onboarding.types';
import { DocumentStatus } from '../../../models/types';

@Component({
  selector: 'app-ecosystem-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-4">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="mb-6">
          <button 
            (click)="goBack()" 
            class="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Volver
          </button>
          <h1 class="text-2xl font-bold text-gray-900">
            {{ currentStage() === 'selection' ? 'Registro de Ecosistema' : ecosystem().name }}
          </h1>
          <p class="text-gray-600 mt-1">
            {{ currentStage() === 'selection' ? 'Selecciona el tipo de ecosistema a registrar' : getStageDescription() }}
          </p>
        </div>

        <!-- Progress Bar (if not in selection stage) -->
        <div *ngIf="currentStage() !== 'selection'" class="mb-6">
          <div class="bg-white rounded-lg shadow p-4">
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-medium text-gray-700">Progreso del Expediente</span>
              <span class="text-sm text-gray-500">{{ completionPercentage() }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div 
                class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                [style.width.%]="completionPercentage()"
              ></div>
            </div>
          </div>
        </div>

        <!-- Type Selection -->
        <div *ngIf="currentStage() === 'selection'" class="space-y-4">
          <div class="grid gap-4">
            <button 
              (click)="selectEcosystemType('ruta_transporte')"
              class="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <div class="flex items-center">
                <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Ruta de Transporte</h3>
                  <p class="text-gray-600">Concesiones, rutas urbanas y suburbanas</p>
                </div>
              </div>
            </button>

            <button 
              (click)="selectEcosystemType('cooperativa')"
              class="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <div class="flex items-center">
                <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                  <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Cooperativa</h3>
                  <p class="text-gray-600">Sociedades cooperativas de transporte</p>
                </div>
              </div>
            </button>

            <button 
              (click)="selectEcosystemType('asociacion')"
              class="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <div class="flex items-center">
                <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">Asociación</h3>
                  <p class="text-gray-600">Asociaciones civiles de transportistas</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Basic Information Form -->
        <div *ngIf="currentStage() === 'basic_info'" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-6">Información Básica</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nombre Comercial</label>
              <input 
                type="text" 
                [(ngModel)]="ecosystem().name"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ruta 25 Los Pinos"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Razón Social</label>
              <input 
                type="text" 
                [(ngModel)]="ecosystem().businessName"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Transportes Los Pinos S.A. de C.V."
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">RFC</label>
              <input 
                type="text" 
                [(ngModel)]="ecosystem().rfc"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="TLP980101XXX"
                pattern="[A-Z]{3,4}[0-9]{6}[A-Z0-9]{3}"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input 
                type="email" 
                [(ngModel)]="ecosystem().email"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="contacto@rutapinos.com"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
              <input 
                type="tel" 
                [(ngModel)]="ecosystem().phone"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="55 1234 5678"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Región de Operación</label>
              <select 
                [(ngModel)]="ecosystem().operatingRegion"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar región</option>
                <option value="Estado de México">Estado de México</option>
                <option value="Aguascalientes">Aguascalientes</option>
                <option value="Ciudad de México">Ciudad de México</option>
              </select>
            </div>
          </div>

          <!-- Address -->
          <div class="mt-6">
            <h3 class="text-lg font-medium mb-4">Domicilio Fiscal</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">Calle y Número</label>
                <input 
                  type="text" 
                  [(ngModel)]="ecosystem().address.street"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Av. Principal 123"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Ciudad</label>
                <input 
                  type="text" 
                  [(ngModel)]="ecosystem().address.city"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Toluca"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                <input 
                  type="text" 
                  [(ngModel)]="ecosystem().address.state"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="México"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Código Postal</label>
                <input 
                  type="text" 
                  [(ngModel)]="ecosystem().address.zipCode"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50100"
                  pattern="[0-9]{5}"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">País</label>
                <input 
                  type="text" 
                  [(ngModel)]="ecosystem().address.country"
                  value="México"
                  readonly
                  class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                >
              </div>
            </div>
          </div>

          <div class="flex justify-end mt-6">
            <button 
              (click)="nextStage()"
              class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Continuar
            </button>
          </div>
        </div>

        <!-- Document Upload Stage -->
        <div *ngIf="currentStage() === 'documents'" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-6">Documentos Requeridos</h2>
          
          <div class="space-y-4">
            <div 
              *ngFor="let doc of requiredDocuments(); trackBy: trackByDocId"
              class="border border-gray-200 rounded-lg p-4"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h3 class="font-medium text-gray-900">{{ doc.name }}</h3>
                  <p class="text-sm text-gray-600 mt-1">{{ doc.tooltip }}</p>
                  <div class="flex items-center mt-2">
                    <span 
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      [class]="getDocumentStatusClass(doc.status)"
                    >
                      {{ getDocumentStatusText(doc.status) }}
                    </span>
                    <span 
                      *ngIf="doc.category" 
                      class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {{ getCategoryText(doc.category) }}
                    </span>
                    <span 
                      *ngIf="doc.isOptional" 
                      class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      Opcional
                    </span>
                  </div>
                </div>
                <div class="ml-4">
                  <button 
                    (click)="uploadDocument(doc.id)"
                    [disabled]="doc.status === DocumentStatus.Aprobado"
                    class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {{ doc.status === DocumentStatus.Aprobado ? 'Aprobado' : 'Subir' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-between mt-6">
            <button 
              (click)="previousStage()"
              class="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Anterior
            </button>
            <button 
              (click)="nextStage()"
              [disabled]="!canProceedFromDocuments()"
              class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Continuar
            </button>
          </div>
        </div>

        <!-- Representatives Stage -->
        <div *ngIf="currentStage() === 'representatives'" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-6">Representantes Legales</h2>
          
          <div class="space-y-6">
            <div 
              *ngFor="let rep of ecosystem().legalRepresentatives; let i = index; trackBy: trackByRepId"
              class="border border-gray-200 rounded-lg p-4"
            >
              <div class="flex items-start justify-between mb-4">
                <h3 class="text-lg font-medium">Representante {{ i + 1 }}</h3>
                <button 
                  *ngIf="ecosystem().legalRepresentatives.length > 1"
                  (click)="removeRepresentative(rep.id)"
                  class="text-red-600 hover:text-red-800"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Nombre Completo</label>
                  <input 
                    type="text" 
                    [(ngModel)]="rep.name"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Juan Pérez García"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Cargo</label>
                  <select 
                    [(ngModel)]="rep.position"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar cargo</option>
                    <option value="Presidente">Presidente</option>
                    <option value="Representante Legal">Representante Legal</option>
                    <option value="Apoderado">Apoderado</option>
                    <option value="Secretario">Secretario</option>
                    <option value="Tesorero">Tesorero</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">RFC</label>
                  <input 
                    type="text" 
                    [(ngModel)]="rep.rfc"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="PEGJ801201XXX"
                    pattern="[A-Z]{4}[0-9]{6}[A-Z0-9]{3}"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">CURP (Opcional)</label>
                  <input 
                    type="text" 
                    [(ngModel)]="rep.curp"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="PEGJ801201HMCRXXX"
                    pattern="[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]"
                  >
                </div>
              </div>

              <div class="mt-4">
                <div class="flex items-center">
                  <input 
                    type="radio" 
                    [id]="'primary_' + rep.id"
                    name="primaryRepresentative"
                    [value]="rep.id"
                    [(ngModel)]="ecosystem().primaryRepresentativeId"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  >
                  <label [for]="'primary_' + rep.id" class="ml-2 text-sm font-medium text-gray-700">
                    Representante principal
                  </label>
                </div>
              </div>
            </div>
          </div>

          <button 
            (click)="addRepresentative()"
            class="mt-4 flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Agregar Representante
          </button>

          <div class="flex justify-between mt-6">
            <button 
              (click)="previousStage()"
              class="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Anterior
            </button>
            <button 
              (click)="nextStage()"
              [disabled]="!canProceedFromRepresentatives()"
              class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Continuar
            </button>
          </div>
        </div>

        <!-- Review Stage -->
        <div *ngIf="currentStage() === 'review'" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-6">Revisión Final</h2>
          
          <div class="space-y-6">
            <!-- Summary -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h3 class="font-medium text-gray-900 mb-2">Resumen</h3>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-600">Tipo:</span>
                  <span class="ml-2 font-medium">{{ getEcosystemTypeText(ecosystem().type) }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Región:</span>
                  <span class="ml-2 font-medium">{{ ecosystem().operatingRegion }}</span>
                </div>
                <div>
                  <span class="text-gray-600">RFC:</span>
                  <span class="ml-2 font-medium">{{ ecosystem().rfc }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Representantes:</span>
                  <span class="ml-2 font-medium">{{ ecosystem().legalRepresentatives.length }}</span>
                </div>
              </div>
            </div>

            <!-- Document Status -->
            <div>
              <h3 class="font-medium text-gray-900 mb-2">Estado de Documentos</h3>
              <div class="space-y-2">
                <div 
                  *ngFor="let doc of requiredDocuments()"
                  class="flex justify-between items-center py-2 border-b border-gray-100"
                >
                  <span class="text-sm text-gray-700">{{ doc.name }}</span>
                  <span 
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [class]="getDocumentStatusClass(doc.status)"
                  >
                    {{ getDocumentStatusText(doc.status) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div class="flex">
                <svg class="w-5 h-5 text-yellow-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <div>
                  <h3 class="text-sm font-medium text-yellow-800">Importante</h3>
                  <p class="text-sm text-yellow-700 mt-1">
                    Al enviar el expediente, será revisado por nuestro equipo. Recibirás notificaciones sobre el estado de la revisión.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-between mt-6">
            <button 
              (click)="previousStage()"
              class="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Anterior
            </button>
            <button 
              (click)="submitEcosystem()"
              class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Enviar Expediente
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class EcosystemOnboardingComponent implements OnInit {
  private router = inject(Router);

  currentStage = signal<string>('selection');
  ecosystem = signal<Ecosystem>(this.createEmptyEcosystem());
  
  completionPercentage = computed(() => {
    return calculateEcosystemCompletionPercentage(this.ecosystem());
  });

  requiredDocuments = computed(() => {
    if (this.ecosystem().type) {
      return getEcosystemDocumentRequirements(this.ecosystem().type);
    }
    return [];
  });

  readonly DocumentStatus = DocumentStatus;

  ngOnInit() {
    // Initialize with empty ecosystem
  }

  private createEmptyEcosystem(): Ecosystem {
    return {
      id: `ecosystem_${Date.now()}`,
      name: '',
      type: 'ruta_transporte' as EcosystemType,
      status: 'registro_inicial' as EcosystemStatus,
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'México'
      },
      businessName: '',
      rfc: '',
      constitutionDate: undefined,
      registrationNumber: '',
      legalRepresentatives: [this.createEmptyRepresentative()],
      primaryRepresentativeId: '',
      routes: [],
      operatingRegion: '',
      totalMembers: 0,
      activeMembers: 0,
      documents: [],
      onboardingStages: [],
      currentStage: '',
      monthlyRevenue: undefined,
      averageAge: 0,
      fleetSize: 0,
      registeredAt: new Date(),
      approvedAt: undefined,
      lastUpdated: new Date(),
      createdBy: 'demo_asesor',
      assignedAsesorId: 'demo_asesor',
      cartaAvalEnabled: false,
      cartaAvalTemplate: '',
      issuedCartasAval: []
    };
  }

  private createEmptyRepresentative(): LegalRepresentative {
    const id = `rep_${Date.now()}`;
    return {
      id,
      name: '',
      position: '',
      rfc: '',
      curp: '',
      documents: [],
      isActive: true
    };
  }

  selectEcosystemType(type: EcosystemType) {
    const updatedEcosystem = { ...this.ecosystem() };
    updatedEcosystem.type = type;
    updatedEcosystem.documents = getEcosystemDocumentRequirements(type);
    updatedEcosystem.onboardingStages = getEcosystemOnboardingStages(type);
    updatedEcosystem.primaryRepresentativeId = updatedEcosystem.legalRepresentatives[0]?.id || '';
    
    this.ecosystem.set(updatedEcosystem);
    this.currentStage.set('basic_info');
  }

  nextStage() {
    const current = this.currentStage();
    
    switch (current) {
      case 'basic_info':
        this.currentStage.set('documents');
        break;
      case 'documents':
        this.currentStage.set('representatives');
        break;
      case 'representatives':
        this.currentStage.set('review');
        break;
    }
  }

  previousStage() {
    const current = this.currentStage();
    
    switch (current) {
      case 'documents':
        this.currentStage.set('basic_info');
        break;
      case 'representatives':
        this.currentStage.set('documents');
        break;
      case 'review':
        this.currentStage.set('representatives');
        break;
    }
  }

  uploadDocument(docId: string) {
    const updatedEcosystem = { ...this.ecosystem() };
    const doc = updatedEcosystem.documents.find(d => d.id === docId);
    if (doc) {
      doc.status = DocumentStatus.EnRevision;
      
      // Simulate approval after 2 seconds
      setTimeout(() => {
        doc.status = DocumentStatus.Aprobado;
        this.ecosystem.set({ ...updatedEcosystem });
      }, 2000);
    }
    this.ecosystem.set(updatedEcosystem);
  }

  addRepresentative() {
    const updatedEcosystem = { ...this.ecosystem() };
    updatedEcosystem.legalRepresentatives.push(this.createEmptyRepresentative());
    this.ecosystem.set(updatedEcosystem);
  }

  removeRepresentative(repId: string) {
    const updatedEcosystem = { ...this.ecosystem() };
    updatedEcosystem.legalRepresentatives = updatedEcosystem.legalRepresentatives.filter(r => r.id !== repId);
    
    // If we removed the primary representative, set a new one
    if (updatedEcosystem.primaryRepresentativeId === repId && updatedEcosystem.legalRepresentatives.length > 0) {
      updatedEcosystem.primaryRepresentativeId = updatedEcosystem.legalRepresentatives[0].id;
    }
    
    this.ecosystem.set(updatedEcosystem);
  }

  submitEcosystem() {
    const updatedEcosystem = { ...this.ecosystem() };
    updatedEcosystem.status = 'expediente_en_revision' as EcosystemStatus;
    updatedEcosystem.lastUpdated = new Date();
    
    this.ecosystem.set(updatedEcosystem);
    
    // Save to localStorage for demo
    this.saveToStorage(updatedEcosystem);
    
    // Navigate back with success message
    this.router.navigate(['/ecosistemas'], { 
      queryParams: { message: 'Expediente enviado exitosamente. Recibirás notificaciones sobre el proceso de revisión.' }
    });
  }

  private saveToStorage(ecosystem: Ecosystem) {
    const existingEcosystems = JSON.parse(localStorage.getItem('ecosystems') || '[]');
    const index = existingEcosystems.findIndex((e: Ecosystem) => e.id === ecosystem.id);
    
    if (index >= 0) {
      existingEcosystems[index] = ecosystem;
    } else {
      existingEcosystems.push(ecosystem);
    }
    
    localStorage.setItem('ecosystems', JSON.stringify(existingEcosystems));
  }

  canProceedFromDocuments(): boolean {
    const requiredDocs = this.requiredDocuments().filter(d => !d.isOptional);
    return requiredDocs.every(doc => 
      doc.status === DocumentStatus.Aprobado || doc.status === DocumentStatus.EnRevision
    );
  }

  canProceedFromRepresentatives(): boolean {
    const ecosystem = this.ecosystem();
    return ecosystem.legalRepresentatives.length > 0 &&
           ecosystem.legalRepresentatives.every(rep => rep.name && rep.position) &&
           ecosystem.primaryRepresentativeId !== '';
  }

  getStageDescription(): string {
    const stage = this.currentStage();
    switch (stage) {
      case 'basic_info': return 'Información básica del ecosistema';
      case 'documents': return 'Carga de documentos requeridos';
      case 'representatives': return 'Información de representantes legales';
      case 'review': return 'Revisión final antes de envío';
      default: return '';
    }
  }

  getDocumentStatusClass(status: DocumentStatus): string {
    switch (status) {
      case DocumentStatus.Aprobado:
        return 'bg-green-100 text-green-800';
      case DocumentStatus.EnRevision:
        return 'bg-blue-100 text-blue-800';
      case DocumentStatus.Rechazado:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getDocumentStatusText(status: DocumentStatus): string {
    switch (status) {
      case DocumentStatus.Aprobado:
        return 'Aprobado';
      case DocumentStatus.EnRevision:
        return 'En Revisión';
      case DocumentStatus.Rechazado:
        return 'Rechazado';
      default:
        return 'Pendiente';
    }
  }

  getCategoryText(category: string): string {
    switch (category) {
      case 'legal': return 'Legal';
      case 'fiscal': return 'Fiscal';
      case 'operational': return 'Operacional';
      case 'representative': return 'Representante';
      default: return category;
    }
  }

  getEcosystemTypeText(type: EcosystemType): string {
    switch (type) {
      case 'ruta_transporte': return 'Ruta de Transporte';
      case 'cooperativa': return 'Cooperativa';
      case 'asociacion': return 'Asociación';
      default: return type;
    }
  }

  trackByDocId(index: number, doc: EcosystemDocument): string {
    return doc.id;
  }

  trackByRepId(index: number, rep: LegalRepresentative): string {
    return rep.id;
  }

  goBack() {
    if (this.currentStage() === 'selection') {
      this.router.navigate(['/ecosistemas']);
    } else {
      this.currentStage.set('selection');
    }
  }
}