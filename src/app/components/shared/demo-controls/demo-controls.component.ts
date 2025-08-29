import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocalStorageService, DataSyncStatus } from '../../../services/local-storage.service';
import { DataSyncService, SyncResult } from '../../../services/data-sync.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-demo-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="demo-controls-container">
      <!-- Demo Mode Toggle -->
      <div class="demo-mode-section">
        <div class="section-header">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <i class="fas fa-flask text-blue-400"></i>
            Modo Demo
          </h3>
          <div class="demo-toggle">
            <input 
              type="checkbox" 
              id="demo-mode" 
              [checked]="isDemoMode()" 
              (change)="toggleDemoMode($event)"
              class="toggle-checkbox">
            <label for="demo-mode" class="toggle-label">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <p class="text-sm text-gray-400 mb-4">
          En modo demo, todos los datos se guardan localmente y no se sincronizan con el servidor.
        </p>

        @if (isDemoMode()) {
          <div class="demo-actions">
            <button 
              (click)="generateDemoData()"
              [disabled]="isLoading()"
              class="demo-button primary">
              <i class="fas fa-magic mr-2"></i>
              Generar Datos Demo
            </button>
            
            <button 
              (click)="clearAllData()"
              [disabled]="isLoading()"
              class="demo-button danger">
              <i class="fas fa-trash mr-2"></i>
              Limpiar Datos
            </button>
          </div>
        }
      </div>

      <!-- Data Statistics -->
      <div class="data-stats-section">
        <h4 class="text-md font-medium text-white mb-3">Estadísticas de Datos</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-number">{{dataStats().clients}}</div>
            <div class="stat-label">Clientes</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{dataStats().quotes}}</div>
            <div class="stat-label">Cotizaciones</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{dataStats().documents}}</div>
            <div class="stat-label">Documentos</div>
          </div>
        </div>
      </div>

      <!-- Storage Usage -->
      <div class="storage-section">
        <h4 class="text-md font-medium text-white mb-3">Uso de Almacenamiento</h4>
        <div class="storage-bar">
          <div class="storage-fill" [style.width.%]="storageStats().percentage"></div>
        </div>
        <div class="storage-info">
          <span class="text-sm text-gray-300">
            {{formatBytes(storageStats().used)}} / {{formatBytes(storageStats().available)}}
          </span>
          <span class="text-sm text-gray-300">
            {{storageStats().percentage.toFixed(1)}}% usado
          </span>
        </div>
      </div>

      <!-- Sync Status (only when not in demo mode) -->
      @if (!isDemoMode()) {
        <div class="sync-section">
          <h4 class="text-md font-medium text-white mb-3 flex items-center gap-2">
            <i class="fas fa-sync text-green-400"></i>
            Estado de Sincronización
          </h4>
          
          <div class="sync-info">
            <div class="sync-status" [class]="getSyncStatusClass()">
              <i [class]="getSyncStatusIcon()"></i>
              <span>{{getSyncStatusText()}}</span>
            </div>
            
            @if (syncStatus().lastSync) {
              <div class="text-xs text-gray-400">
                Última sincronización: {{formatDate(syncStatus().lastSync!)}}
              </div>
            }
            
            @if (syncStatus().unsyncedChanges > 0) {
              <div class="text-xs text-orange-400">
                {{syncStatus().unsyncedChanges}} cambios pendientes
              </div>
            }
          </div>

          <div class="sync-actions">
            <button 
              (click)="syncNow()"
              [disabled]="isLoading() || isSyncing()"
              class="sync-button">
              @if (isSyncing()) {
                <i class="fas fa-spinner fa-spin mr-2"></i>
                Sincronizando...
              } @else {
                <i class="fas fa-sync mr-2"></i>
                Sincronizar Ahora
              }
            </button>
            
            <button 
              (click)="pullFromServer()"
              [disabled]="isLoading() || isSyncing()"
              class="sync-button secondary">
              <i class="fas fa-download mr-2"></i>
              Actualizar desde Servidor
            </button>
          </div>
        </div>
      }

      <!-- Import/Export -->
      <div class="import-export-section">
        <h4 class="text-md font-medium text-white mb-3">Importar/Exportar Datos</h4>
        
        <div class="import-export-actions">
          <button 
            (click)="exportData()"
            [disabled]="isLoading()"
            class="export-button">
            <i class="fas fa-download mr-2"></i>
            Exportar Datos
          </button>
          
          <div class="import-section">
            <input 
              #fileInput 
              type="file" 
              accept=".json"
              (change)="onImportFile($event)"
              class="file-input">
            <button 
              (click)="fileInput.click()"
              [disabled]="isLoading()"
              class="import-button">
              <i class="fas fa-upload mr-2"></i>
              Importar Datos
            </button>
          </div>
        </div>
      </div>

      <!-- Loading Overlay -->
      @if (isLoading()) {
        <div class="loading-overlay">
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin text-2xl text-blue-400"></i>
            <p class="text-white mt-2">{{loadingMessage()}}</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .demo-controls-container {
      @apply bg-gray-800 rounded-lg p-6 space-y-6 relative;
    }

    .section-header {
      @apply flex items-center justify-between mb-4;
    }

    .demo-toggle {
      @apply relative;
    }

    .toggle-checkbox {
      @apply sr-only;
    }

    .toggle-label {
      @apply flex items-center cursor-pointer;
    }

    .toggle-slider {
      @apply relative inline-block w-12 h-6 bg-gray-600 rounded-full transition-colors;
    }

    .toggle-slider::before {
      @apply absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform;
      content: '';
    }

    .toggle-checkbox:checked + .toggle-label .toggle-slider {
      @apply bg-blue-500;
    }

    .toggle-checkbox:checked + .toggle-label .toggle-slider::before {
      @apply transform translate-x-6;
    }

    .demo-actions {
      @apply flex gap-3 flex-wrap;
    }

    .demo-button {
      @apply px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50;
    }

    .demo-button.primary {
      @apply bg-blue-600 hover:bg-blue-700 text-white;
    }

    .demo-button.danger {
      @apply bg-red-600 hover:bg-red-700 text-white;
    }

    .stats-grid {
      @apply grid grid-cols-3 gap-4;
    }

    .stat-item {
      @apply text-center p-3 bg-gray-700 rounded-lg;
    }

    .stat-number {
      @apply text-2xl font-bold text-white;
    }

    .stat-label {
      @apply text-xs text-gray-400;
    }

    .storage-bar {
      @apply w-full bg-gray-700 rounded-full h-3 mb-2;
    }

    .storage-fill {
      @apply bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all;
    }

    .storage-info {
      @apply flex justify-between;
    }

    .sync-info {
      @apply space-y-2 mb-4;
    }

    .sync-status {
      @apply flex items-center gap-2 text-sm;
    }

    .sync-status.online {
      @apply text-green-400;
    }

    .sync-status.offline {
      @apply text-red-400;
    }

    .sync-status.syncing {
      @apply text-yellow-400;
    }

    .sync-actions {
      @apply flex gap-3 flex-wrap;
    }

    .sync-button {
      @apply px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50;
    }

    .sync-button:not(.secondary) {
      @apply bg-green-600 hover:bg-green-700 text-white;
    }

    .sync-button.secondary {
      @apply bg-gray-600 hover:bg-gray-700 text-white;
    }

    .import-export-actions {
      @apply flex gap-3 flex-wrap items-center;
    }

    .export-button, .import-button {
      @apply px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50;
      @apply bg-purple-600 hover:bg-purple-700 text-white;
    }

    .file-input {
      @apply hidden;
    }

    .loading-overlay {
      @apply absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center rounded-lg;
    }

    .loading-spinner {
      @apply text-center;
    }
  `]
})
export class DemoControlsComponent {
  // State signals
  protected readonly isLoading = signal(false);
  protected readonly loadingMessage = signal('');
  protected readonly isSyncing = signal(false);

  // Computed values from services - initialized in constructor
  protected readonly isDemoMode = signal(false);
  protected readonly dataStats = signal({ clients: 0, quotes: 0, documents: 0 });
  protected readonly storageStats = signal({
    used: 0,
    available: 5 * 1024 * 1024, // 5MB
    percentage: 0
  });
  protected readonly syncStatus = signal<DataSyncStatus>({
    isOnline: navigator.onLine,
    lastSync: null,
    pendingSync: false,
    unsyncedChanges: 0
  });

  constructor(
    private localStorageService: LocalStorageService,
    private dataSyncService: DataSyncService,
    private toastService: ToastService
  ) {
    // Initialize computed properties after services are available
    this.isDemoMode.set(this.localStorageService.isDemoMode());
    this.dataStats.set(this.localStorageService.dataStats());
    this.initializeComponent();
  }

  private initializeComponent(): void {
    // Subscribe to storage stats
    this.localStorageService.getStorageStats().subscribe(stats => {
      this.storageStats.set(stats);
    });

    // Subscribe to sync status
    this.dataSyncService.getSyncStatus().subscribe(status => {
      this.syncStatus.set(status);
    });

    // Monitor sync service for syncing state
    this.dataSyncService.getSyncQueue().subscribe(queue => {
      const syncing = queue.some(op => op.status === 'syncing');
      this.isSyncing.set(syncing);
    });
  }

  protected toggleDemoMode(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const enabled = checkbox.checked;
    
    this.localStorageService.setDemoMode(enabled);
    
    if (enabled) {
      this.toastService.info('Modo demo activado. Los datos se guardan localmente.');
    } else {
      this.toastService.info('Modo demo desactivado. Los datos se sincronizarán con el servidor.');
    }
  }

  protected async generateDemoData(): Promise<void> {
    this.setLoading(true, 'Generando datos demo...');
    
    try {
      await this.localStorageService.generateDemoData().toPromise();
      this.toastService.success('Datos demo generados exitosamente');
    } catch (error) {
      this.toastService.error('Error al generar datos demo');
      console.error('Demo data generation failed:', error);
    } finally {
      this.setLoading(false);
    }
  }

  protected async clearAllData(): Promise<void> {
    if (!confirm('¿Estás seguro de que quieres eliminar todos los datos? Esta acción no se puede deshacer.')) {
      return;
    }

    this.setLoading(true, 'Eliminando todos los datos...');
    
    try {
      await this.localStorageService.clearAllData().toPromise();
      this.dataSyncService.clearSyncQueue();
      this.toastService.success('Todos los datos han sido eliminados');
    } catch (error) {
      this.toastService.error('Error al eliminar los datos');
      console.error('Clear data failed:', error);
    } finally {
      this.setLoading(false);
    }
  }

  protected async syncNow(): Promise<void> {
    if (!navigator.onLine) {
      this.toastService.error('Dispositivo sin conexión. No se puede sincronizar.');
      return;
    }

    this.setLoading(true, 'Sincronizando con el servidor...');
    
    try {
      const result = await this.dataSyncService.syncNow().toPromise();
      
      if (result?.success) {
        this.toastService.success(`Sincronización completada. ${result.operations} operaciones procesadas.`);
      } else {
        this.toastService.error(`Sincronización completada con errores: ${result?.errors?.join(', ') || 'Error desconocido'}`);
      }
    } catch (error) {
      this.toastService.error('Error durante la sincronización');
      console.error('Sync failed:', error);
    } finally {
      this.setLoading(false);
    }
  }

  protected async pullFromServer(): Promise<void> {
    if (!navigator.onLine) {
      this.toastService.error('Dispositivo sin conexión. No se puede actualizar.');
      return;
    }

    this.setLoading(true, 'Actualizando desde el servidor...');
    
    try {
      const result = await this.dataSyncService.pullFromRemote().toPromise();
      this.toastService.success('Datos actualizados desde el servidor');
    } catch (error) {
      this.toastService.error('Error al actualizar desde el servidor');
      console.error('Pull failed:', error);
    } finally {
      this.setLoading(false);
    }
  }

  protected async exportData(): Promise<void> {
    this.setLoading(true, 'Exportando datos...');
    
    try {
      const jsonData = await this.localStorageService.exportData().toPromise();
      
      // Create and download file
      const blob = new Blob([jsonData || '{}'], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `conductores_pwa_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      this.toastService.success('Datos exportados exitosamente');
    } catch (error) {
      this.toastService.error('Error al exportar los datos');
      console.error('Export failed:', error);
    } finally {
      this.setLoading(false);
    }
  }

  protected async onImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    this.setLoading(true, 'Importando datos...');
    
    try {
      const text = await this.readFileAsText(file);
      const success = await this.localStorageService.importData(text).toPromise();
      
      if (success) {
        this.toastService.success('Datos importados exitosamente');
      } else {
        this.toastService.error('Error al importar los datos. Verifica el formato del archivo.');
      }
    } catch (error) {
      this.toastService.error('Error al leer el archivo');
      console.error('Import failed:', error);
    } finally {
      this.setLoading(false);
      input.value = ''; // Reset input
    }
  }

  // Helper methods
  private setLoading(loading: boolean, message: string = ''): void {
    this.isLoading.set(loading);
    this.loadingMessage.set(message);
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  protected getSyncStatusClass(): string {
    const status = this.syncStatus();
    if (!status.isOnline) return 'offline';
    if (status.pendingSync) return 'syncing';
    return 'online';
  }

  protected getSyncStatusIcon(): string {
    const status = this.syncStatus();
    if (!status.isOnline) return 'fas fa-wifi-slash';
    if (status.pendingSync) return 'fas fa-spinner fa-spin';
    return 'fas fa-wifi';
  }

  protected getSyncStatusText(): string {
    const status = this.syncStatus();
    if (!status.isOnline) return 'Sin conexión';
    if (status.pendingSync) return 'Sincronizando...';
    return 'Conectado';
  }

  protected formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  protected formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}