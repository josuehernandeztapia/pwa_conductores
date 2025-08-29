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
  name: 'INE Vigente' | 'Comprobante de domicilio' | 'Constancia de situación fiscal' | 'Copia de la concesión' | 'Tarjeta de circulación' | 'Factura de la unidad actual' | 'Carta de antigüedad de la ruta' | 'Verificación Biométrica (Metamap)' | 'Expediente Completo' | 'Contrato Venta a Plazo' | 'Identificación' | 'Carta Aval de Ruta' | 'Convenio de Dación en Pago' | 'Acta Constitutiva de la Ruta' | 'Poder del Representante Legal';
  status: DocumentStatus;
  isOptional?: boolean;
  tooltip?: string;
}

export interface EventLog {
  id: string;
  timestamp: Date;
  message: string;
  actor: Actor;
  type: EventType;
  details?: {
    amount?: number;
    currency?: 'MXN';
    plate?: string;
  };
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

export type ImportMilestoneStatus = 'completed' | 'in_progress' | 'pending';

export type ImportStatus = {
  pedidoPlanta: ImportMilestoneStatus;
  unidadFabricada: ImportMilestoneStatus;
  transitoMaritimo: ImportMilestoneStatus;
  enAduana: ImportMilestoneStatus;
  liberada: ImportMilestoneStatus;
};

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
  ecosystemId?: string;
}