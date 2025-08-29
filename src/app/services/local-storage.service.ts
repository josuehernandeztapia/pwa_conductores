import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { Client, CollectiveCreditGroup, Quote, Notification } from '../models/types';
import { KinbanScoreResponse } from './kinban-scoring.service';

export interface LocalDataState {
  clients: Client[];
  groups: CollectiveCreditGroup[];
  quotes: Quote[];
  notifications: Notification[];
  scores: { [clientId: string]: KinbanScoreResponse };
  lastUpdated: Date;
  demoMode: boolean;
  dataVersion: string;
}

export interface DataSyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingSync: boolean;
  unsyncedChanges: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  private readonly STORAGE_KEY = 'conductores_pwa_data';
  private readonly SETTINGS_KEY = 'conductores_pwa_settings';
  private readonly VERSION = '1.0.0';
  
  // Reactive state
  private dataState = new BehaviorSubject<LocalDataState>(this.getInitialState());
  private syncStatus = new BehaviorSubject<DataSyncStatus>({
    isOnline: navigator.onLine,
    lastSync: null,
    pendingSync: false,
    unsyncedChanges: 0
  });

  // Signals for components
  public readonly isDemoMode = signal(false);
  public readonly dataStats = signal({ clients: 0, quotes: 0, documents: 0 });

  constructor() {
    this.initializeService();
    this.setupOnlineListener();
  }

  // ===== PUBLIC API =====

  /**
   * Get current data state as observable
   */
  getDataState(): Observable<LocalDataState> {
    return this.dataState.asObservable();
  }

  /**
   * Get sync status as observable
   */
  getSyncStatus(): Observable<DataSyncStatus> {
    return this.syncStatus.asObservable();
  }

  /**
   * Enable/disable demo mode
   */
  setDemoMode(enabled: boolean): void {
    const currentState = this.dataState.value;
    const updatedState = { ...currentState, demoMode: enabled };
    this.saveState(updatedState);
    this.isDemoMode.set(enabled);
    
    // Save demo mode preference
    this.saveSettings({ demoMode: enabled });
  }

  /**
   * Get all clients
   */
  getClients(): Observable<Client[]> {
    return of(this.dataState.value.clients);
  }

  /**
   * Add or update a client
   */
  saveClient(client: Client): Observable<Client> {
    const currentState = this.dataState.value;
    const existingIndex = currentState.clients.findIndex(c => c.id === client.id);
    
    let updatedClients: Client[];
    if (existingIndex >= 0) {
      updatedClients = [...currentState.clients];
      updatedClients[existingIndex] = { ...client };
    } else {
      updatedClients = [...currentState.clients, { ...client }];
    }

    const updatedState: LocalDataState = {
      ...currentState,
      clients: updatedClients,
      lastUpdated: new Date()
    };

    this.saveState(updatedState);
    this.incrementUnsyncedChanges();
    this.updateDataStats();

    return of(client);
  }

  /**
   * Get client by ID
   */
  getClientById(clientId: string): Observable<Client | null> {
    const client = this.dataState.value.clients.find(c => c.id === clientId) || null;
    return of(client);
  }

  /**
   * Delete a client
   */
  deleteClient(clientId: string): Observable<boolean> {
    const currentState = this.dataState.value;
    const updatedClients = currentState.clients.filter(c => c.id !== clientId);
    
    const updatedState: LocalDataState = {
      ...currentState,
      clients: updatedClients,
      lastUpdated: new Date()
    };

    this.saveState(updatedState);
    this.incrementUnsyncedChanges();
    this.updateDataStats();

    return of(true);
  }

  /**
   * Save a quote
   */
  saveQuote(quote: Quote): Observable<Quote> {
    const currentState = this.dataState.value;
    const updatedQuotes = [...currentState.quotes.filter(q => q.clientType !== quote.clientType), quote];
    
    const updatedState: LocalDataState = {
      ...currentState,
      quotes: updatedQuotes,
      lastUpdated: new Date()
    };

    this.saveState(updatedState);
    this.incrementUnsyncedChanges();
    
    return of(quote);
  }

  /**
   * Get quotes
   */
  getQuotes(): Observable<Quote[]> {
    return of(this.dataState.value.quotes);
  }

  /**
   * Save collective credit group
   */
  saveGroup(group: CollectiveCreditGroup): Observable<CollectiveCreditGroup> {
    const currentState = this.dataState.value;
    const existingIndex = currentState.groups.findIndex(g => g.id === group.id);
    
    let updatedGroups: CollectiveCreditGroup[];
    if (existingIndex >= 0) {
      updatedGroups = [...currentState.groups];
      updatedGroups[existingIndex] = { ...group };
    } else {
      updatedGroups = [...currentState.groups, { ...group }];
    }

    const updatedState: LocalDataState = {
      ...currentState,
      groups: updatedGroups,
      lastUpdated: new Date()
    };

    this.saveState(updatedState);
    this.incrementUnsyncedChanges();

    return of(group);
  }

  /**
   * Get all groups
   */
  getGroups(): Observable<CollectiveCreditGroup[]> {
    return of(this.dataState.value.groups);
  }

  /**
   * Save KINBAN score
   */
  saveScore(clientId: string, score: KinbanScoreResponse): Observable<KinbanScoreResponse> {
    const currentState = this.dataState.value;
    const updatedScores = { ...currentState.scores, [clientId]: score };
    
    const updatedState: LocalDataState = {
      ...currentState,
      scores: updatedScores,
      lastUpdated: new Date()
    };

    this.saveState(updatedState);
    return of(score);
  }

  /**
   * Get score for client
   */
  getScore(clientId: string): Observable<KinbanScoreResponse | null> {
    const score = this.dataState.value.scores[clientId] || null;
    return of(score);
  }

  /**
   * Add notification
   */
  addNotification(notification: Notification): Observable<Notification> {
    const currentState = this.dataState.value;
    const updatedNotifications = [notification, ...currentState.notifications].slice(0, 100); // Keep last 100
    
    const updatedState: LocalDataState = {
      ...currentState,
      notifications: updatedNotifications,
      lastUpdated: new Date()
    };

    this.saveState(updatedState);
    return of(notification);
  }

  /**
   * Get notifications
   */
  getNotifications(): Observable<Notification[]> {
    return of(this.dataState.value.notifications);
  }

  /**
   * Clear all data (useful for reset)
   */
  clearAllData(): Observable<boolean> {
    const initialState = this.getInitialState();
    initialState.demoMode = this.isDemoMode();
    
    this.saveState(initialState);
    this.updateDataStats();
    this.resetSyncStatus();

    return of(true);
  }

  /**
   * Export all data as JSON
   */
  exportData(): Observable<string> {
    const currentState = this.dataState.value;
    const exportData = {
      ...currentState,
      exportDate: new Date(),
      version: this.VERSION
    };

    return of(JSON.stringify(exportData, null, 2));
  }

  /**
   * Import data from JSON
   */
  importData(jsonData: string): Observable<boolean> {
    try {
      const importedData = JSON.parse(jsonData);
      
      // Validate data structure
      if (!this.validateImportData(importedData)) {
        throw new Error('Invalid data format');
      }

      // Merge with current state
      const updatedState: LocalDataState = {
        clients: importedData.clients || [],
        groups: importedData.groups || [],
        quotes: importedData.quotes || [],
        notifications: importedData.notifications || [],
        scores: importedData.scores || {},
        lastUpdated: new Date(),
        demoMode: this.isDemoMode(),
        dataVersion: this.VERSION
      };

      this.saveState(updatedState);
      this.updateDataStats();
      this.incrementUnsyncedChanges();

      return of(true);
    } catch (error) {
      console.error('Import failed:', error);
      return of(false);
    }
  }

  /**
   * Get storage usage stats
   */
  getStorageStats(): Observable<{
    used: number;
    available: number;
    percentage: number;
    clients: number;
    documents: number;
    quotes: number;
  }> {
    const dataStr = JSON.stringify(this.dataState.value);
    const used = new Blob([dataStr]).size;
    const available = 5 * 1024 * 1024; // Assume 5MB limit for localStorage
    
    const currentState = this.dataState.value;
    const totalDocuments = currentState.clients.reduce((sum, client) => sum + client.documents.length, 0);

    return of({
      used,
      available,
      percentage: (used / available) * 100,
      clients: currentState.clients.length,
      documents: totalDocuments,
      quotes: currentState.quotes.length
    });
  }

  /**
   * Generate sample demo data
   */
  generateDemoData(): Observable<boolean> {
    const demoClients = this.createDemoClients();
    const demoGroups = this.createDemoGroups();
    const demoQuotes = this.createDemoQuotes();

    const demoState: LocalDataState = {
      clients: demoClients,
      groups: demoGroups,
      quotes: demoQuotes,
      notifications: [],
      scores: {},
      lastUpdated: new Date(),
      demoMode: true,
      dataVersion: this.VERSION
    };

    this.saveState(demoState);
    this.setDemoMode(true);
    this.updateDataStats();

    return of(true);
  }

  // ===== PRIVATE METHODS =====

  private initializeService(): void {
    // Load saved settings
    const settings = this.loadSettings();
    this.isDemoMode.set(settings.demoMode || false);
    
    // Load saved data
    const savedState = this.loadState();
    if (savedState) {
      this.dataState.next(savedState);
    }

    this.updateDataStats();
  }

  private getInitialState(): LocalDataState {
    return {
      clients: [],
      groups: [],
      quotes: [],
      notifications: [],
      scores: {},
      lastUpdated: new Date(),
      demoMode: false,
      dataVersion: this.VERSION
    };
  }

  private saveState(state: LocalDataState): void {
    try {
      const dataStr = JSON.stringify(state);
      localStorage.setItem(this.STORAGE_KEY, dataStr);
      this.dataState.next(state);
    } catch (error) {
      console.error('Failed to save data to localStorage:', error);
      // Could implement fallback to IndexedDB here
    }
  }

  private loadState(): LocalDataState | null {
    try {
      const dataStr = localStorage.getItem(this.STORAGE_KEY);
      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        // Validate and migrate if needed
        return this.migrateData(parsed);
      }
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
    }
    return null;
  }

  private saveSettings(settings: { demoMode: boolean }): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  private loadSettings(): { demoMode: boolean } {
    try {
      const settingsStr = localStorage.getItem(this.SETTINGS_KEY);
      if (settingsStr) {
        return JSON.parse(settingsStr);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return { demoMode: false };
  }

  private migrateData(data: any): LocalDataState {
    // Handle data migration between versions
    const migrated: LocalDataState = {
      clients: Array.isArray(data.clients) ? data.clients : [],
      groups: Array.isArray(data.groups) ? data.groups : [],
      quotes: Array.isArray(data.quotes) ? data.quotes : [],
      notifications: Array.isArray(data.notifications) ? data.notifications : [],
      scores: typeof data.scores === 'object' ? data.scores : {},
      lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : new Date(),
      demoMode: !!data.demoMode,
      dataVersion: this.VERSION
    };

    return migrated;
  }

  private validateImportData(data: any): boolean {
    return (
      typeof data === 'object' &&
      (Array.isArray(data.clients) || data.clients === undefined) &&
      (Array.isArray(data.groups) || data.groups === undefined) &&
      (Array.isArray(data.quotes) || data.quotes === undefined)
    );
  }

  private updateDataStats(): void {
    const currentState = this.dataState.value;
    const totalDocuments = currentState.clients.reduce((sum, client) => sum + client.documents.length, 0);
    
    this.dataStats.set({
      clients: currentState.clients.length,
      quotes: currentState.quotes.length,
      documents: totalDocuments
    });
  }

  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.updateSyncStatus({ isOnline: true });
    });

    window.addEventListener('offline', () => {
      this.updateSyncStatus({ isOnline: false });
    });
  }

  private updateSyncStatus(updates: Partial<DataSyncStatus>): void {
    const currentStatus = this.syncStatus.value;
    this.syncStatus.next({ ...currentStatus, ...updates });
  }

  private incrementUnsyncedChanges(): void {
    const currentStatus = this.syncStatus.value;
    this.syncStatus.next({
      ...currentStatus,
      unsyncedChanges: currentStatus.unsyncedChanges + 1
    });
  }

  private resetSyncStatus(): void {
    this.syncStatus.next({
      isOnline: navigator.onLine,
      lastSync: null,
      pendingSync: false,
      unsyncedChanges: 0
    });
  }

  // ===== DEMO DATA GENERATORS =====

  private createDemoClients(): Client[] {
    return [
      {
        id: 'demo-client-1',
        name: 'Juan Pérez García',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=juan',
        flow: 'Venta a Plazo' as any,
        status: 'Expediente Pendiente',
        downPayment: 180000,
        healthScore: 75,
        ecosystemId: 'eco_ruta25',
        ecosystemName: 'Ruta 25 Los Pinos',
        cartaAvalId: 'ca_001',
        documents: [
          { id: '1', name: 'INE Vigente', status: 'Aprobado' as any },
          { id: '2', name: 'Comprobante de domicilio', status: 'Aprobado' as any },
          { id: '3', name: 'Constancia de situación fiscal', status: 'Pendiente' as any }
        ],
        events: []
      },
      {
        id: 'demo-client-2',
        name: 'María Rodríguez López',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maria',
        flow: 'Plan de Ahorro' as any,
        status: 'Activo',
        healthScore: 82,
        ecosystemId: 'eco_ruta25',
        ecosystemName: 'Ruta 25 Los Pinos',
        cartaAvalId: 'ca_002',
        savingsPlan: {
          progress: 85000,
          goal: 120000,
          currency: 'MXN',
          totalValue: 800000,
          methods: {
            collection: true,
            voluntary: true
          }
        },
        documents: [
          { id: '4', name: 'INE Vigente', status: 'Aprobado' as any },
          { id: '5', name: 'Comprobante de domicilio', status: 'Aprobado' as any }
        ],
        events: []
      },
      {
        id: 'demo-client-3',
        name: 'Carlos Mendoza Silva',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos',
        flow: 'Crédito Colectivo' as any,
        status: 'Activo',
        healthScore: 88,
        ecosystemId: 'eco_ruta25',
        ecosystemName: 'Ruta 25 Los Pinos',
        cartaAvalId: 'ca_003',
        collectiveCreditGroupId: 'demo-group-1',
        documents: [
          { id: '6', name: 'INE Vigente', status: 'Aprobado' as any },
          { id: '7', name: 'Comprobante de domicilio', status: 'Aprobado' as any },
          { id: '8', name: 'Constancia de situación fiscal', status: 'Aprobado' as any },
          { id: '9', name: 'Tarjeta de circulación', status: 'Aprobado' as any }
        ],
        events: []
      },
      {
        id: 'demo-client-4',
        name: 'Ana Patricia Vega',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ana',
        flow: 'Venta Directa' as any,
        status: 'Completado',
        healthScore: 95,
        ecosystemId: 'eco_coop_norte',
        ecosystemName: 'Cooperativa Norte',
        cartaAvalId: 'ca_004',
        documents: [
          { id: '10', name: 'INE Vigente', status: 'Aprobado' as any },
          { id: '11', name: 'Comprobante de domicilio', status: 'Aprobado' as any },
          { id: '12', name: 'Constancia de situación fiscal', status: 'Aprobado' as any }
        ],
        events: []
      },
      {
        id: 'demo-client-5',
        name: 'Roberto Hernández Cruz',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=roberto',
        flow: 'Plan de Ahorro' as any,
        status: 'En Proceso',
        healthScore: 72,
        ecosystemId: 'eco_coop_norte',
        ecosystemName: 'Cooperativa Norte',
        cartaAvalId: 'ca_005',
        savingsPlan: {
          progress: 45000,
          goal: 120000,
          currency: 'MXN',
          totalValue: 800000,
          methods: {
            collection: false,
            voluntary: true
          }
        },
        documents: [
          { id: '13', name: 'INE Vigente', status: 'Aprobado' as any },
          { id: '14', name: 'Comprobante de domicilio', status: 'En Revisión' as any }
        ],
        events: []
      }
    ];
  }

  private createDemoGroups(): CollectiveCreditGroup[] {
    return [
      {
        id: 'demo-group-1',
        name: 'Ruta 25 - Primera Tanda',
        ecosystemId: 'eco_ruta25',
        ecosystemName: 'Ruta 25 Los Pinos',
        capacity: 5,
        members: [
          {
            clientId: 'demo-client-3',
            name: 'Carlos Mendoza Silva',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos',
            status: 'active',
            individualContribution: 25000
          },
          {
            clientId: 'demo-client-6',
            name: 'Luis Fernando Torres',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luis',
            status: 'active',
            individualContribution: 25000
          },
          {
            clientId: 'demo-client-7',
            name: 'Patricia Morales Ruiz',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=patricia',
            status: 'active',
            individualContribution: 25000
          }
        ],
        totalUnits: 5,
        unitsDelivered: 1,
        savingsGoalPerUnit: 150000,
        currentSavingsProgress: 75000,
        monthlyPaymentPerUnit: 12000,
        currentMonthPaymentProgress: 8000,
        phase: 'dual',
        cartaAvalId: 'ca_group_001',
        createdAt: new Date('2024-01-15'),
        lastUpdated: new Date()
      },
      {
        id: 'demo-group-2',
        name: 'Cooperativa Norte - Segunda Tanda',
        ecosystemId: 'eco_coop_norte',
        ecosystemName: 'Cooperativa Norte',
        capacity: 6,
        members: [
          {
            clientId: 'demo-client-8',
            name: 'Miguel Ángel Sánchez',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=miguel',
            status: 'active',
            individualContribution: 22000
          },
          {
            clientId: 'demo-client-9',
            name: 'Carmen Elena Jiménez',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carmen',
            status: 'active',
            individualContribution: 22000
          }
        ],
        totalUnits: 6,
        unitsDelivered: 0,
        savingsGoalPerUnit: 140000,
        currentSavingsProgress: 44000,
        monthlyPaymentPerUnit: 11500,
        currentMonthPaymentProgress: 0,
        phase: 'saving',
        cartaAvalId: 'ca_group_002',
        createdAt: new Date('2024-02-01'),
        lastUpdated: new Date()
      }
    ];
  }

  private createDemoQuotes(): Quote[] {
    return [
      {
        totalPrice: 850000,
        downPayment: 170000,
        amountToFinance: 680000,
        term: 48,
        monthlyPayment: 18500,
        market: 'Estado de México',
        clientType: 'Individual',
        flow: 'Venta a Plazo' as any
      }
    ];
  }
}