export enum BusinessFlow {
  VentaPlazo = 'Venta a Plazo',
  AhorroProgramado = 'Plan de Ahorro',
  CreditoColectivo = 'Crédito Colectivo',
  VentaDirecta = 'Venta Directa',
}

export enum DocumentStatus {
  Pendiente = 'Pendiente',
  EnRevision = 'En Revisión',
  Aprobado = 'Aprobado',
  Rechazado = 'Rechazado',
}

export enum Actor {
    Asesor = 'Asesor',
    Cliente = 'Cliente',
    Sistema = 'Sistema',
}

export enum EventType {
    Contribution = 'Contribution',
    Collection = 'Collection',
    System = 'System',
    AdvisorAction = 'AdvisorAction',
    ClientAction = 'ClientAction',
    GoalAchieved = 'GoalAchieved'
}

export interface Document {
  id: string;
  name: 'INE Vigente' | 'Comprobante de domicilio' | 'Constancia de situación fiscal' | 'Copia de la concesión' | 'Tarjeta de circulación' | 'Factura de la unidad actual' | 'Carta de antigüedad de la ruta' | 'Verificación Biométrica (Metamap)' | 'Expediente Completo' | 'Contrato Venta a Plazo' | 'Identificación' | 'Carta Aval de Ruta' | 'Convenio de Dación en Pago' | 'Acta Constitutiva de la Ruta' | 'Poder del Representante Legal' | 'Concesión de Transporte' | 'Padrón Vehicular de la Ruta' | 'Carta de Antigüedad de la Ruta' | 'Acta Constitutiva de la Cooperativa' | 'Acta Constitutiva de la Asociación' | 'RFC de Persona Moral' | 'Constancia de Situación Fiscal' | 'Comprobante de Domicilio Fiscal' | 'INE del Representante Legal' | 'CURP del Representante Legal' | 'Inscripción en Registro Público de la Propiedad' | 'Estatutos Sociales';
  status: DocumentStatus;
  isOptional?: boolean;
  tooltip?: string;
}

export interface EventLog {
  id:string;
  timestamp: Date;
  message: string;
  actor: Actor;
  type: EventType;
  details?: {
      amount?: number;
      currency?: 'MXN';
      plate?: string;
  }
}

export interface CollectionDetails {
    plates: string[];
    pricePerLiter: number;
}

export interface SavingsPlan {
    progress: number;
    goal: number;
    currency: 'MXN';
    totalValue: number;
    methods: {
        collection: boolean;
        voluntary: boolean;
    };
    collectionDetails?: CollectionDetails;
}

export interface PaymentPlan {
    monthlyGoal: number;
    currentMonthProgress: number;
    currency: 'MXN';
    methods: {
        collection: boolean;
        voluntary: boolean;
    };
    collectionDetails?: CollectionDetails;
}

export interface CollectiveCreditMember {
  clientId: string;
  name: string;
  avatarUrl: string;
  status: 'active' | 'pending';
  individualContribution: number;
}

export interface CollectiveCreditGroup {
  id: string;
  name: string;
  ecosystemId: string; // Reference to parent Ecosystem/Route
  ecosystemName: string; // Cached for display
  capacity: number;
  members: CollectiveCreditMember[];
  totalUnits: number;
  unitsDelivered: number;
  savingsGoalPerUnit: number;
  currentSavingsProgress: number;
  monthlyPaymentPerUnit: number;
  currentMonthPaymentProgress: number;
  phase?: 'saving' | 'payment' | 'dual' | 'completed';
  savingsGoal?: number;
  currentSavings?: number;
  monthlyPaymentGoal?: number;
  cartaAvalId?: string; // Reference to the Carta Aval that enabled this group
  createdAt: Date;
  lastUpdated: Date;
}

export type ImportMilestoneStatus = 'completed' | 'in_progress' | 'pending';

export type ImportStatus = {
    pedidoPlanta: ImportMilestoneStatus;
    unidadFabricada: ImportMilestoneStatus;
    transitoMaritimo: ImportMilestoneStatus;
    enAduana: ImportMilestoneStatus;
    liberada: ImportMilestoneStatus;
};

export interface Ecosystem {
    id: string;
    name: string;
    documents: Document[];
    status: 'Activo' | 'Expediente Pendiente';
}

export interface Quote {
    totalPrice: number;
    downPayment: number;
    amountToFinance: number;
    term: number;
    monthlyPayment: number;
    market: string;
    clientType: string;
    flow: BusinessFlow;
}

export interface Client {
  id: string;
  name: string;
  avatarUrl: string;
  flow: BusinessFlow;
  status: string;
  savingsPlan?: SavingsPlan;
  paymentPlan?: PaymentPlan;
  documents: Document[];
  events: EventLog[];
  collectiveCreditGroupId?: string;
  importStatus?: ImportStatus;
  remainderAmount?: number;
  downPayment?: number;
  healthScore?: number;
  ecosystemId?: string; // Reference to parent Ecosystem/Route
  ecosystemName?: string; // Cached for display
  cartaAvalId?: string; // Reference to the Carta Aval that endorsed this client
}

export interface PaymentLinkDetails {
    type: 'Conekta' | 'SPEI';
    amount: number;
    details: {
        link?: string;
        clabe?: string;
        reference?: string;
        bank?: string;
    };
}

export enum NotificationType {
    Lead = 'lead',
    Milestone = 'milestone',
    Risk = 'risk',
    System = 'system'
}

export type NotificationAction = {
    text: string;
    type: 'convert' | 'assign_unit' | 'configure_plan';
}

export interface Notification {
    id: number;
    message: string;
    type: NotificationType;
    timestamp: Date;
    clientId?: string;
    action?: NotificationAction;
}

export type OpportunityStage = {
    name: 'Nuevas Oportunidades' | 'Expediente en Proceso' | 'Aprobado' | 'Activo' | 'Completado';
    clientIds: string[];
    count: number;
};

export type ActionableClient = {
    id: string;
    name: string;
    avatarUrl: string;
    status: string;
};

export type ActionableGroup = {
    title: string;
    description: string;
    clients: ActionableClient[];
};

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

export type TandaMilestone = {
    type: 'ahorro' | 'entrega';
    unitNumber?: number;
    duration: number;
    label: string;
};

export type Market = 'all' | 'aguascalientes' | 'edomex';
export type SimulatorMode = 'acquisition' | 'savings';
export type ClientTypeSimulator = 'individual' | 'collective' | '';

export interface Component {
    id: string;
    name: string;
    price: number;
    isOptional: boolean;
    isMultipliedByTerm?: boolean;
}

export interface Package {
    id: string;
    name: string;
    rate: number;
    terms: number[];
    components: Component[];
    minDownPaymentPercentage: number;
    defaultMembers?: number;
}

export interface CollectionUnit {
    plate: string;
    fuelCapacity: number;
    pricePerLiter: number;
    monthlyCollection: number;
}

export interface AmortizationRow {
    paymentNumber: number;
    principalPayment: number;
    interestPayment: number;
    totalPayment: number;
    balance: number;
}

export interface NavigationContext {
  ecosystem?: Ecosystem;
  group?: CollectiveCreditGroup;
}

export type View = 'dashboard' | 'simulador' | 'oportunidades' | 'ecosistemas' | 'crm-pipeline' | 'document-center' | 'clientes' | 'grupos-colectivos' | 'configuracion' | 'business-intelligence';