import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError, EMPTY, timer } from 'rxjs';
import { switchMap, catchError, retry, tap, finalize, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LocalStorageService, LocalDataState, DataSyncStatus } from './local-storage.service';
import { OdooApiService } from './odoo-api.service';
import { MakeIntegrationService } from './make-integration.service';
import { Client, CollectiveCreditGroup, Quote } from '../models/types';

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'client' | 'group' | 'quote' | 'document';
  entityId: string;
  data: any;
  timestamp: Date;
  retries: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

export interface SyncResult {
  success: boolean;
  operations: number;
  errors: string[];
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class DataSyncService {
  private readonly MAX_RETRIES = 3;
  private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly BATCH_SIZE = 10;

  // State management
  private syncQueue = new BehaviorSubject<SyncOperation[]>([]);
  private isSyncing = signal(false);
  private lastSyncAttempt = signal<Date | null>(null);
  private syncErrors = signal<string[]>([]);

  // Auto-sync timer
  private autoSyncSubscription?: any;

  constructor(
    private http: HttpClient,
    private localStorageService: LocalStorageService,
    private odooApiService: OdooApiService,
    private makeIntegrationService: MakeIntegrationService
  ) {
    this.initializeSync();
  }

  // ===== PUBLIC API =====

  /**
   * Queue an operation for synchronization
   */
  queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries' | 'status'>): void {
    const syncOp: SyncOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: new Date(),
      retries: 0,
      status: 'pending'
    };

    const currentQueue = this.syncQueue.value;
    this.syncQueue.next([...currentQueue, syncOp]);
    
