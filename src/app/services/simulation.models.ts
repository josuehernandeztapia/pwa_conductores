// PLAYBOOK: Este archivo refleja las entidades y reglas del Playbook de Negocio.

export type Market = 'aguascalientes' | 'edomex';
export type MemberStatus = 'active' | 'frozen' | 'left' | 'delivered';

// --- Eventos "What-If" para la Simulación ---
export type SimulationEventType = 'EXTRA_CONTRIBUTION' | 'MISSED_PAYMENT' | 'MEMBER_LEAVES' | 'MEMBER_JOINS';

export interface BaseEvent {
  type: SimulationEventType;
  month: number; // El mes en que ocurre el evento
}

export interface MemberEvent extends BaseEvent {
  memberId: string;
  amount: number;
}

export interface MemberLeaveEvent extends BaseEvent {
  type: 'MEMBER_LEAVES';
  memberId: string;
}

export interface MemberJoinEvent extends BaseEvent {
  type: 'MEMBER_JOINS';
  newMember: Member;
}

export type SimulationEvent = MemberEvent | MemberLeaveEvent | MemberJoinEvent;

// --- Dominio Base ---
export interface ProductComponent {
  id: string;
  name: string;
  price: number;
  isOptional: boolean;
}

export interface ProductPackage {
  market: Market;
  name: string;
  components: ProductComponent[];
  term: number;
  rateAnnual: number;
  minDownPaymentPct: number;
  price: number;
}

export interface Member {
  id: string;
  name: string;
  prio: number;
  status: MemberStatus;
  baseContribution: number;
}

export interface Group {
  id: string;
  name: string;
  market: Market;
  members: Member[];
  productPackage: ProductPackage;
}

// --- Lógica y Resultados de la Simulación ---
export interface Award {
  memberId: string;
  month: number;
  unitPrice: number;
  dpPaid: number;
  principal: number;
  mds: number;
}

export interface MonthState {
  t: number;
  inflow: number;
  debtDue: number;
  surplus: number;
  savings: number;
  awardsInMonth: Award[];
  riskBadge?: 'ok' | 'debtDeficit';
}

export interface SimulationResult {
  months: MonthState[];
  finalAwards: Record<string, Award>;
}

// --- Input para el motor ---
export interface SimulationInput {
    group: Group;
    horizonMonths: number;
    events?: SimulationEvent[]; // Array de eventos "what-if"
}

// --- Input para la formalización ---
export interface FormalizeSimulationInput {
    clientName: string; // Nombre del cliente o de la oportunidad
    groupConfig: Group;
    simulationResult: SimulationResult;
    appliedEvents: SimulationEvent[];
}

export interface FormalizeResponse {
    success: boolean;
    opportunityId: string;
    cockpitUrl: string;
}