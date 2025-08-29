import { Injectable, signal, computed, inject } from '@angular/core';
import { 
  Ecosystem, 
  EcosystemType, 
  EcosystemStatus,
  CartaAval,
  canEcosystemIssueCartaAval 
} from '../models/ecosystem-onboarding.types';
import { CollectiveCreditGroup, Client } from '../models/types';
import { OdooApiService, OdooEcosistema, OdooProspecto } from './odoo-api.service';
import { Observable, from, of, map, tap, catchError } from 'rxjs';

export interface EcosystemStats {
  totalClients: number;
  activeGroups: number;
  issuedCartasAval: number;
  pendingDocuments: number;
  completionPercentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class EcosystemService {
  private odooApi = inject(OdooApiService);
  
  private ecosystems = signal<Ecosystem[]>([]);
  private collectiveGroups = signal<CollectiveCreditGroup[]>([]);
  private clients = signal<Client[]>([]);
  private odooEcosystems = signal<OdooEcosistema[]>([]);
  private prospects = signal<OdooProspecto[]>([]);

  // Computed signals
  allEcosystems = computed(() => this.ecosystems());
  
  activeEcosystems = computed(() => 
    this.ecosystems().filter(e => e.status === 'activa')
  );

  ecosystemsWithCartaAvalEnabled = computed(() =>
    this.ecosystems().filter(e => canEcosystemIssueCartaAval(e))
  );

  // Live Odoo data computed signals
  liveEcosystems = computed(() => this.odooEcosystems());
  liveProspects = computed(() => this.prospects());

  constructor() {
    this.loadData();
    this.loadLiveData();
  }

  private loadData() {
    // Load ecosystems
    const storedEcosystems = localStorage.getItem('ecosystems');
    if (storedEcosystems) {
      this.ecosystems.set(JSON.parse(storedEcosystems));
    }

    // Load collective groups
    const storedGroups = localStorage.getItem('collectiveGroups');
    if (storedGroups) {
      this.collectiveGroups.set(JSON.parse(storedGroups));
    }

    // Load clients
    const storedClients = localStorage.getItem('clients');
    if (storedClients) {
      this.clients.set(JSON.parse(storedClients));
    }
  }

  private saveData() {
    localStorage.setItem('ecosystems', JSON.stringify(this.ecosystems()));
    localStorage.setItem('collectiveGroups', JSON.stringify(this.collectiveGroups()));
    localStorage.setItem('clients', JSON.stringify(this.clients()));
  }

  private loadLiveData() {
    this.syncEcosystemsFromOdoo().subscribe();
    this.syncProspectsFromOdoo().subscribe();
  }

  // ===== ODOO INTEGRATION METHODS =====
  syncEcosystemsFromOdoo(filters?: {
    mercado?: string;
    tipo?: string;
    estado?: string;
  }): Observable<OdooEcosistema[]> {
    return this.odooApi.getEcosistemas(filters).pipe(
      tap(ecosystems => this.odooEcosystems.set(ecosystems)),
      catchError(error => {
        console.error('Error syncing ecosystems from Odoo:', error);
        return of([]);
      })
    );
  }

  syncProspectsFromOdoo(filters?: {
    mercado?: string;
    estado?: string;
    asesor?: string;
    ecosistema?: string;
  }): Observable<OdooProspecto[]> {
    return this.odooApi.getProspectos(filters).pipe(
      tap(prospects => this.prospects.set(prospects)),
      catchError(error => {
        console.error('Error syncing prospects from Odoo:', error);
        return of([]);
      })
    );
  }

  createEcosystemInOdoo(ecosystemData: Partial<OdooEcosistema>): Observable<OdooEcosistema> {
    return this.odooApi.crearEcosistema(ecosystemData).pipe(
      tap(newEcosystem => {
        const current = this.odooEcosystems();
        this.odooEcosystems.set([...current, newEcosystem]);
      }),
      catchError(error => {
        console.error('Error creating ecosystem in Odoo:', error);
        throw error;
      })
    );
  }

  updateEcosystemInOdoo(id: string, updates: Partial<OdooEcosistema>): Observable<OdooEcosistema> {
    return this.odooApi.actualizarEcosistema(id, updates).pipe(
      tap(updatedEcosystem => {
        const current = this.odooEcosystems();
        const updated = current.map(e => e.id === id ? updatedEcosystem : e);
        this.odooEcosystems.set(updated);
      }),
      catchError(error => {
        console.error('Error updating ecosystem in Odoo:', error);
        throw error;
      })
    );
  }

  createProspectInOdoo(prospectData: Partial<OdooProspecto>): Observable<OdooProspecto> {
    return this.odooApi.crearProspecto(prospectData).pipe(
      tap(newProspect => {
        const current = this.prospects();
        this.prospects.set([...current, newProspect]);
      }),
      catchError(error => {
        console.error('Error creating prospect in Odoo:', error);
        throw error;
      })
    );
  }

  convertProspectInOdoo(prospectId: string, conversionData: {
    expedienteId?: string;
    ecosistemaAsignado?: string;
    cotizacion?: any;
  }): Observable<{
    success: boolean;
    clienteId: string;
    expedienteId: string;
  }> {
    return this.odooApi.convertirProspecto(prospectId, conversionData).pipe(
      tap(result => {
        if (result.success) {
          // Update local prospect status
          const current = this.prospects();
          const updated = current.map(p => 
            p.id === prospectId ? { ...p, estado: 'convertido' as const } : p
          );
          this.prospects.set(updated);
        }
      }),
      catchError(error => {
        console.error('Error converting prospect in Odoo:', error);
        throw error;
      })
    );
  }

  getEcosystemPipelineFromOdoo(ecosystemId: string): Observable<{
    prospectos: {
      nuevos: number;
      contactados: number;
      cualificados: number;
      convertidos: number;
    };
    clientes: {
      activos: number;
      proceso: number;
      completados: number;
    };
    gruposColectivos: {
      activos: number;
      enFormacion: number;
      completados: number;
    };
    ingresosMes: number;
    objetivoMes: number;
  }> {
    return this.odooApi.getEcosistemaPipeline(ecosystemId);
  }

  assignClientToEcosystemInOdoo(clientId: string, ecosystemId: string): Observable<{
    success: boolean;
    mensaje: string;
  }> {
    return this.odooApi.asignarClienteEcosistema(clientId, ecosystemId);
  }

  // Ecosystem CRUD operations
  createEcosystem(ecosystem: Ecosystem): void {
    const ecosystems = [...this.ecosystems(), ecosystem];
    this.ecosystems.set(ecosystems);
    this.saveData();
  }

  updateEcosystem(updatedEcosystem: Ecosystem): void {
    const ecosystems = this.ecosystems().map(e => 
      e.id === updatedEcosystem.id ? updatedEcosystem : e
    );
    this.ecosystems.set(ecosystems);
    this.saveData();
  }

  getEcosystem(id: string): Ecosystem | undefined {
    return this.ecosystems().find(e => e.id === id);
  }

  deleteEcosystem(id: string): void {
    // First, clean up related data
    this.removeEcosystemRelations(id);
    
    // Remove the ecosystem
    const ecosystems = this.ecosystems().filter(e => e.id !== id);
    this.ecosystems.set(ecosystems);
    this.saveData();
  }

  private removeEcosystemRelations(ecosystemId: string): void {
    // Remove collective groups belonging to this ecosystem
    const groups = this.collectiveGroups().filter(g => g.ecosystemId !== ecosystemId);
    this.collectiveGroups.set(groups);

    // Update clients to remove ecosystem references
    const clients = this.clients().map(c => {
      if (c.ecosystemId === ecosystemId) {
        const { ecosystemId, ecosystemName, cartaAvalId, ...clientWithoutEcosystem } = c;
        return clientWithoutEcosystem as Client;
      }
      return c;
    });
    this.clients.set(clients);
  }

  // Carta Aval management
  issueCartaAval(ecosystemId: string, cartaAval: Omit<CartaAval, 'id' | 'ecosystemId'>): CartaAval | null {
    const ecosystem = this.getEcosystem(ecosystemId);
    if (!ecosystem || !canEcosystemIssueCartaAval(ecosystem)) {
      return null;
    }

    const fullCartaAval: CartaAval = {
      ...cartaAval,
      id: `carta_${Date.now()}`,
      ecosystemId
    };

    const updatedEcosystem = {
      ...ecosystem,
      issuedCartasAval: [...ecosystem.issuedCartasAval, fullCartaAval],
      lastUpdated: new Date()
    };

    this.updateEcosystem(updatedEcosystem);
    return fullCartaAval;
  }

  getCartasAvalByEcosystem(ecosystemId: string): CartaAval[] {
    const ecosystem = this.getEcosystem(ecosystemId);
    return ecosystem?.issuedCartasAval || [];
  }

  updateCartaAvalStatus(ecosystemId: string, cartaAvalId: string, status: CartaAval['status']): void {
    const ecosystem = this.getEcosystem(ecosystemId);
    if (!ecosystem) return;

    const updatedCartasAval = ecosystem.issuedCartasAval.map(carta => 
      carta.id === cartaAvalId ? { ...carta, status } : carta
    );

    const updatedEcosystem = {
      ...ecosystem,
      issuedCartasAval: updatedCartasAval,
      lastUpdated: new Date()
    };

    this.updateEcosystem(updatedEcosystem);
  }

  // Collective Group management with ecosystem relationship
  createCollectiveGroup(group: Omit<CollectiveCreditGroup, 'id' | 'createdAt' | 'lastUpdated'>): CollectiveCreditGroup {
    const fullGroup: CollectiveCreditGroup = {
      ...group,
      id: `group_${Date.now()}`,
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    const groups = [...this.collectiveGroups(), fullGroup];
    this.collectiveGroups.set(groups);
    this.saveData();
    
    return fullGroup;
  }

  updateCollectiveGroup(updatedGroup: CollectiveCreditGroup): void {
    const groups = this.collectiveGroups().map(g => 
      g.id === updatedGroup.id ? { ...updatedGroup, lastUpdated: new Date() } : g
    );
    this.collectiveGroups.set(groups);
    this.saveData();
  }

  getCollectiveGroupsByEcosystem(ecosystemId: string): CollectiveCreditGroup[] {
    return this.collectiveGroups().filter(g => g.ecosystemId === ecosystemId);
  }

  deleteCollectiveGroup(groupId: string): void {
    // Update clients to remove group reference
    const clients = this.clients().map(c => {
      if (c.collectiveCreditGroupId === groupId) {
        const { collectiveCreditGroupId, ...clientWithoutGroup } = c;
        return clientWithoutGroup as Client;
      }
      return c;
    });
    this.clients.set(clients);

    // Remove the group
    const groups = this.collectiveGroups().filter(g => g.id !== groupId);
    this.collectiveGroups.set(groups);
    this.saveData();
  }

  // Client management with ecosystem relationship
  assignClientToEcosystem(clientId: string, ecosystemId: string, cartaAvalId?: string): void {
    const ecosystem = this.getEcosystem(ecosystemId);
    if (!ecosystem) return;

    const clients = this.clients().map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          ecosystemId,
          ecosystemName: ecosystem.name,
          cartaAvalId
        };
      }
      return c;
    });

    this.clients.set(clients);
    this.saveData();
  }

  getClientsByEcosystem(ecosystemId: string): Client[] {
    return this.clients().filter(c => c.ecosystemId === ecosystemId);
  }

  // Statistics and analytics
  getEcosystemStats(ecosystemId: string): EcosystemStats {
    const ecosystem = this.getEcosystem(ecosystemId);
    if (!ecosystem) {
      return {
        totalClients: 0,
        activeGroups: 0,
        issuedCartasAval: 0,
        pendingDocuments: 0,
        completionPercentage: 0
      };
    }

    const clients = this.getClientsByEcosystem(ecosystemId);
    const groups = this.getCollectiveGroupsByEcosystem(ecosystemId);
    const activeGroups = groups.filter(g => g.phase !== 'completed');
    const pendingDocs = ecosystem.documents.filter(d => d.status === 'Pendiente').length;

    return {
      totalClients: clients.length,
      activeGroups: activeGroups.length,
      issuedCartasAval: ecosystem.issuedCartasAval.length,
      pendingDocuments: pendingDocs,
      completionPercentage: this.calculateCompletionPercentage(ecosystem)
    };
  }

  private calculateCompletionPercentage(ecosystem: Ecosystem): number {
    const totalStages = ecosystem.onboardingStages.length;
    const completedStages = ecosystem.onboardingStages.filter(s => s.status === 'completed').length;
    
    return totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;
  }

  // Demo data generators
  generateDemoEcosystems(): void {
    const demoEcosystems: Ecosystem[] = [
      {
        id: 'eco_ruta25',
        name: 'Ruta 25 Los Pinos',
        type: 'ruta_transporte',
        status: 'activa',
        email: 'contacto@ruta25pinos.com',
        phone: '55 1234 5678',
        address: {
          street: 'Av. Los Pinos 123',
          city: 'Toluca',
          state: 'México',
          zipCode: '50100',
          country: 'México'
        },
        businessName: 'Transportes Los Pinos S.A. de C.V.',
        rfc: 'TLP980101XXX',
        constitutionDate: new Date('1998-01-01'),
        registrationNumber: 'RPP-001234',
        legalRepresentatives: [
          {
            id: 'rep_001',
            name: 'Juan Carlos Mendoza',
            position: 'Presidente',
            rfc: 'MENJ750815XXX',
            curp: 'MENJ750815HMCNDR05',
            documents: [],
            isActive: true
          }
        ],
        primaryRepresentativeId: 'rep_001',
        routes: [
          {
            id: 'route_001',
            routeNumber: '25',
            routeName: 'Los Pinos - Centro',
            origin: 'Los Pinos',
            destination: 'Centro Toluca',
            permitNumber: 'SCT-25-2020',
            issuedBy: 'Secretaría de Comunicaciones y Transportes',
            validFrom: new Date('2020-01-01'),
            validTo: new Date('2025-12-31'),
            vehicleCapacity: 45,
            operatingDays: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
            status: 'vigente'
          }
        ],
        operatingRegion: 'Estado de México',
        totalMembers: 45,
        activeMembers: 42,
        documents: [],
        onboardingStages: [],
        currentStage: '',
        monthlyRevenue: 2500000,
        averageAge: 8,
        fleetSize: 45,
        registeredAt: new Date('2023-01-15'),
        approvedAt: new Date('2023-02-01'),
        lastUpdated: new Date(),
        createdBy: 'asesor_demo',
        assignedAsesorId: 'asesor_demo',
        cartaAvalEnabled: true,
        cartaAvalTemplate: 'template_standard',
        issuedCartasAval: []
      },
      {
        id: 'eco_coop_norte',
        name: 'Cooperativa Norte',
        type: 'cooperativa',
        status: 'activa',
        email: 'info@coopnorte.com',
        phone: '55 9876 5432',
        address: {
          street: 'Calle Norte 456',
          city: 'Naucalpan',
          state: 'México',
          zipCode: '53000',
          country: 'México'
        },
        businessName: 'Cooperativa de Transportes del Norte S.C. de R.L.',
        rfc: 'CTN950301XXX',
        constitutionDate: new Date('1995-03-01'),
        registrationNumber: 'COOP-002567',
        legalRepresentatives: [
          {
            id: 'rep_002',
            name: 'María Elena González',
            position: 'Representante Legal',
            rfc: 'GONM680920XXX',
            curp: 'GONM680920MMCNRL08',
            documents: [],
            isActive: true
          }
        ],
        primaryRepresentativeId: 'rep_002',
        routes: [],
        operatingRegion: 'Estado de México',
        totalMembers: 28,
        activeMembers: 26,
        documents: [],
        onboardingStages: [],
        currentStage: '',
        monthlyRevenue: 1800000,
        averageAge: 6,
        fleetSize: 28,
        registeredAt: new Date('2023-03-10'),
        approvedAt: new Date('2023-03-25'),
        lastUpdated: new Date(),
        createdBy: 'asesor_demo',
        assignedAsesorId: 'asesor_demo',
        cartaAvalEnabled: true,
        cartaAvalTemplate: 'template_standard',
        issuedCartasAval: [
          {
            id: 'ca_001',
            ecosystemId: 'eco_ruta25',
            clientId: 'demo-client-1',
            clientName: 'Juan Pérez García',
            issuedDate: new Date('2024-01-20'),
            validUntil: new Date('2024-07-20'),
            amount: 180000,
            purpose: 'venta_plazo',
            status: 'vigente',
            issuedBy: 'rep_001',
            documentUrl: 'https://docs.example.com/ca_001.pdf',
            notes: 'Carta aval para venta a plazo de unidad H6C'
          },
          {
            id: 'ca_002',
            ecosystemId: 'eco_ruta25',
            clientId: 'demo-client-2',
            clientName: 'María Rodríguez López',
            issuedDate: new Date('2024-01-25'),
            validUntil: new Date('2024-10-25'),
            amount: 120000,
            purpose: 'ahorro_programado',
            status: 'vigente',
            issuedBy: 'rep_001',
            documentUrl: 'https://docs.example.com/ca_002.pdf',
            notes: 'Carta aval para plan de ahorro programado'
          },
          {
            id: 'ca_003',
            ecosystemId: 'eco_ruta25',
            clientId: 'demo-client-3',
            clientName: 'Carlos Mendoza Silva',
            issuedDate: new Date('2024-01-15'),
            validUntil: new Date('2024-12-15'),
            amount: 150000,
            purpose: 'credito_colectivo',
            status: 'vigente',
            issuedBy: 'rep_001',
            documentUrl: 'https://docs.example.com/ca_003.pdf',
            notes: 'Carta aval para crédito colectivo - Primera Tanda'
          },
          {
            id: 'ca_group_001',
            ecosystemId: 'eco_ruta25',
            clientId: 'demo-group-1',
            clientName: 'Ruta 25 - Primera Tanda (Grupal)',
            issuedDate: new Date('2024-01-15'),
            validUntil: new Date('2025-01-15'),
            amount: 750000,
            purpose: 'credito_colectivo',
            status: 'vigente',
            issuedBy: 'rep_001',
            documentUrl: 'https://docs.example.com/ca_group_001.pdf',
            notes: 'Carta aval grupal para tanda de 5 miembros'
          }
        ]
      },
      {
        id: 'eco_coop_norte',
        name: 'Cooperativa Norte',
        type: 'cooperativa',
        status: 'activa',
        email: 'info@coopnorte.com',
        phone: '55 9876 5432',
        address: {
          street: 'Calle Norte 456',
          city: 'Naucalpan',
          state: 'México',
          zipCode: '53000',
          country: 'México'
        },
        businessName: 'Cooperativa de Transportes del Norte S.C. de R.L.',
        rfc: 'CTN950301XXX',
        constitutionDate: new Date('1995-03-01'),
        registrationNumber: 'COOP-002567',
        legalRepresentatives: [
          {
            id: 'rep_002',
            name: 'María Elena González',
            position: 'Representante Legal',
            rfc: 'GONM680920XXX',
            curp: 'GONM680920MMCNRL08',
            documents: [],
            isActive: true
          }
        ],
        primaryRepresentativeId: 'rep_002',
        routes: [],
        operatingRegion: 'Estado de México',
        totalMembers: 28,
        activeMembers: 26,
        documents: [],
        onboardingStages: [],
        currentStage: '',
        monthlyRevenue: 1800000,
        averageAge: 6,
        fleetSize: 28,
        registeredAt: new Date('2023-03-10'),
        approvedAt: new Date('2023-03-25'),
        lastUpdated: new Date(),
        createdBy: 'asesor_demo',
        assignedAsesorId: 'asesor_demo',
        cartaAvalEnabled: true,
        cartaAvalTemplate: 'template_standard',
        issuedCartasAval: [
          {
            id: 'ca_004',
            ecosystemId: 'eco_coop_norte',
            clientId: 'demo-client-4',
            clientName: 'Ana Patricia Vega',
            issuedDate: new Date('2024-02-10'),
            validUntil: new Date('2024-08-10'),
            amount: 749000,
            purpose: 'venta_plazo',
            status: 'utilizada',
            issuedBy: 'rep_002',
            documentUrl: 'https://docs.example.com/ca_004.pdf',
            notes: 'Carta aval para venta directa - Ya utilizada'
          },
          {
            id: 'ca_005',
            ecosystemId: 'eco_coop_norte',
            clientId: 'demo-client-5',
            clientName: 'Roberto Hernández Cruz',
            issuedDate: new Date('2024-02-15'),
            validUntil: new Date('2024-11-15'),
            amount: 120000,
            purpose: 'ahorro_programado',
            status: 'vigente',
            issuedBy: 'rep_002',
            documentUrl: 'https://docs.example.com/ca_005.pdf',
            notes: 'Carta aval para plan de ahorro programado'
          },
          {
            id: 'ca_group_002',
            ecosystemId: 'eco_coop_norte',
            clientId: 'demo-group-2',
            clientName: 'Cooperativa Norte - Segunda Tanda (Grupal)',
            issuedDate: new Date('2024-02-01'),
            validUntil: new Date('2025-02-01'),
            amount: 840000,
            purpose: 'credito_colectivo',
            status: 'vigente',
            issuedBy: 'rep_002',
            documentUrl: 'https://docs.example.com/ca_group_002.pdf',
            notes: 'Carta aval grupal para tanda de 6 miembros'
          }
        ]
      }
    ];

    this.ecosystems.set(demoEcosystems);
    this.saveData();
  }

  updateDemoCollectiveGroups(): void {
    const updatedGroups = this.collectiveGroups().map(group => ({
      ...group,
      ecosystemId: group.ecosystemId || 'eco_ruta25',
      ecosystemName: group.ecosystemName || 'Ruta 25 Los Pinos',
      createdAt: group.createdAt || new Date(),
      lastUpdated: group.lastUpdated || new Date()
    }));

    this.collectiveGroups.set(updatedGroups);
    this.saveData();
  }

  updateDemoClients(): void {
    const ecosystems = this.ecosystems();
    if (ecosystems.length === 0) return;

    const updatedClients = this.clients().map((client, index) => {
      const ecosystemIndex = index % ecosystems.length;
      const ecosystem = ecosystems[ecosystemIndex];
      
      return {
        ...client,
        ecosystemId: ecosystem.id,
        ecosystemName: ecosystem.name
      };
    });

    this.clients.set(updatedClients);
    this.saveData();
  }
}