    // Auto-trigger sync if online and not already syncing
    if (navigator.onLine && !this.isSyncing()) {
      setTimeout(() => this.performSync(), 1000);
    }
  }

  /**
   * Manually trigger synchronization
   */
  syncNow(): Observable<SyncResult> {
    if (this.isSyncing()) {
      return throwError(() => new Error('Sync already in progress'));
    }

    if (!navigator.onLine) {
      return throwError(() => new Error('Device is offline'));
    }

    return this.performSync();
  }

  /**
   * Get current sync queue
   */
  getSyncQueue(): Observable<SyncOperation[]> {
    return this.syncQueue.asObservable();
  }

  /**
   * Get sync status
   */
  getSyncStatus(): Observable<DataSyncStatus> {
    return this.localStorageService.getSyncStatus();
  }

  /**
   * Clear sync queue (useful for debugging)
   */
  clearSyncQueue(): void {
    this.syncQueue.next([]);
    this.syncErrors.set([]);
  }

  /**
   * Enable/disable auto-sync
   */
  setAutoSync(enabled: boolean): void {
    if (enabled && !this.autoSyncSubscription) {
      this.autoSyncSubscription = timer(0, this.SYNC_INTERVAL)
        .pipe(
          switchMap(() => {
            if (navigator.onLine && !this.isSyncing() && this.hasPendingOperations()) {
              return this.performSync();
            }
            return EMPTY;
          })
        )
        .subscribe();
    } else if (!enabled && this.autoSyncSubscription) {
      this.autoSyncSubscription.unsubscribe();
      this.autoSyncSubscription = undefined;
    }
  }

  /**
   * Force sync all local data to remote
   */
  forceSyncAll(): Observable<SyncResult> {
    return this.localStorageService.getDataState().pipe(
      switchMap((localState) => {
        // Queue all local data for sync
        this.queueAllDataForSync(localState);
        return this.performSync();
      })
    );
  }

  /**
   * Pull latest data from remote and merge with local
   */
  pullFromRemote(): Observable<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    return this.odooApiService.getClientes().pipe(
      map(() => {
        const duration = Date.now() - startTime;
        const result: SyncResult = {
          success: true,
          operations: 0,
          errors: [],
          duration
        };
        this.updateSyncStatus(result);
        return result;
      }),
      catchError(() => {
        const duration = Date.now() - startTime;
        const result: SyncResult = {
          success: false,
          operations: 0,
          errors: ['Sync failed'],
          duration
        };
        this.updateSyncStatus(result);
        return of(result);
      })
    );
  }

  // ===== PRIVATE METHODS =====

  private initializeSync(): void {
    // Enable auto-sync by default
    this.setAutoSync(true);

    // Listen to online/offline events
    window.addEventListener('online', () => {
      if (this.hasPendingOperations()) {
        setTimeout(() => this.performSync(), 2000);
      }
    });
  }

  private performSync(): Observable<SyncResult> {
    if (this.isSyncing()) {
      return throwError(() => new Error('Sync already in progress'));
    }

    this.isSyncing.set(true);
    this.lastSyncAttempt.set(new Date());
    this.syncErrors.set([]);

    const startTime = Date.now();
    const pendingOps = this.syncQueue.value.filter(op => op.status === 'pending' || op.status === 'failed');
    
    if (pendingOps.length === 0) {
      this.isSyncing.set(false);
      return of({
        success: true,
        operations: 0,
        errors: [],
        duration: 0
      });
    }

    // Process operations in batches
    const batches = this.chunkArray(pendingOps, this.BATCH_SIZE);
    
    return this.processBatches(batches).pipe(
      tap((result) => {
        this.updateSyncStatus(result);
      }),
      finalize(() => {
        this.isSyncing.set(false);
        const duration = Date.now() - startTime;
        console.log(`Sync completed in ${duration}ms`);
      })
    );
  }

  private processBatches(batches: SyncOperation[][]): Observable<SyncResult> {
    const allErrors: string[] = [];
    let totalOperations = 0;

    return new Observable<SyncResult>(observer => {
      const processBatch = (batchIndex: number) => {
        if (batchIndex >= batches.length) {
          // All batches processed
          observer.next({
            success: allErrors.length === 0,
            operations: totalOperations,
            errors: allErrors,
            duration: 0
          });
          observer.complete();
          return;
        }

        const batch = batches[batchIndex];
        this.syncBatch(batch).subscribe({
          next: (result) => {
            totalOperations += result.operations;
            allErrors.push(...result.errors);
            
            // Process next batch
            processBatch(batchIndex + 1);
          },
          error: (error) => {
            allErrors.push(`Batch ${batchIndex + 1} failed: ${error.message}`);
            processBatch(batchIndex + 1); // Continue with next batch
          }
        });
      };

      processBatch(0);
    });
  }

  private syncBatch(operations: SyncOperation[]): Observable<SyncResult> {
    const promises = operations.map(op => this.syncOperation(op));
    const startTime = Date.now();

    return new Observable<SyncResult>(observer => {
      Promise.allSettled(promises).then(results => {
        const errors: string[] = [];
        let successCount = 0;

        results.forEach((result, index) => {
          const operation = operations[index];
          
          if (result.status === 'fulfilled') {
            successCount++;
            this.markOperationCompleted(operation.id);
          } else {
            errors.push(`Operation ${operation.id} failed: ${result.reason}`);
            this.markOperationFailed(operation.id, result.reason);
          }
        });

        observer.next({
          success: errors.length === 0,
          operations: successCount,
          errors,
          duration: Date.now() - startTime
        });
        observer.complete();
      });
    });
  }

  private async syncOperation(operation: SyncOperation): Promise<void> {
    this.markOperationSyncing(operation.id);

    try {
      switch (operation.entity) {
        case 'client':
          await this.syncClient(operation);
          break;
        case 'group':
          await this.syncGroup(operation);
          break;
        case 'quote':
          await this.syncQuote(operation);
          break;
        case 'document':
          await this.syncDocument(operation);
          break;
        default:
          throw new Error(`Unknown entity type: ${operation.entity}`);
      }

      // Send to Make.com for further processing
      await this.notifyMakeIntegration(operation);

    } catch (error) {
      operation.retries++;
      throw error;
    }
  }

  private async syncClient(operation: SyncOperation): Promise<void> {
    const client = operation.data as Client;

    switch (operation.type) {
      case 'create':
        // await this.odooApiService.createClient(client).toPromise(); // Not implemented yet
        break;
      case 'update':
        // await this.odooApiService.updateClient(client.id, client).toPromise(); // Not implemented yet
        break;
      case 'delete':
        // await this.odooApiService.deleteClient(client.id).toPromise(); // Not implemented yet
        break;
    }
  }

  private async syncGroup(operation: SyncOperation): Promise<void> {
    const group = operation.data as CollectiveCreditGroup;

    switch (operation.type) {
      case 'create':
        // await this.odooApiService.createCollectiveGroup(group).toPromise(); // Not implemented yet
        break;
      case 'update':
        // await this.odooApiService.updateCollectiveGroup(group.id, group).toPromise(); // Not implemented yet
        break;
      case 'delete':
        // await this.odooApiService.deleteCollectiveGroup(group.id).toPromise(); // Not implemented yet
        break;
    }
  }

  private async syncQuote(operation: SyncOperation): Promise<void> {
    const quote = operation.data as Quote;
    // Quotes might be handled differently in Odoo
    console.log('Syncing quote:', quote);
  }

  private async syncDocument(operation: SyncOperation): Promise<void> {
    const { clientId, documentData } = operation.data;
    // Handle document upload to Odoo
    console.log('Syncing document for client:', clientId);
  }

  private async notifyMakeIntegration(operation: SyncOperation): Promise<void> {
    try {
      // Notify Make.com about the sync operation
      const eventData = {
        operationType: operation.type,
        entityType: operation.entity,
        entityId: operation.entityId,
        timestamp: new Date()
      };

      await this.makeIntegrationService.notificarEventoEspecial({
        tipo: 'expediente_completo',
        expedienteId: operation.entityId,
        clienteId: operation.entityId,
        data: eventData
      }).toPromise();
    } catch (error) {
      console.warn('Make.com notification failed:', error);
      // Don't throw - sync should succeed even if Make.com fails
    }
  }

  private async mergeRemoteClients(remoteClients: Client[]): Promise<void> {
    for (const remoteClient of remoteClients) {
      await this.localStorageService.saveClient(remoteClient).toPromise();
    }
  }

  private async mergeRemoteGroups(remoteGroups: CollectiveCreditGroup[]): Promise<void> {
    for (const remoteGroup of remoteGroups) {
      await this.localStorageService.saveGroup(remoteGroup).toPromise();
    }
  }

  private queueAllDataForSync(localState: LocalDataState): void {
    // Queue all clients
    localState.clients.forEach(client => {
      this.queueOperation({
        type: 'update',
        entity: 'client',
        entityId: client.id,
        data: client
      });
    });

    // Queue all groups
    localState.groups.forEach(group => {
      this.queueOperation({
        type: 'update',
        entity: 'group',
        entityId: group.id,
        data: group
      });
    });

    // Queue all quotes
    localState.quotes.forEach(quote => {
      this.queueOperation({
        type: 'create',
        entity: 'quote',
        entityId: quote.clientType, // Use clientType as ID for quotes
        data: quote
      });
    });
  }

  private hasPendingOperations(): boolean {
    return this.syncQueue.value.some(op => op.status === 'pending' || op.status === 'failed');
  }

  private updateSyncStatus(result: SyncResult): void {
    // Update local storage sync status
    const status: Partial<DataSyncStatus> = {
      lastSync: new Date(),
      pendingSync: false,
      unsyncedChanges: this.syncQueue.value.filter(op => op.status === 'pending' || op.status === 'failed').length
    };

    // Update through local storage service
    // (This would need to be implemented in LocalStorageService)
  }

  private markOperationSyncing(operationId: string): void {
    this.updateOperationStatus(operationId, 'syncing');
  }

  private markOperationCompleted(operationId: string): void {
    this.updateOperationStatus(operationId, 'completed');
  }

  private markOperationFailed(operationId: string, error: any): void {
    this.updateOperationStatus(operationId, 'failed');
    
    const currentErrors = this.syncErrors();
    this.syncErrors.set([...currentErrors, `Operation ${operationId}: ${error}`]);
  }

  private updateOperationStatus(operationId: string, status: SyncOperation['status']): void {
    const currentQueue = this.syncQueue.value;
    const updatedQueue = currentQueue.map(op => 
      op.id === operationId ? { ...op, status } : op
    );
    this.syncQueue.next(updatedQueue);
  }

  private generateOperationId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}