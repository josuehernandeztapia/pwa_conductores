import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductPackage } from '../../../services/simulation.models';

// Datos de ejemplo basados en el PLAYBOOK.md
const EDO_MEX_PACKAGE: ProductPackage = {
    market: 'edomex', name: 'Paquete Productivo Completo', 
    components: [], term: 60, rateAnnual: 0.299, minDownPaymentPct: 0.15,
    price: 837000
};

const AGS_PACKAGE: ProductPackage = {
    market: 'aguascalientes', name: 'Paquete Venta a Plazo AGS', 
    components: [], term: 24, rateAnnual: 0.255, minDownPaymentPct: 0.60,
    price: 853000
};

@Component({
  selector: 'app-cotizador-mode',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cotizador-mode.component.html',
  styleUrls: ['./cotizador-mode.component.css']
})
export class CotizadorModeComponent implements OnInit {
  
  selectedMarket: 'edomex' | 'aguascalientes' = 'edomex';
  productPackage: ProductPackage = EDO_MEX_PACKAGE;

  // Parámetros de la cotización
  downPaymentPercentage: number = 20;
  selectedTerm: number = 60;

  // Resultados calculados
  downPaymentAmount: number = 0;
  amountToFinance: number = 0;
  monthlyPayment: number = 0;

  ngOnInit() {
    this.loadPackage();
  }

  loadPackage() {
    this.productPackage = this.selectedMarket === 'edomex' ? EDO_MEX_PACKAGE : AGS_PACKAGE;
    this.downPaymentPercentage = this.productPackage.minDownPaymentPct * 100;
    this.selectedTerm = this.productPackage.term;
    this.recalculate();
  }

  getMinDownPayment(): number {
    // EdoMex: 15% mínimo con tanda/colectivo
    // AGS: 60% mínimo individual
    return this.productPackage.minDownPaymentPct * 100;
  }

  getMaxDownPayment(): number {
    return 80; // Máximo 80% para ambos mercados
  }

  recalculate() {
    this.downPaymentAmount = this.productPackage.price * (this.downPaymentPercentage / 100);
    this.amountToFinance = this.productPackage.price - this.downPaymentAmount;
    
    const monthlyRate = this.productPackage.rateAnnual / 12;
    const term = this.selectedTerm;
    const factor = Math.pow(1 + monthlyRate, term);
    this.monthlyPayment = this.amountToFinance * (monthlyRate * factor) / (factor - 1);
  }
}