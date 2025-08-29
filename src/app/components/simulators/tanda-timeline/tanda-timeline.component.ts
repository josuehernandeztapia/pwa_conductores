import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface TandaConfiguration {
  numberOfMembers: number;
  averageConsumption: number;
  pricePerLiter: number;
  monthlyVoluntary: number;
}

interface TandaMilestone {
  unitNumber: number;
  type: 'ahorro' | 'entrega';
  month: number;
  cumulativeDebt: number;
  savingsProgress: number;
  label: string;
  isCompleted: boolean;
}

@Component({
  selector: 'app-tanda-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 class="text-lg font-semibold text-white mb-6">Simulador de Tanda Colectiva - Efecto Bola de Nieve</h3>
      
      <!-- Configuration Controls -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div class="space-y-4">
          <h4 class="text-md font-medium text-gray-300">Configuración del Grupo</h4>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">Número de Integrantes</label>
            <input 
              type="range" 
              min="3" 
              max="20" 
              step="1"
              [(ngModel)]="numberOfMembers"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>3</span>
              <span class="font-semibold text-white">{{ numberOfMembers }} miembros</span>
              <span>20</span>
            </div>
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">Consumo Mensual Promedio (Litros)</label>
            <input 
              type="range" 
              min="400" 
              max="1500" 
              step="50"
              [(ngModel)]="averageConsumption"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>400L</span>
              <span class="font-semibold text-white">{{ averageConsumption }}L</span>
              <span>1500L</span>
            </div>
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">Sobreprecio por Litro</label>
            <input 
              type="range" 
              min="3" 
              max="10" 
              step="0.5"
              [(ngModel)]="pricePerLiter"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>$3</span>
              <span class="font-semibold text-white">{{ pricePerLiter }}</span>
              <span>$10</span>
            </div>
          </div>
        </div>
        
        <div class="space-y-4">
          <h4 class="text-md font-medium text-gray-300">Aportaciones Adicionales</h4>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">Aportación Voluntaria Grupal Mensual</label>
            <input 
              type="range" 
              min="0" 
              max="25000" 
              step="1000"
              [(ngModel)]="monthlyVoluntary"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>$0</span>
              <span class="font-semibold text-white">{{ formatCurrency(monthlyVoluntary) }}</span>
              <span>$25,000</span>
            </div>
          </div>
          
          <div class="space-y-2">
            <div class="p-3 bg-gray-700/50 rounded-lg">
              <p class="text-sm text-gray-400">Recaudación Mensual Total</p>
              <p class="text-lg font-bold text-primary-cyan-400">{{ formatCurrency(totalMonthlyCollection()) }}</p>
            </div>
            <div class="p-3 bg-gray-700/50 rounded-lg">
              <p class="text-sm text-gray-400">Ingreso Mensual Grupal</p>
              <p class="text-lg font-bold text-emerald-400">{{ formatCurrency(totalMonthlyIncome()) }}</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Timeline Visualization -->
      <div class="bg-gray-700/30 rounded-lg p-4 mb-6">
        <h4 class="text-md font-medium text-gray-300 mb-4">Línea de Tiempo - Efecto Bola de Nieve</h4>
        
        <div class="relative">
          <!-- Timeline line -->
          <div class="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-600"></div>
          
          <!-- Milestones -->
          <div class="space-y-4">
            @for (milestone of milestones(); track milestone.unitNumber + milestone.type) {
              <div class="flex items-start">
                <div [class]="getMilestoneIconClasses(milestone)">
                  @if (milestone.type === 'ahorro') {
                    <i class="fas fa-piggy-bank w-3 h-3"></i>
                  } @else {
                    <i class="fas fa-truck w-3 h-3"></i>
                  }
                </div>
                
                <div class="ml-4 flex-1 pb-4">
                  <div class="flex items-center justify-between mb-1">
                    <h5 [class]="getMilestoneTitleClasses(milestone)">{{ milestone.label }}</h5>
                    <span class="text-xs text-gray-400">Mes {{ milestone.month }}</span>
                  </div>
                  
                  @if (milestone.type === 'ahorro') {
                    <div class="text-sm text-gray-400 mb-2">
                      Meta de ahorro: {{ formatCurrency(savingsGoalPerUnit) }}
                    </div>
                    <!-- Savings progress bar -->
                    <div class="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        class="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                        [style.width.%]="milestone.savingsProgress"
                      ></div>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                      {{ milestone.savingsProgress }}% completado
                    </div>
                  } @else {
                    <div class="flex items-center justify-between text-sm">
                      <span class="text-emerald-400 font-semibold">¡Unidad {{ milestone.unitNumber }} Entregada!</span>
                      <span class="text-amber-400">Deuda acumulada: {{ formatCurrency(milestone.cumulativeDebt) }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
      
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-gray-700/50 rounded-lg p-4 text-center">
          <p class="text-sm text-gray-400">Primera Entrega</p>
          <p class="text-lg font-bold text-emerald-400">{{ firstDeliveryMonth() }} meses</p>
        </div>
        <div class="bg-gray-700/50 rounded-lg p-4 text-center">
          <p class="text-sm text-gray-400">Última Entrega</p>
          <p class="text-lg font-bold text-primary-cyan-400">{{ lastDeliveryMonth() }} meses</p>
        </div>
        <div class="bg-gray-700/50 rounded-lg p-4 text-center">
          <p class="text-sm text-gray-400">Pago Final Mensual</p>
          <p class="text-lg font-bold text-amber-400">{{ formatCurrency(finalMonthlyPayment()) }}</p>
        </div>
        <div class="bg-gray-700/50 rounded-lg p-4 text-center">
          <p class="text-sm text-gray-400">Duración Total</p>
          <p class="text-lg font-bold text-gray-300">{{ totalDurationYears() }} años</p>
        </div>
      </div>
      
      <!-- Warning for high debt -->
      @if (finalMonthlyPayment() > totalMonthlyIncome() * 0.8) {
        <div class="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div class="flex items-start">
            <i class="fas fa-exclamation-triangle text-red-400 mt-1 mr-3"></i>
            <div>
              <p class="text-sm font-semibold text-red-400">Advertencia: Alta Carga de Pago</p>
              <p class="text-xs text-red-300 mt-1">
                El pago mensual final ({{ formatCurrency(finalMonthlyPayment()) }}) representa más del 80% del ingreso grupal. 
                Considera reducir el número de miembros o incrementar los ingresos.
              </p>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class TandaTimelineComponent {
  @Input() set tandaConfig(value: TandaConfiguration | null) {
    if (value) {
      this.numberOfMembers = value.numberOfMembers;
      this.averageConsumption = value.averageConsumption;
      this.pricePerLiter = value.pricePerLiter;
      this.monthlyVoluntary = value.monthlyVoluntary;
    }
  }

  // Reactive configuration
  numberOfMembers = 5;
  averageConsumption = 800;
  pricePerLiter = 6;
  monthlyVoluntary = 10000;

  // Constants from PLAYBOOK.md
  readonly packageValue = 837000; // Full package for EdoMex
  readonly savingsGoalPerUnit = 125550; // 15% of package value
  readonly monthlyPaymentPerUnit = 25720.52; // Monthly payment per unit

  readonly totalMonthlyCollection = computed(() => {
    return this.numberOfMembers * this.averageConsumption * this.pricePerLiter;
  });

  readonly totalMonthlyIncome = computed(() => {
    return this.totalMonthlyCollection() + this.monthlyVoluntary;
  });

  readonly monthsToFirstSavings = computed(() => {
    const monthly = this.totalMonthlyIncome();
    return monthly > 0 ? Math.ceil(this.savingsGoalPerUnit / monthly) : 999;
  });

  readonly finalMonthlyPayment = computed(() => {
    return this.numberOfMembers * this.monthlyPaymentPerUnit;
  });

  readonly firstDeliveryMonth = computed(() => {
    return this.monthsToFirstSavings();
  });

  readonly lastDeliveryMonth = computed(() => {
    // Each subsequent unit takes longer due to increasing debt burden
    let totalMonths = 0;
    let currentPayment = 0;
    
    for (let unit = 1; unit <= this.numberOfMembers; unit++) {
      const availableForSavings = this.totalMonthlyIncome() - currentPayment;
      if (availableForSavings <= 0) {
        return 999; // Impossible scenario
      }
      
      const monthsForThisUnit = Math.ceil(this.savingsGoalPerUnit / availableForSavings);
      totalMonths += monthsForThisUnit;
      currentPayment = unit * this.monthlyPaymentPerUnit;
    }
    
    return totalMonths;
  });

  readonly totalDurationYears = computed(() => {
    const totalMonths = this.lastDeliveryMonth() + (48); // Add 48 months for final payments
    return Math.round((totalMonths / 12) * 10) / 10;
  });

  readonly milestones = computed((): TandaMilestone[] => {
    const milestones: TandaMilestone[] = [];
    let cumulativeMonths = 0;
    let currentDebt = 0;
    
    for (let unit = 1; unit <= Math.min(this.numberOfMembers, 8); unit++) {
      // Calculate savings phase
      const currentPayment = (unit - 1) * this.monthlyPaymentPerUnit;
      const availableForSavings = this.totalMonthlyIncome() - currentPayment;
      
      if (availableForSavings <= 0) break;
      
      const monthsToSave = Math.ceil(this.savingsGoalPerUnit / availableForSavings);
      cumulativeMonths += monthsToSave;
      
      // Savings milestone
      milestones.push({
        unitNumber: unit,
        type: 'ahorro',
        month: cumulativeMonths,
        cumulativeDebt: currentDebt,
        savingsProgress: 100,
        label: `Ahorro para Unidad ${unit}`,
        isCompleted: false
      });
      
      // Delivery milestone
      currentDebt = unit * this.monthlyPaymentPerUnit;
      milestones.push({
        unitNumber: unit,
        type: 'entrega',
        month: cumulativeMonths,
        cumulativeDebt: currentDebt,
        savingsProgress: 0,
        label: `Entrega Unidad ${unit}`,
        isCompleted: false
      });
    }
    
    return milestones;
  });

  getMilestoneIconClasses(milestone: TandaMilestone): string {
    const baseClasses = 'relative z-10 flex items-center justify-center w-6 h-6 rounded-full border-2';
    
    if (milestone.type === 'ahorro') {
      return `${baseClasses} bg-emerald-500 border-emerald-500 text-white`;
    } else {
      return `${baseClasses} bg-primary-cyan-500 border-primary-cyan-500 text-white`;
    }
  }

  getMilestoneTitleClasses(milestone: TandaMilestone): string {
    const baseClasses = 'font-medium';
    
    if (milestone.type === 'ahorro') {
      return `${baseClasses} text-emerald-300`;
    } else {
      return `${baseClasses} text-primary-cyan-300`;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}