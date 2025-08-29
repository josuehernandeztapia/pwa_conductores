import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductPackage, Group, SimulationResult, Member } from '../../../services/simulation.models';
import { runSimulation } from '../../../services/simulator.engine';

// --- Mock Data de Paquetes del Playbook ---
const EDO_MEX_PACKAGE: ProductPackage = { market: 'edomex', name: 'Paquete Productivo Completo', components: [], term: 60, rateAnnual: 0.299, minDownPaymentPct: 0.15, price: 837000 };
const AGS_PACKAGE: ProductPackage = { market: 'aguascalientes', name: 'Paquete Venta a Plazo AGS', components: [], term: 24, rateAnnual: 0.255, minDownPaymentPct: 0.60, price: 853000 };

@Component({
  selector: 'app-ahorro-mode',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ahorro-mode.component.html',
  styleUrls: ['./ahorro-mode.component.css']
})
export class AhorroModeComponent implements OnInit {

  // --- Contexto y Escenario ---
  selectedMarket: 'edomex' | 'aguascalientes' = 'edomex';
  selectedClientType: 'individual' | 'colectivo' = 'colectivo';
  scenario: 'proyector_ags' | 'planificador_edomex' | 'tanda_edomex' = 'tanda_edomex';

  // --- Parámetros de Simulación ---
  // Tanda
  tandaMembers: number = 5;
  tandaContribution: number = 5000;
  // Planificador EdoMex
  voluntaryContribution: number = 2000;
  // Proyector AGS
  initialDownPayment: number = 511800;

  // --- Resultados ---
  tandaResult: SimulationResult | null = null;
  timeToGoal: number = 0;

  // Helper method for Object.keys in template
  getObjectKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }

  ngOnInit() {
    this.updateScenario();
  }

  updateScenario() {
    if (this.selectedMarket === 'edomex') {
      this.scenario = this.selectedClientType === 'colectivo' ? 'tanda_edomex' : 'planificador_edomex';
    } else {
      this.scenario = 'proyector_ags';
    }
    this.runSimulation();
  }

  runSimulation() {
    if (this.scenario === 'tanda_edomex') {
      const members: Member[] = Array.from({ length: this.tandaMembers }, (_, i) => ({
        id: `mem${i+1}`, name: `Miembro ${i+1}`, prio: i + 1, status: 'active', baseContribution: this.tandaContribution
      }));
      const group: Group = { id: 'tanda-sim', name: 'Simulación Tanda', market: 'edomex', productPackage: EDO_MEX_PACKAGE, members };
      this.tandaResult = runSimulation({ group, horizonMonths: 120 });
    }
    else if (this.scenario === 'planificador_edomex') {
        const goal = EDO_MEX_PACKAGE.price * EDO_MEX_PACKAGE.minDownPaymentPct;
        this.timeToGoal = this.voluntaryContribution > 0 ? Math.ceil(goal / this.voluntaryContribution) : 0;
    }
    // Lógica para proyector AGS se puede añadir aquí
  }
}