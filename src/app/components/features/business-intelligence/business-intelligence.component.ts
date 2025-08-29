import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusinessIntelligenceService } from '../../../services/business-intelligence.service';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

interface ExecutiveMetric {
  label: string;
  value: number;
  unit: string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
  }[];
}

@Component({
  selector: 'app-business-intelligence',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-900 p-6">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">
          <i class="fas fa-chart-line mr-3 text-cyan-400"></i>
          Business Intelligence
        </h1>
        <p class="text-gray-400">Panel ejecutivo con métricas en tiempo real y análisis predictivo</p>
      </div>

      <!-- Filters -->
      <div class="bg-gray-800 rounded-lg p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Período</label>
            <select [(ngModel)]="selectedPeriod()" (ngModelChange)="onFilterChange()" 
                    class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500">
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
              <option value="1y">Último año</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Mercado</label>
            <select [(ngModel)]="selectedMarket()" (ngModelChange)="onFilterChange()"
                    class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500">
              <option value="ambos">Todos los mercados</option>
              <option value="aguascalientes">Aguascalientes</option>
              <option value="edomex">Estado de México</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Asesor</label>
            <select [(ngModel)]="selectedAsesor()" (ngModelChange)="onFilterChange()"
                    class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500">
              <option value="">Todos los asesores</option>
              @for (asesor of availableAsesores(); track asesor) {
                <option [value]="asesor">{{ asesor }}</option>
              }
            </select>
          </div>
          <div class="flex items-end">
            <button (click)="refreshDashboard()" [disabled]="isLoading()"
                    class="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
              <i class="fas fa-sync-alt mr-2" [class.animate-spin]="isLoading()"></i>
              {{ isLoading() ? 'Actualizando...' : 'Actualizar' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Executive Metrics -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        @for (metric of executiveMetrics(); track metric.label) {
          <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div class="flex items-center justify-between mb-4">
              <div class="p-3 rounded-lg bg-cyan-600/20">
                <i [class]="metric.icon + ' text-cyan-400 text-xl'"></i>
              </div>
              <div class="text-right">
                <span [class]="getChangeColorClass(metric.changeType) + ' text-sm font-medium flex items-center'">
                  <i [class]="getChangeIcon(metric.changeType) + ' mr-1'"></i>
                  {{ formatChange(metric.change) }}
                </span>
              </div>
            </div>
            <div>
              <p class="text-gray-400 text-sm mb-1">{{ metric.label }}</p>
              <p class="text-white text-2xl font-bold">
                {{ formatMetricValue(metric.value) }}
                <span class="text-gray-400 text-base font-normal ml-1">{{ metric.unit }}</span>
              </p>
            </div>
          </div>
        }
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <!-- Sales Trend Chart -->
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-white">Tendencia de Ventas</h3>
            <select [(ngModel)]="salesChartType()" 
                    class="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm">
              <option value="revenue">Ingresos</option>
              <option value="units">Unidades</option>
              <option value="clients">Clientes</option>
            </select>
          </div>
          <div class="relative h-80">
            @if (salesChartData(); as chartData) {
              <div class="h-full flex items-center justify-center">
                <canvas #salesChart class="w-full h-full"></canvas>
              </div>
            } @else {
              <div class="h-full flex items-center justify-center text-gray-400">
                <div class="text-center">
                  <i class="fas fa-chart-line text-3xl mb-2"></i>
                  <p>Cargando datos del gráfico...</p>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Pipeline Funnel -->
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 class="text-lg font-semibold text-white mb-6">Embudo de Conversión</h3>
          <div class="space-y-4">
            @for (stage of pipelineStages(); track stage.name) {
              <div class="relative">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-gray-300 text-sm">{{ stage.name }}</span>
                  <span class="text-white font-medium">{{ stage.count }}</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-3">
                  <div class="bg-gradient-to-r from-cyan-500 to-cyan-600 h-3 rounded-full transition-all duration-500"
                       [style.width.%]="stage.percentage"></div>
                </div>
                <span class="text-xs text-gray-400 mt-1">{{ stage.percentage }}% del total</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Predictions & Alerts Row -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <!-- Sales Predictions -->
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-white">
              <i class="fas fa-crystal-ball mr-2 text-purple-400"></i>
              Predicciones de Ventas
            </h3>
            <span class="text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded">ML Powered</span>
          </div>
          
          @if (predictions(); as preds) {
            <div class="space-y-4">
              <div class="grid grid-cols-3 gap-4 text-center">
                <div class="bg-gray-700/50 rounded-lg p-4">
                  <p class="text-gray-400 text-xs mb-1">Próxima Semana</p>
                  <p class="text-white text-lg font-bold">{{ formatCurrency(preds.nextWeek) }}</p>
                </div>
                <div class="bg-gray-700/50 rounded-lg p-4">
                  <p class="text-gray-400 text-xs mb-1">Próximo Mes</p>
                  <p class="text-white text-lg font-bold">{{ formatCurrency(preds.nextMonth) }}</p>
                </div>
                <div class="bg-gray-700/50 rounded-lg p-4">
                  <p class="text-gray-400 text-xs mb-1">Próximo Trimestre</p>
                  <p class="text-white text-lg font-bold">{{ formatCurrency(preds.nextQuarter) }}</p>
                </div>
              </div>
              
              <div class="border-t border-gray-700 pt-4">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-400">Confianza del modelo:</span>
                  <span class="text-cyan-400 font-medium">{{ preds.confidence }}%</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2 mt-2">
                  <div class="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full" 
                       [style.width.%]="preds.confidence"></div>
                </div>
              </div>
            </div>
          } @else {
            <div class="flex items-center justify-center py-8 text-gray-400">
              <div class="text-center">
                <i class="fas fa-chart-area text-2xl mb-2"></i>
                <p>Generando predicciones...</p>
              </div>
            </div>
          }
        </div>

        <!-- Intelligent Alerts -->
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-white">
              <i class="fas fa-bell mr-2 text-yellow-400"></i>
              Alertas Inteligentes
            </h3>
            <button (click)="configureAlerts()"
                    class="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              <i class="fas fa-cog mr-1"></i>
              Configurar
            </button>
          </div>
          
          <div class="space-y-3 max-h-80 overflow-y-auto">
            @for (alert of intelligentAlerts(); track alert.id) {
              <div [class]="getAlertBorderClass(alert.severity) + ' bg-gray-700/50 rounded-lg p-4 border-l-4'">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center mb-2">
                      <i [class]="getAlertIcon(alert.type) + ' mr-2 ' + getAlertIconColor(alert.severity)"></i>
                      <span class="text-white text-sm font-medium">{{ alert.title }}</span>
                    </div>
                    <p class="text-gray-300 text-xs">{{ alert.message }}</p>
                    <span class="text-gray-500 text-xs">{{ formatRelativeTime(alert.timestamp) }}</span>
                  </div>
                  <button (click)="dismissAlert(alert.id)"
                          class="text-gray-400 hover:text-gray-300 transition-colors ml-2">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
            } @empty {
              <div class="text-center py-8 text-gray-400">
                <i class="fas fa-check-circle text-2xl mb-2"></i>
                <p>No hay alertas pendientes</p>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Reports Section -->
      <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-white">
            <i class="fas fa-file-alt mr-2 text-green-400"></i>
            Reportes Automatizados
          </h3>
          <div class="flex gap-2">
            <button (click)="scheduleReport()"
                    class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              <i class="fas fa-calendar-plus mr-2"></i>
              Programar Reporte
            </button>
            <button (click)="exportData()"
                    class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              <i class="fas fa-download mr-2"></i>
              Exportar Datos
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (report of scheduledReports(); track report.id) {
            <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-white font-medium text-sm">{{ report.name }}</h4>
                <span [class]="getReportStatusClass(report.status) + ' text-xs px-2 py-1 rounded'">
                  {{ report.status }}
                </span>
              </div>
              <p class="text-gray-400 text-xs mb-3">{{ report.description }}</p>
              <div class="flex items-center justify-between text-xs">
                <span class="text-gray-500">
                  <i class="fas fa-clock mr-1"></i>
                  {{ report.frequency }}
                </span>
                <span class="text-gray-500">
                  Próximo: {{ formatDate(report.nextRun) }}
                </span>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class BusinessIntelligenceComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  // Signals
  selectedPeriod = signal<string>('30d');
  selectedMarket = signal<'aguascalientes' | 'edomex' | 'ambos'>('ambos');
  selectedAsesor = signal<string>('');
  isLoading = signal<boolean>(false);
  
  executiveMetrics = signal<ExecutiveMetric[]>([]);
  salesChartData = signal<ChartData | null>(null);
  salesChartType = signal<'revenue' | 'units' | 'clients'>('revenue');
  pipelineStages = signal<any[]>([]);
  predictions = signal<any>(null);
  intelligentAlerts = signal<any[]>([]);
  scheduledReports = signal<any[]>([]);
  availableAsesores = signal<string[]>([]);

  constructor(private biService: BusinessIntelligenceService) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.setupRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadInitialData(): void {
    this.refreshDashboard();
    this.loadAvailableAsesores();
    this.loadScheduledReports();
  }

  private setupRealTimeUpdates(): void {
    // Real-time KPIs update every 30 seconds
    this.subscriptions.add(
      this.biService.getRealTimeKPIs().subscribe(kpis => {
        this.updateExecutiveMetrics(kpis);
      })
    );

    // Real-time alerts
    this.subscriptions.add(
      this.biService.getIntelligentAlerts().subscribe(alerts => {
        this.intelligentAlerts.set(alerts);
      })
    );
  }

  onFilterChange(): void {
    this.refreshDashboard();
  }

  refreshDashboard(): void {
    this.isLoading.set(true);
    
    const params = {
      fechaInicio: this.getStartDate(),
      fechaFin: new Date().toISOString().split('T')[0],
      mercado: this.selectedMarket() as any,
      asesor: this.selectedAsesor() || undefined
    };

    this.subscriptions.add(
      this.biService.getExecutiveDashboard(params).subscribe({
        next: (dashboard) => {
          this.updateExecutiveMetrics(dashboard.kpis);
          this.updateSalesChart(dashboard.salesTrend);
          this.updatePipelineStages(dashboard.pipelineData);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading dashboard:', error);
          this.isLoading.set(false);
        }
      })
    );

    // Load predictions
    this.subscriptions.add(
      this.biService.getSalesPredictions(params).subscribe(predictions => {
        this.predictions.set(predictions);
      })
    );
  }

  private getStartDate(): string {
    const now = new Date();
    const period = this.selectedPeriod();
    
    switch (period) {
      case '7d':
        now.setDate(now.getDate() - 7);
        break;
      case '30d':
        now.setDate(now.getDate() - 30);
        break;
      case '90d':
        now.setDate(now.getDate() - 90);
        break;
      case '1y':
        now.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return now.toISOString().split('T')[0];
  }

  private updateExecutiveMetrics(kpis: any): void {
    const metrics: ExecutiveMetric[] = [
      {
        label: 'Ventas Totales',
        value: kpis.totalVentas || 0,
        unit: 'MXN',
        change: kpis.ventasChange || 0,
        changeType: this.getChangeType(kpis.ventasChange),
        icon: 'fas fa-dollar-sign'
      },
      {
        label: 'Unidades Vendidas',
        value: kpis.unidadesVendidas || 0,
        unit: 'vagonetas',
        change: kpis.unidadesChange || 0,
        changeType: this.getChangeType(kpis.unidadesChange),
        icon: 'fas fa-truck'
      },
      {
        label: 'Clientes Activos',
        value: kpis.clientesActivos || 0,
        unit: 'clientes',
        change: kpis.clientesChange || 0,
        changeType: this.getChangeType(kpis.clientesChange),
        icon: 'fas fa-users'
      },
      {
        label: 'Tasa Conversión',
        value: kpis.tasaConversion || 0,
        unit: '%',
        change: kpis.conversionChange || 0,
        changeType: this.getChangeType(kpis.conversionChange),
        icon: 'fas fa-percentage'
      }
    ];
    
    this.executiveMetrics.set(metrics);
  }

  private updateSalesChart(salesTrend: any[]): void {
    if (!salesTrend || salesTrend.length === 0) return;

    const chartData: ChartData = {
      labels: salesTrend.map(item => item.fecha),
      datasets: [{
        label: this.getChartLabel(),
        data: salesTrend.map(item => this.getChartValue(item)),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true
      }]
    };

    this.salesChartData.set(chartData);
  }

  private getChartLabel(): string {
    const type = this.salesChartType();
    switch (type) {
      case 'revenue': return 'Ingresos (MXN)';
      case 'units': return 'Unidades Vendidas';
      case 'clients': return 'Nuevos Clientes';
      default: return '';
    }
  }

  private getChartValue(item: any): number {
    const type = this.salesChartType();
    switch (type) {
      case 'revenue': return item.ingresos || 0;
      case 'units': return item.unidades || 0;
      case 'clients': return item.clientes || 0;
      default: return 0;
    }
  }

  private updatePipelineStages(pipelineData: any[]): void {
    if (!pipelineData) return;
    
    const total = pipelineData.reduce((sum, stage) => sum + stage.count, 0);
    const stages = pipelineData.map(stage => ({
      ...stage,
      percentage: total > 0 ? (stage.count / total) * 100 : 0
    }));
    
    this.pipelineStages.set(stages);
  }

  private loadAvailableAsesores(): void {
    // In a real implementation, this would come from the service
    this.availableAsesores.set([
      'Juan Pérez', 'María González', 'Carlos López', 'Ana Martínez'
    ]);
  }

  private loadScheduledReports(): void {
    this.subscriptions.add(
      this.biService.getScheduledReports().subscribe(reports => {
        this.scheduledReports.set(reports);
      })
    );
  }

  private getChangeType(change: number): 'increase' | 'decrease' | 'neutral' {
    if (change > 0) return 'increase';
    if (change < 0) return 'decrease';
    return 'neutral';
  }

  // UI Helper Methods
  getChangeColorClass(type: string): string {
    switch (type) {
      case 'increase': return 'text-green-400';
      case 'decrease': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }

  getChangeIcon(type: string): string {
    switch (type) {
      case 'increase': return 'fas fa-arrow-up';
      case 'decrease': return 'fas fa-arrow-down';
      default: return 'fas fa-minus';
    }
  }

  formatChange(change: number): string {
    const abs = Math.abs(change);
    return abs < 1 ? `${abs.toFixed(2)}%` : `${abs.toFixed(1)}%`;
  }

  formatMetricValue(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short'
    });
  }

  formatRelativeTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 60) return `hace ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  }

  getAlertBorderClass(severity: string): string {
    switch (severity) {
      case 'high': return 'border-red-500';
      case 'medium': return 'border-yellow-500';
      case 'low': return 'border-blue-500';
      default: return 'border-gray-500';
    }
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'performance': return 'fas fa-chart-line';
      case 'system': return 'fas fa-server';
      case 'client': return 'fas fa-user';
      case 'financial': return 'fas fa-dollar-sign';
      default: return 'fas fa-info-circle';
    }
  }

  getAlertIconColor(severity: string): string {
    switch (severity) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  }

  getReportStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'bg-green-600/20 text-green-300';
      case 'paused': return 'bg-yellow-600/20 text-yellow-300';
      case 'error': return 'bg-red-600/20 text-red-300';
      default: return 'bg-gray-600/20 text-gray-300';
    }
  }

  // Actions
  configureAlerts(): void {
    // This would open a modal or navigate to alerts configuration
    console.log('Configure alerts');
  }

  dismissAlert(alertId: string): void {
    this.subscriptions.add(
      this.biService.dismissAlert(alertId).subscribe(() => {
        const alerts = this.intelligentAlerts();
        this.intelligentAlerts.set(alerts.filter(a => a.id !== alertId));
      })
    );
  }

  scheduleReport(): void {
    // This would open a modal for scheduling new reports
    console.log('Schedule report');
  }

  exportData(): void {
    const params = {
      fechaInicio: this.getStartDate(),
      fechaFin: new Date().toISOString().split('T')[0],
      mercado: this.selectedMarket(),
      asesor: this.selectedAsesor() || undefined
    };

    this.subscriptions.add(
      this.biService.exportBusinessData(params).subscribe(response => {
        // Handle file download
        const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `business-intelligence-${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
      })
    );
  }
}