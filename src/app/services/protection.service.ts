import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { 
  ProtectionSimulationInput, 
  ProtectionSimulationOutput, 
  ProtectionScenarioResult,
  ProtectionApplicationResponse,
  ContratoBase,
  DiferimientoConfig,
  RecalendarioConfig,
  StepDownConfig
} from './protection.models';

@Injectable({
  providedIn: 'root'
})
export class ProtectionService {

  constructor() { }

  simulateProtection(input: ProtectionSimulationInput): Observable<ProtectionSimulationOutput> {
    const { contrato, opciones } = input;
    const scenarios: ProtectionScenarioResult[] = [];

    // Calcular saldo insoluto actual
    const Bk = this.calculateOutstandingBalance(contrato);
    
    // Diferimiento
    const diferimiento = this.simulateDiferimiento(contrato, opciones.diferimiento, Bk);
    scenarios.push(diferimiento);

    // Recalendario
    const recalendario = this.simulateRecalendario(contrato, opciones.recalendario, Bk);
    scenarios.push(recalendario);

    // Step-down
    const stepDown = this.simulateStepDown(contrato, opciones.stepDown, Bk);
    scenarios.push(stepDown);

    // Rescate colectivo (mock)
    const rescateColectivo: ProtectionScenarioResult = {
      type: 'Rescate Colectivo',
      newMonthlyPayment: 0,
      newTerm: 0,
      totalCostDelta: -Bk * 0.8, // Asume 80% de cobertura
      tirPost: 0,
      tirOK: true,
      warnings: ['Sujeto a aprobación del fondo colectivo']
    };
    scenarios.push(rescateColectivo);

    return of({ escenarios: scenarios });
  }

  applyProtection(clientId: string, scenario: ProtectionScenarioResult): Observable<ProtectionApplicationResponse> {
    // Mock implementation - in real app would call backend
    return of({
      status: 'success',
      message: `Protección ${scenario.type} aplicada para cliente ${clientId}`,
      adendumUrl: 'https://example.com/adendum'
    });
  }

  private calculateOutstandingBalance(contrato: ContratoBase): number {
    const { P0, r, n, k } = contrato;
    if (k === 0) return P0;
    
    const factor = Math.pow(1 + r, n);
    const monthlyPayment = P0 * (r * factor) / (factor - 1);
    
    // Saldo después de k pagos
    const factorK = Math.pow(1 + r, k);
    return P0 * factorK - monthlyPayment * ((factorK - 1) / r);
  }

  private simulateDiferimiento(contrato: ContratoBase, config: DiferimientoConfig, Bk: number): ProtectionScenarioResult {
    const { r, n, k } = contrato;
    const { d, capitalizaInteres } = config;
    
    let newBalance = Bk;
    if (capitalizaInteres) {
      // Capitalizar intereses durante diferimiento
      newBalance = Bk * Math.pow(1 + r, d);
    }
    
    const remainingTerm = n - k;
    const factor = Math.pow(1 + r, remainingTerm);
    const newMonthlyPayment = newBalance * (r * factor) / (factor - 1);
    
    const totalCostDelta = capitalizaInteres ? newBalance - Bk : 0;
    
    return {
      type: 'Diferimiento',
      newMonthlyPayment,
      newTerm: n,
      totalCostDelta,
      tirPost: r * 12,
      tirOK: r * 12 < 0.35,
      warnings: capitalizaInteres ? ['Intereses capitalizados'] : []
    };
  }

  private simulateRecalendario(contrato: ContratoBase, config: RecalendarioConfig, Bk: number): ProtectionScenarioResult {
    const { r, n, k } = contrato;
    const { deltaMeses } = config;
    
    const newTerm = n + deltaMeses;
    const remainingTerm = newTerm - k;
    const factor = Math.pow(1 + r, remainingTerm);
    const newMonthlyPayment = Bk * (r * factor) / (factor - 1);
    
    const originalTotalCost = contrato.M0 * (n - k);
    const newTotalCost = newMonthlyPayment * remainingTerm;
    const totalCostDelta = newTotalCost - originalTotalCost;
    
    return {
      type: 'Recalendario',
      newMonthlyPayment,
      newTerm,
      totalCostDelta,
      tirPost: r * 12,
      tirOK: r * 12 < 0.35,
      warnings: deltaMeses > 12 ? ['Extensión mayor a 12 meses'] : []
    };
  }

  private simulateStepDown(contrato: ContratoBase, config: StepDownConfig, Bk: number): ProtectionScenarioResult {
    const { r, n, k, M0 } = contrato;
    const { meses, alpha } = config;
    
    const reducedPayment = M0 * (1 - alpha);
    const normalPayment = M0;
    
    // Calcular nuevo saldo después de pagos reducidos
    let newBalance = Bk;
    for (let i = 0; i < meses; i++) {
      const interest = newBalance * r;
      const principal = reducedPayment - interest;
      newBalance = Math.max(0, newBalance - principal);
    }
    
    // Recalcular mensualidad para el resto del plazo
    const remainingTerm = n - k - meses;
    if (remainingTerm > 0) {
      const factor = Math.pow(1 + r, remainingTerm);
      const newMonthlyPayment = newBalance * (r * factor) / (factor - 1);
      
      const originalTotalCost = M0 * (n - k);
      const newTotalCost = reducedPayment * meses + newMonthlyPayment * remainingTerm;
      const totalCostDelta = newTotalCost - originalTotalCost;
      
      return {
        type: 'Step-down',
        newMonthlyPayment,
        newTerm: n,
        totalCostDelta,
        tirPost: r * 12,
        tirOK: r * 12 < 0.35,
        warnings: newMonthlyPayment > M0 * 1.2 ? ['Pago post-crisis alto'] : []
      };
    }
    
    return {
      type: 'Step-down',
      newMonthlyPayment: reducedPayment,
      newTerm: n,
      totalCostDelta: 0,
      tirPost: r * 12,
      tirOK: true,
      warnings: []
    };
  }
}