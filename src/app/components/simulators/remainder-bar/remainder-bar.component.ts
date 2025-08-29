import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface RemainderData {
  totalValue: number;
  initialDownPayment: number;
  projectedSavings: number;
  remainderAmount: number;
  deliveryDate: Date;
}

@Component({
  selector: 'app-remainder-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 class="text-lg font-semibold text-white mb-4">Proyección de Ahorro y Liquidación</h3>
      
      <!-- Visual Progress Bar -->
      <div class="relative w-full h-12 bg-gray-700 rounded-lg overflow-hidden mb-4">
        <!-- Initial Down Payment -->
        <div 
          class="absolute left-0 top-0 h-full bg-primary-cyan-600 flex items-center justify-center text-white text-xs font-semibold"
          [style.width.%]="downPaymentPercentage"
        >
          @if (downPaymentPercentage > 15) {
            Enganche
          }
        </div>
        
        <!-- Projected Savings -->
        <div 
          class="absolute top-0 h-full bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold"
          [style.left.%]="downPaymentPercentage"
          [style.width.%]="savingsPercentage"
        >
          @if (savingsPercentage > 10) {
            Ahorro
          }
        </div>
        
        <!-- Remainder Amount -->
        <div 
          class="absolute top-0 h-full bg-amber-500 flex items-center justify-center text-white text-xs font-semibold"
          [style.left.%]="downPaymentPercentage + savingsPercentage"
          [style.width.%]="remainderPercentage"
        >
          @if (remainderPercentage > 10) {
            Remanente
          }
        </div>
      </div>
      
      <!-- Legend -->
      <div class="flex flex-wrap gap-4 mb-4">
        <div class="flex items-center">
          <div class="w-3 h-3 bg-primary-cyan-600 rounded mr-2"></div>
          <span class="text-sm text-gray-300">Enganche: {{ formatCurrency(data().initialDownPayment) }}</span>
        </div>
        <div class="flex items-center">
          <div class="w-3 h-3 bg-emerald-500 rounded mr-2"></div>
          <span class="text-sm text-gray-300">Ahorro Proyectado: {{ formatCurrency(data().projectedSavings) }}</span>
        </div>
        <div class="flex items-center">
          <div class="w-3 h-3 bg-amber-500 rounded mr-2"></div>
          <span class="text-sm text-gray-300">Remanente a Liquidar: {{ formatCurrency(data().remainderAmount) }}</span>
        </div>
      </div>
      
      <!-- Summary -->
      <div class="bg-gray-700/50 rounded-lg p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-400">Valor Total</p>
            <p class="text-xl font-bold text-white">{{ formatCurrency(data().totalValue) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-400">Fecha Estimada de Entrega</p>
            <p class="text-lg font-semibold text-primary-cyan-400">{{ formatDate(data().deliveryDate) }}</p>
          </div>
        </div>
        
        @if (data().remainderAmount > 0) {
          <div class="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div class="flex items-start">
              <i class="fas fa-info-circle text-amber-400 mt-1 mr-3"></i>
              <div>
                <p class="text-sm font-semibold text-amber-400">Remanente Pendiente</p>
                <p class="text-xs text-amber-300 mt-1">
                  Al momento de la entrega, será necesario liquidar {{ formatCurrency(data().remainderAmount) }} adicionales para completar el pago de la unidad.
                </p>
              </div>
            </div>
          </div>
        } @else {
          <div class="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <div class="flex items-center">
              <i class="fas fa-check-circle text-emerald-400 mr-3"></i>
              <div>
                <p class="text-sm font-semibold text-emerald-400">¡Totalmente Cubierto!</p>
                <p class="text-xs text-emerald-300">Con el enganche y ahorro proyectado, la unidad quedará completamente pagada.</p>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class RemainderBarComponent {
  @Input() set remainderData(value: RemainderData | null) {
    if (value) {
      this.data.set(value);
    }
  }

  protected readonly data = signal<RemainderData>({
    totalValue: 799000,
    initialDownPayment: 400000,
    projectedSavings: 250000,
    remainderAmount: 149000,
    deliveryDate: new Date(Date.now() + 4 * 30 * 24 * 60 * 60 * 1000) // 4 months from now
  });

  get downPaymentPercentage(): number {
    return (this.data().initialDownPayment / this.data().totalValue) * 100;
  }

  get savingsPercentage(): number {
    return (this.data().projectedSavings / this.data().totalValue) * 100;
  }

  get remainderPercentage(): number {
    return (this.data().remainderAmount / this.data().totalValue) * 100;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }
}