// Models for protection simulation system

export interface ContratoBase {
  P0: number;     // Principal original
  r: number;      // Tasa mensual
  n: number;      // Plazo original en meses
  M0: number;     // Mensualidad original
  k: number;      // Mes actual (pagos realizados)
  Bk: number;     // Saldo insoluto en k
}

export interface DiferimientoConfig {
  d: number;              // Meses a diferir
  capitalizaInteres: boolean;
}

export interface RecalendarioConfig {
  deltaMeses: number;     // Meses a extender
}

export interface StepDownConfig {
  meses: number;          // Meses con pago reducido
  alpha: number;          // Factor de reducción (0.0-1.0)
}

export interface ColectivoConfig {
  usarFondo: boolean;     // Si usar fondo colectivo
}

export interface ProtectionOptions {
  diferimiento: DiferimientoConfig;
  recalendario: RecalendarioConfig;
  stepDown: StepDownConfig;
  colectivo: ColectivoConfig;
}

export interface ProtectionSimulationInput {
  contrato: ContratoBase;
  opciones: ProtectionOptions;
}

export interface ProtectionScenarioResult {
  type: 'Diferimiento' | 'Recalendario' | 'Step-down' | 'Rescate Colectivo';
  newMonthlyPayment: number;
  newTerm: number;
  totalCostDelta: number;
  tirPost: number;
  tirOK: boolean;
  warnings: string[];
}

export interface ProtectionSimulationOutput {
  escenarios: ProtectionScenarioResult[];
}

export interface ProtectionApplicationResponse {
  status: string;
  message?: string;
  adendumUrl?: string;
}