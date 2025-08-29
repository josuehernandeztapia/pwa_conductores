import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProtectionService } from '../../../services/protection.service';
import { ContratoBase, ProtectionSimulationInput, ProtectionScenarioResult } from '../../../services/protection.models';

@Component({
  selector: 'app-proteccion-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proteccion-simulator.component.html',
  styleUrls: ['./proteccion-simulator.component.css']
})
export class ProteccionSimulatorComponent implements OnInit {
  clientId: string | null = null;
  contratoBase: ContratoBase = {
    P0: 200000, // Principal original
    r: 0.02,   // Tasa mensual (2%)
    n: 48,     // Plazo original (48 meses)
    M0: 5800,  // Mensualidad original (ejemplo)
    k: 12,     // Mes actual (pagos realizados)
    Bk: 0      // Saldo insoluto en k (se calculará en el motor)
  };

  // Inputs del simulador
  motivoRestructura: string = 'incapacidad';
  mesesAfectados: number = 1;

  // Parámetros de simulación de variantes
  diferimientoMeses: number = 1;
  diferimientoCapitaliza: boolean = true;
  recalendarioDeltaMeses: number = 6;
  stepDownMeses: number = 1;
  stepDownAlpha: number = 0.25;

  // Resultados de la simulación
  simulatedScenarios: ProtectionScenarioResult[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private protectionService: ProtectionService
  ) { }

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('clientId');
    // En una app real, aquí cargarías el contrato base del cliente por su ID
    // Por ahora, usamos el mock y ejecutamos la simulación inicial
    this.runSimulation();
  }

  runSimulation(): void {
    const input: ProtectionSimulationInput = {
      contrato: this.contratoBase,
      opciones: {
        diferimiento: { d: this.diferimientoMeses, capitalizaInteres: this.diferimientoCapitaliza },
        recalendario: { deltaMeses: this.recalendarioDeltaMeses },
        stepDown: { meses: this.stepDownMeses, alpha: this.stepDownAlpha },
        colectivo: { usarFondo: true } // Siempre se ofrece
      }
    };

    this.protectionService.simulateProtection(input).subscribe(output => {
      this.simulatedScenarios = output.escenarios;
    });
  }

  applyProtection(scenario: ProtectionScenarioResult): void {
    if (!this.clientId) {
      alert('Error: ID de cliente no encontrado.');
      return;
    }
    this.protectionService.applyProtection(this.clientId, scenario).subscribe(response => {
      alert(`Protección aplicada: ${response.message || response.status}`);
      // Aquí se integraría con Mifiel o la redirección
    });
  }
}