import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SavingsData {
  downPaymentGoal: number;
  currentSavings: number;
  monthlyCollection: number;
  monthlyVoluntary: number;
  consumptionLiters: number;
  pricePerLiter: number;
}

interface ProjectionPoint {
  month: number;
  amount: number;
  label: string;
}

@Component({
  selector: 'app-savings-projection-chart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 class="text-lg font-semibold text-white mb-6">Planificador de Enganche - Estado de México</h3>
      
      <!-- Configuration Controls -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div class="space-y-4">
          <h4 class="text-md font-medium text-gray-300">Configuración de Recaudación</h4>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">Consumo Mensual (Litros)</label>
            <input 
              type="range" 
              min="200" 
              max="2000" 
              step="50"
              [(ngModel)]="consumptionLiters"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>200L</span>
              <span class="font-semibold text-white">{{ consumptionLiters }}L</span>
              <span>2000L</span>
            </div>
          </div>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">Sobreprecio por Litro</label>
            <input 
              type="range" 
              min="2" 
              max="12" 
              step="0.5"
              [(ngModel)]="pricePerLiter"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>$2</span>
              <span class="font-semibold text-white">{{ pricePerLiter }}</span>
              <span>$12</span>
            </div>
          </div>
          
          <div class="p-3 bg-gray-700/50 rounded-lg">
            <p class="text-sm text-gray-400">Recaudación Mensual Estimada</p>
            <p class="text-lg font-bold text-primary-cyan-400">{{ formatCurrency(monthlyCollectionAmount()) }}</p>
          </div>
        </div>
        
        <div class="space-y-4">
          <h4 class="text-md font-medium text-gray-300">Aportaciones Voluntarias</h4>
          
          <div>
            <label class="block text-sm text-gray-400 mb-2">Aportación Mensual Voluntaria</label>
            <input 
              type="range" 
              min="0" 
              max="10000" 
              step="500"
              [(ngModel)]="monthlyVoluntary"
              class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>$0</span>
              <span class="font-semibold text-white">{{ formatCurrency(monthlyVoluntary) }}</span>
              <span>$10,000</span>
            </div>
          </div>
          
          <div class="p-3 bg-gray-700/50 rounded-lg">
            <p class="text-sm text-gray-400">Ahorro Total Mensual</p>
            <p class="text-lg font-bold text-emerald-400">{{ formatCurrency(totalMonthlySavings()) }}</p>
          </div>
        </div>
      </div>
      
      <!-- Projection Chart -->
      <div class="bg-gray-700/30 rounded-lg p-4 mb-6">
        <h4 class="text-md font-medium text-gray-300 mb-4">Proyección de Ahorro</h4>
        
        <!-- Chart SVG -->
        <div class="relative h-64 bg-gray-800 rounded-lg p-4">
          <svg class="w-full h-full" viewBox="0 0 400 200">
            <!-- Grid lines -->
            <defs>
              <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#374151" stroke-width="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            <!-- Goal line -->
            <line 
              [attr.x1]="0" 
              [attr.y1]="goalLineY()" 
              [attr.x2]="400" 
              [attr.y2]="goalLineY()" 
              stroke="#10b981" 
              stroke-width="2" 
              stroke-dasharray="5,5"
            />
            
            <!-- Current savings line -->
            <line 
              [attr.x1]="0" 
              [attr.y1]="currentSavingsY()" 
              [attr.x2]="400" 
              [attr.y2]="currentSavingsY()" 
              stroke="#06b6d4" 
              stroke-width="2"
            />
            
            <!-- Projection line -->
            <polyline 
              [attr.points]="projectionPoints()" 
              fill="none" 
              stroke="#f59e0b" 
              stroke-width="3"
            />
            
            <!-- Goal achievement point -->
            @if (monthsToGoal() <= 24) {
              <circle 
                [attr.cx]="goalPointX()" 
                [attr.cy]="goalLineY()" 
                r="4" 
                fill="#10b981"
              />
            }
          </svg>
          
          <!-- Chart Labels -->
          <div class="absolute top-2 left-4 text-xs text-gray-400">
            {{ formatCurrency(savingsData().downPaymentGoal) }}
          </div>
          <div class="absolute bottom-2 left-4 text-xs text-gray-400">
            $0
          </div>
          <div class="absolute bottom-2 right-4 text-xs text-gray-400">
            24 meses
          </div>
        </div>
        
        <!-- Chart Legend -->
        <div class="flex flex-wrap gap-4 mt-4">
          <div class="flex items-center">
            <div class="w-3 h-0.5 bg-emerald-500 mr-2"></div>
            <span class="text-xs text-gray-300">Meta de Enganche</span>
          </div>
          <div class="flex items-center">
            <div class="w-3 h-0.5 bg-primary-cyan-400 mr-2"></div>
            <span class="text-xs text-gray-300">Ahorro Actual</span>
          </div>
          <div class="flex items-center">
            <div class="w-3 h-0.5 bg-amber-500 mr-2"></div>
            <span class="text-xs text-gray-300">Proyección</span>
          </div>
        </div>
      </div>
      
      <!-- Results Summary -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-gray-700/50 rounded-lg p-4 text-center">
          <p class="text-sm text-gray-400">Meta de Enganche</p>
          <p class="text-xl font-bold text-emerald-400">{{ formatCurrency(savingsData().downPaymentGoal) }}</p>
        </div>
        <div class="bg-gray-700/50 rounded-lg p-4 text-center">
          <p class="text-sm text-gray-400">Tiempo Estimado</p>
          <p class="text-xl font-bold text-amber-400">{{ monthsToGoal() }} meses</p>
        </div>
        <div class="bg-gray-700/50 rounded-lg p-4 text-center">
          <p class="text-sm text-gray-400">Fecha Objetivo</p>
          <p class="text-lg font-semibold text-primary-cyan-400">{{ formatTargetDate() }}</p>
        </div>
      </div>
    </div>
  `
})
export class SavingsProjectionChartComponent {
  @Input() set savingsConfiguration(value: SavingsData | null) {
    if (value) {
      this.savingsData.set(value);
      this.consumptionLiters = value.consumptionLiters;
      this.pricePerLiter = value.pricePerLiter;
      this.monthlyVoluntary = value.monthlyVoluntary;
    }
  }

  protected readonly savingsData = signal<SavingsData>({
    downPaymentGoal: 153075, // 15% of full package in EdoMex
    currentSavings: 25000,
    monthlyCollection: 0,
    monthlyVoluntary: 2000,
    consumptionLiters: 800,
    pricePerLiter: 8
  });

  // Reactive properties
  consumptionLiters = 800;
  pricePerLiter = 8;
  monthlyVoluntary = 2000;

  readonly monthlyCollectionAmount = computed(() => {
    return this.consumptionLiters * this.pricePerLiter;
  });

  readonly totalMonthlySavings = computed(() => {
    return this.monthlyCollectionAmount() + this.monthlyVoluntary;
  });

  readonly monthsToGoal = computed(() => {
    const remaining = this.savingsData().downPaymentGoal - this.savingsData().currentSavings;
    const monthly = this.totalMonthlySavings();
    return monthly > 0 ? Math.ceil(remaining / monthly) : 999;
  });

  readonly goalLineY = computed(() => {
    return 20; // Top 20px (representing the goal)
  });

  readonly currentSavingsY = computed(() => {
    const currentRatio = this.savingsData().currentSavings / this.savingsData().downPaymentGoal;
    return 180 - (currentRatio * 160); // Scale within chart area
  });

  readonly goalPointX = computed(() => {
    return Math.min(this.monthsToGoal() * 16.67, 400); // 24 months = 400px width
  });

  readonly projectionPoints = computed(() => {
    const points: string[] = [];
    const current = this.savingsData().currentSavings;
    const monthly = this.totalMonthlySavings();
    const goal = this.savingsData().downPaymentGoal;
    
    for (let month = 0; month <= Math.min(this.monthsToGoal(), 24); month++) {
      const amount = current + (monthly * month);
      const x = month * 16.67; // Scale to 400px width
      const y = 180 - ((amount / goal) * 160); // Scale within chart area
      points.push(`${x},${Math.max(y, 20)}`); // Don't go above goal line
    }
    
    return points.join(' ');
  });

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatTargetDate(): string {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + this.monthsToGoal());
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short'
    }).format(targetDate);
  }
}