import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { 
  Client, 
  BusinessFlow, 
  DocumentStatus, 
  EventLog, 
  Actor, 
  PaymentLinkDetails, 
  Document, 
  CollectiveCreditGroup, 
  CollectiveCreditMember, 
  EventType, 
  OpportunityStage, 
  ImportStatus, 
  Notification, 
  NotificationType, 
  ActionableGroup, 
  ActionableClient, 
  Ecosystem, 
  Quote, 
  Market,
  View
} from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class SimulationService {
  // Use mutable maps to simulate a database
  private clientsDB = new Map<string, Client>();
  private collectiveCreditGroupsDB = new Map<string, CollectiveCreditGroup>();
  private ecosystemsDB = new Map<string, Ecosystem>();
  private notificationId = 0;

  // --- Document Checklists ---
  private readonly CONTADO_DOCS: Document[] = [
    { id: '1', name: 'INE Vigente', status: DocumentStatus.Pendiente },
    { id: '2', name: 'Comprobante de domicilio', status: DocumentStatus.Pendiente },
    { id: '3', name: 'Constancia de situación fiscal', status: DocumentStatus.Pendiente },
  ];

  private readonly AGUASCALIENTES_FINANCIERO_DOCS: Document[] = [
    { id: '1', name: 'INE Vigente', status: DocumentStatus.Pendiente },
    { id: '2', name: 'Comprobante de domicilio', status: DocumentStatus.Pendiente },
    { id: '3', name: 'Tarjeta de circulación', status: DocumentStatus.Pendiente },
    { id: '4', name: 'Copia de la concesión', status: DocumentStatus.Pendiente },
    { id: '5', name: 'Constancia de situación fiscal', status: DocumentStatus.Pendiente },
    { id: '6', name: 'Verificación Biométrica (Metamap)', status: DocumentStatus.Pendiente },
  ];

  private readonly EDOMEX_MIEMBRO_DOCS: Document[] = [
    ...this.AGUASCALIENTES_FINANCIERO_DOCS,
    { id: '7', name: 'Carta Aval de Ruta', status: DocumentStatus.Pendiente, tooltip: "Documento emitido y validado por el Ecosistema/Ruta." },
    { id: '8', name: 'Convenio de Dación en Pago', status: DocumentStatus.Pendiente, tooltip: "Convenio que formaliza el colateral social." },
  ];

  private readonly EDOMEX_AHORRO_DOCS: Document[] = [
    { id: '1', name: 'INE Vigente', status: DocumentStatus.Pendiente },
    { id: '2', name: 'Comprobante de domicilio', status: DocumentStatus.Pendiente },
  ];

  constructor() {
    this.initializeDB();
  }

  private mockApi<T>(data: T, delayMs = 500): Observable<T> {
    return of(JSON.parse(JSON.stringify(data))).pipe(delay(delayMs));
  }

  private addDerivedGroupProperties(group: CollectiveCreditGroup): CollectiveCreditGroup {
    const isSavingPhase = group.unitsDelivered < group.totalUnits;
    const isPayingPhase = group.unitsDelivered > 0;

    let phase: 'saving' | 'payment' | 'dual' | 'completed' = 'saving';
    if (isSavingPhase && isPayingPhase) {
      phase = 'dual';
    } else if (isPayingPhase && !isSavingPhase) {
      phase = 'payment';
    } else if (group.unitsDelivered === group.totalUnits) {
      phase = 'payment';
    }

    return {
      ...group,
      phase,
      savingsGoal: group.savingsGoalPerUnit,
      currentSavings: group.currentSavingsProgress,
      monthlyPaymentGoal: group.monthlyPaymentPerUnit * group.unitsDelivered,
    };
  }

  private createMembers(clients: Client[]): CollectiveCreditMember[] {
    return clients.map(c => ({
      clientId: c.id,
      name: c.name,
      avatarUrl: c.avatarUrl,
      status: 'active' as const,
      individualContribution: c.events
        .filter(e => e.type === EventType.Contribution && e.details?.amount)
        .reduce((sum, e) => sum + (e.details?.amount || 0), 0)
    }));
  }

  private getFilteredClients(market: Market): Client[] {
    const clients = Array.from(this.clientsDB.values());
    if (market === 'aguascalientes') {
      return clients.filter(c => !c.ecosystemId);
    } else if (market === 'edomex') {
      return clients.filter(c => !!c.ecosystemId);
    }
    return clients;
  }

  private initializeDB(): void {
    // Initialize with sample data similar to React version
    const initialEcosystems: Ecosystem[] = [
      { 
        id: 'eco-1', 
        name: 'Ruta 27 de Toluca S.A. de C.V.', 
        status: 'Activo', 
        documents: [
          {id: 'eco-1-doc-1', name: 'Acta Constitutiva de la Ruta', status: DocumentStatus.Aprobado}, 
          {id: 'eco-1-doc-2', name: 'Poder del Representante Legal', status: DocumentStatus.Aprobado}
        ]
      },
      { 
        id: 'eco-2', 
        name: 'Autotransportes de Tlalnepantla', 
        status: 'Expediente Pendiente', 
        documents: [
          {id: 'eco-2-doc-1', name: 'Acta Constitutiva de la Ruta', status: DocumentStatus.Pendiente}
        ]
      },
    ];

    const initialClients: Client[] = [
      {
        id: '1',
        name: 'Juan Pérez (Venta a Plazo AGS)',
        avatarUrl: 'https://picsum.photos/seed/juan/100/100',
        flow: BusinessFlow.VentaPlazo,
        status: 'Activo',
        healthScore: 85,
        paymentPlan: {
          monthlyGoal: 18282.88,
          currentMonthProgress: 6000,
          currency: 'MXN',
          methods: {
            collection: true,
            voluntary: true
          },
          collectionDetails: {
            plates: ['XYZ-123-A'],
            pricePerLiter: 5
          }
        },
        documents: this.AGUASCALIENTES_FINANCIERO_DOCS.map((doc, i) => ({
          ...doc,
          status: i < 2 ? DocumentStatus.Aprobado : DocumentStatus.Pendiente
        })),
        events: [
          { id: 'evt1-3', timestamp: new Date(), message: 'Aportación Voluntaria confirmada.', actor: Actor.Sistema, type: EventType.Contribution, details: { amount: 5000, currency: 'MXN' } },
          { id: 'evt1-4', timestamp: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000), message: 'Recaudación Flota (Placa XYZ-123-A).', actor: Actor.Sistema, type: EventType.Collection, details: { amount: 1000, currency: 'MXN', plate: 'XYZ-123-A' } },
          { id: 'evt1-2', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), message: 'Documento INE/IFE cargado.', actor: Actor.Cliente, type: EventType.ClientAction },
          { id: 'evt1-1', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), message: 'Plan de Venta a Plazo creado.', actor: Actor.Asesor, type: EventType.AdvisorAction },
        ],
      },
      // Add more sample clients...
    ];

    this.clientsDB.clear();
    this.collectiveCreditGroupsDB.clear();
    this.ecosystemsDB.clear();
    
    initialClients.forEach(c => this.clientsDB.set(c.id, c));
    initialEcosystems.forEach(e => this.ecosystemsDB.set(e.id, e));
  }

  // --- CORE SERVICES ---
  getClients(): Observable<Client[]> {
    return this.mockApi(Array.from(this.clientsDB.values()), 1000);
  }

  getCollectiveCreditGroups(): Observable<CollectiveCreditGroup[]> {
    const groups = Array.from(this.collectiveCreditGroupsDB.values());
    const processedGroups = groups.map(g => {
      const group = {...g};
      const memberClients = group.members.map(m => this.clientsDB.get(m.clientId)).filter(Boolean) as Client[];
      const updatedMembers = this.createMembers(memberClients);
      group.members = updatedMembers;
      if(group.unitsDelivered === 0) {
        group.currentSavingsProgress = updatedMembers.reduce((sum, m) => sum + m.individualContribution, 0);
      }
      return this.addDerivedGroupProperties(group);
    });
    return this.mockApi(processedGroups, 800);
  }

  getEcosystems(): Observable<Ecosystem[]> {
    return this.mockApi(Array.from(this.ecosystemsDB.values()), 700);
  }

  createClientFromOnboarding(config: { name: string, market: 'aguascalientes' | 'edomex', saleType: 'contado' | 'financiero', ecosystemId?: string }): Observable<Client> {
    const newId = `onboard-${Date.now()}`;
    let documents: Document[] = [];
    let flow: BusinessFlow;

    if (config.saleType === 'contado') {
      flow = BusinessFlow.VentaDirecta;
      documents = this.CONTADO_DOCS.map(d => ({ ...d, id: `${newId}-${d.id}`}));
    } else {
      flow = BusinessFlow.VentaPlazo;
      if (config.market === 'aguascalientes') {
        documents = this.AGUASCALIENTES_FINANCIERO_DOCS.map(d => ({ ...d, id: `${newId}-${d.id}`}));
      } else {
        documents = this.EDOMEX_MIEMBRO_DOCS.map(d => ({ ...d, id: `${newId}-${d.id}`}));
      }
    }
    
    const newClient: Client = {
      id: newId,
      name: config.name,
      avatarUrl: `https://picsum.photos/seed/${newId}/100/100`,
      flow,
      status: 'Nuevas Oportunidades',
      healthScore: 70,
      documents,
      events: [{ id: `${newId}-evt-1`, timestamp: new Date(), message: `Oportunidad creada desde el flujo de ${config.market}.`, actor: Actor.Asesor, type: EventType.AdvisorAction }],
      ecosystemId: config.ecosystemId,
    };
    
    this.clientsDB.set(newId, newClient);
    return this.mockApi(newClient);
  }

  saveQuoteToClient(clientId: string, quote: Quote): Observable<Client> {
    const client = this.clientsDB.get(clientId);
    if (!client) throw new Error("Client not found");

    client.flow = quote.flow;
    client.status = "Expediente en Proceso";

    if (quote.flow === BusinessFlow.AhorroProgramado) {
      client.savingsPlan = {
        progress: 0,
        goal: quote.downPayment,
        currency: 'MXN',
        totalValue: quote.totalPrice,
        methods: { collection: false, voluntary: true }
      };
      client.paymentPlan = undefined;
    } else if (quote.flow === BusinessFlow.VentaPlazo || quote.flow === BusinessFlow.VentaDirecta) {
      client.paymentPlan = {
        monthlyGoal: quote.monthlyPayment,
        currentMonthProgress: 0,
        currency: 'MXN',
        methods: { collection: false, voluntary: true }
      };
      client.savingsPlan = undefined;
      client.downPayment = quote.downPayment;
      client.remainderAmount = quote.amountToFinance;
    }

    const newEvent = {
      id: `evt-${clientId}-${Date.now()}`,
      timestamp: new Date(),
      message: `Plan de ${quote.flow} formalizado con un valor de ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(quote.totalPrice)}.`,
      actor: Actor.Asesor,
      type: EventType.AdvisorAction
    };

    client.events = [newEvent, ...client.events];
    this.clientsDB.set(clientId, client);
    return this.mockApi(client);
  }

  getOpportunityStages(market: Market = 'all'): Observable<OpportunityStage[]> {
    const clients = this.getFilteredClients(market);
    const stages: OpportunityStage[] = [
      { name: 'Nuevas Oportunidades', clientIds: [], count: 0 },
      { name: 'Expediente en Proceso', clientIds: [], count: 0 },
      { name: 'Aprobado', clientIds: [], count: 0 },
      { name: 'Activo', clientIds: [], count: 0 },
      { name: 'Completado', clientIds: [], count: 0 },
    ];
    
    clients.forEach(client => {
      if (client.status === 'Nuevas Oportunidades') {
        stages[0].clientIds.push(client.id);
      } else if (client.status === 'Expediente en Proceso') {
        stages[1].clientIds.push(client.id);
      } else if (client.status === 'Aprobado') {
        stages[2].clientIds.push(client.id);
      } else if (['Activo', 'Pagos al Corriente', 'Activo en Grupo', 'Esperando Sorteo'].includes(client.status)) {
        stages[3].clientIds.push(client.id);
      } else if (['Meta Alcanzada', 'Turno Adjudicado', 'Completado', 'Unidad Lista para Entrega'].includes(client.status)) {
        stages[4].clientIds.push(client.id);
      }
    });
    
    stages.forEach(stage => stage.count = stage.clientIds.length);
    return this.mockApi(stages, 900);
  }

  getSimulatedAlert(clients: Client[]): Observable<Notification | null> {
    if (clients.length === 0) return this.mockApi(null);
    
    const randomClient = clients[Math.floor(Math.random() * clients.length)];
    const alertTemplates: Array<Omit<Notification, 'id' | 'timestamp'>> = [
      { type: NotificationType.Lead, message: `Nuevo Lead Asignado: ${randomClient.name}`, clientId: randomClient.id },
      { type: NotificationType.Milestone, message: `¡Contrato Firmado! ${randomClient.name} ha firmado.`, clientId: randomClient.id },
      { type: NotificationType.Risk, message: `Seguimiento Requerido: ${randomClient.name} lleva 3 días en 'Expediente en Proceso'.`, clientId: randomClient.id },
      { type: NotificationType.System, message: `Actualización del sistema programada para medianoche.` },
    ];

    const goalAchievedClient = clients.find(c => c.status === 'Meta Alcanzada');
    if(goalAchievedClient) {
      alertTemplates.push({ 
        type: NotificationType.Milestone, 
        message: `¡Meta Alcanzada! ${goalAchievedClient.name} está listo para convertir.`, 
        clientId: goalAchievedClient.id, 
        action: { text: 'Iniciar Conversión', type: 'convert' } 
      });
    }

    const approvedClient = clients.find(c => c.status === 'Aprobado');
    if(approvedClient) {
      alertTemplates.push({ 
        type: NotificationType.Milestone, 
        message: `Crédito Aprobado para ${approvedClient.name}.`, 
        clientId: approvedClient.id, 
        action: { text: 'Configurar Plan', type: 'configure_plan' } 
      });
    }

    const randomAlert = alertTemplates[Math.floor(Math.random() * alertTemplates.length)];
    const newNotification: Notification = { 
      id: this.notificationId++, 
      timestamp: new Date(), 
      ...randomAlert 
    };
    
    return this.mockApi(newNotification, 200);
  }

  getSidebarAlertCounts(clients: Client[]): Observable<{ [key in View]?: number }> {
    const counts: { [key in View]?: number } = {
      oportunidades: clients.filter(c => c.status === 'Nuevas Oportunidades').length,
      clientes: clients.filter(c => ['Expediente en Proceso', 'Aprobado', 'Meta Alcanzada'].includes(c.status)).length,
    };
    return this.mockApi(counts, 150);
  }

  // Advanced product packages for different markets and client types
  getProductPackage(packageKey: string): Observable<any> {
    const packages = {
      // AGUASCALIENTES PACKAGES
      'aguascalientes-plazo': {
        id: 'aguascalientes-plazo',
        name: 'Venta a Plazo - Aguascalientes',
        rate: 0.15, // 15% anual
        terms: [12, 18, 24, 36],
        components: [
          { id: '1', name: 'Vehículo Base', price: 280000, isOptional: false },
          { id: '2', name: 'Seguro Anual', price: 18000, isOptional: false, isMultipliedByTerm: true },
          { id: '3', name: 'GPS/Rastreo', price: 8000, isOptional: true },
          { id: '4', name: 'Mantenimiento Preventivo', price: 12000, isOptional: true, isMultipliedByTerm: true }
        ],
        minDownPaymentPercentage: 0.20 // 20% mínimo
      },
      'aguascalientes-directa': {
        id: 'aguascalientes-directa',
        name: 'Venta Directa - Aguascalientes',
        rate: 0,
        terms: [1], // Pago único
        components: [
          { id: '1', name: 'Vehículo Base', price: 280000, isOptional: false },
          { id: '2', name: 'GPS/Rastreo', price: 8000, isOptional: true },
          { id: '3', name: 'Kit de Herramientas', price: 15000, isOptional: true }
        ],
        minDownPaymentPercentage: 0.30 // 30% mínimo para directa
      },
      
      // ESTADO DE MÉXICO PACKAGES
      'edomex-plazo': {
        id: 'edomex-plazo',
        name: 'Venta a Plazo - Estado de México',
        rate: 0.18, // 18% anual (más alto por riesgo)
        terms: [12, 18, 24, 36, 48],
        components: [
          { id: '1', name: 'Vehículo Base', price: 320000, isOptional: false },
          { id: '2', name: 'Seguro Anual', price: 22000, isOptional: false, isMultipliedByTerm: true },
          { id: '3', name: 'GPS/Rastreo Avanzado', price: 12000, isOptional: false },
          { id: '4', name: 'Mantenimiento Preventivo', price: 15000, isOptional: true, isMultipliedByTerm: true },
          { id: '5', name: 'Kit Emergencia', price: 8000, isOptional: true }
        ],
        minDownPaymentPercentage: 0.25 // 25% mínimo
      },
      'edomex-directa': {
        id: 'edomex-directa',
        name: 'Venta Directa - Estado de México',
        rate: 0,
        terms: [1],
        components: [
          { id: '1', name: 'Vehículo Base', price: 320000, isOptional: false },
          { id: '2', name: 'GPS/Rastreo Avanzado', price: 12000, isOptional: false },
          { id: '3', name: 'Kit Emergencia', price: 8000, isOptional: true },
          { id: '4', name: 'Curso de Manejo Defensivo', price: 5000, isOptional: true }
        ],
        minDownPaymentPercentage: 0.40 // 40% mínimo para directa EdoMex
      },
      
      // CRÉDITO COLECTIVO - Solo Estado de México
      'edomex-colectivo': {
        id: 'edomex-colectivo',
        name: 'Crédito Colectivo - Estado de México (Tanda)',
        rate: 0.12, // Tasa preferencial para grupos
        terms: [24, 36, 48, 60], // Plazos más largos
        components: [
          { id: '1', name: 'Vehículo Base', price: 320000, isOptional: false },
          { id: '2', name: 'Seguro Grupal', price: 18000, isOptional: false, isMultipliedByTerm: true },
          { id: '3', name: 'GPS/Rastreo Grupal', price: 10000, isOptional: false },
          { id: '4', name: 'Fondo de Contingencia', price: 25000, isOptional: false },
          { id: '5', name: 'Capacitación Grupal', price: 15000, isOptional: true }
        ],
        minDownPaymentPercentage: 0.15, // 15% mínimo para grupos
        defaultMembers: 5 // Número típico de miembros
      }
    };
    
    return of(packages[packageKey as keyof typeof packages] || null).pipe(delay(800));
  }

  // Add other service methods as needed...
}