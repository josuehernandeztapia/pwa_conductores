import { Component, Input, OnInit, OnDestroy, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SimulationService } from '../../../services/simulation.service';
import { 
  Client, Quote, BusinessFlow, TandaMilestone, 
  Market, SimulatorMode, ClientTypeSimulator, 
  Package, Component as ProductComponent, CollectionUnit, AmortizationRow 
} from '../../../models/types';

@Component({
  selector: 'app-simulador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './simulador.component.html',
  styleUrl: './simulador.component.scss'
})
export class SimuladorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() client?: Client;
  @Input() initialMode: SimulatorMode = 'acquisition';
  
  readonly onFormalize = output<Quote | Event>();

  // Core state
  protected readonly mode = signal<SimulatorMode>('acquisition');
  protected selectedMarket: Market = 'aguascalientes';
  protected selectedClientType: ClientTypeSimulator = 'individual';
  protected selectedPackageId = '';
  protected downPayment = 0;
  protected selectedTerm = 0;
  protected readonly generatedQuote = signal<Quote | null>(null);
  
  // Signals for computed values
  protected readonly selectedPackage = signal<Package | null>(null);
  protected readonly selectedComponents = signal<Set<string>>(new Set());
  protected readonly availablePackages = signal<Package[]>([]);
  protected readonly isLoading = signal(false);

  // Computed values
  protected readonly totalPrice = computed(() => {
    const pkg = this.selectedPackage();
    const components = this.selectedComponents();
    
    if (!pkg) return 0;
    
    return pkg.components
      .filter(comp => components.has(comp.id))
      .reduce((sum, comp) => sum + comp.price, 0);
  });

  protected readonly minDownPayment = computed(() => {
    const pkg = this.selectedPackage();
    const total = this.totalPrice();
    return pkg ? total * pkg.minDownPaymentPercentage : 0;
  });

  protected readonly downPaymentPercentage = computed(() => {
    const total = this.totalPrice();
    return total > 0 ? (this.downPayment / total * 100) : 0;
  });

  protected readonly amountToFinance = computed(() => {
    return Math.max(0, this.totalPrice() - this.downPayment);
  });

  protected readonly interestRate = computed(() => {
    const pkg = this.selectedPackage();
    return pkg?.rate || 0;
  });

  protected readonly availableTerms = computed(() => {
    const pkg = this.selectedPackage();
    return pkg?.terms || [];
  });

  protected readonly monthlyPayment = computed(() => {
    const financeAmount = this.amountToFinance();
    const rate = this.interestRate();
    
    if (financeAmount <= 0 || !this.selectedTerm || !rate) {
      return 0;
    }
    
    const monthlyRate = rate / 12;
    return (financeAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -this.selectedTerm));
  });

  protected readonly collectionUnits = computed(() => {
    if (this.mode() !== 'savings') return [];
    
    // Enhanced collection units calculator based on market and client type
    const baseUnits = [
      {
        plate: 'ABC-123',
        fuelCapacity: 200,
        pricePerLiter: this.selectedMarket === 'aguascalientes' ? 24.50 : 26.80,
        monthlyCollection: 0
      },
      {
        plate: 'DEF-456', 
        fuelCapacity: 180,
        pricePerLiter: this.selectedMarket === 'aguascalientes' ? 24.50 : 26.80,
        monthlyCollection: 0
      },
      {
        plate: 'GHI-789',
        fuelCapacity: 220,
        pricePerLiter: this.selectedMarket === 'aguascalientes' ? 24.50 : 26.80,
        monthlyCollection: 0
      }
    ];
    
    // Calculate monthly collection based on market specifics
    return baseUnits.map(unit => {
      const dailyTrips = this.selectedMarket === 'edomex' ? 4 : 3; // EdoMex has more trips
      const fuelPerTrip = unit.fuelCapacity * 0.15; // 15% of tank per trip
      const collectionPerLiter = this.selectedClientType === 'collective' ? 1.20 : 0.80; // Collective gets better rates
      
      const monthlyCollection = Math.round(
        dailyTrips * fuelPerTrip * collectionPerLiter * 30 * unit.pricePerLiter
      );
      
      return {
        ...unit,
        monthlyCollection
      };
    });
  });

  protected readonly totalMonthlyCollection = computed(() => {
    return this.collectionUnits().reduce((sum, unit) => sum + unit.monthlyCollection, 0);
  });

  protected readonly savingsTimeMonths = computed(() => {
    const total = this.totalPrice();
    const monthly = this.totalMonthlyCollection();
    return monthly > 0 ? total / monthly : 0;
  });

  protected readonly savingsProgress = computed(() => {
    return 25.5; // Mock current progress percentage
  });

  protected readonly amortizationTable = computed(() => {
    const financeAmount = this.amountToFinance();
    const monthlyPmt = this.monthlyPayment();
    const rate = this.interestRate();
    const term = this.selectedTerm;
    
    if (!financeAmount || !monthlyPmt || !rate || !term) return [];
    
    const table: AmortizationRow[] = [];
    let balance = financeAmount;
    const monthlyRate = rate / 12;
    
    for (let i = 1; i <= term && balance > 0.01; i++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPmt - interestPayment;
      balance = Math.max(0, balance - principalPayment);
      
      table.push({
        paymentNumber: i,
        principalPayment,
        interestPayment,
        totalPayment: monthlyPmt,
        balance
      });
    }
    
    return table;
  });

  protected readonly tandaTimeline = computed(() => {
    if (this.selectedClientType !== 'collective' || this.mode() !== 'savings') return [];
    
    const total = this.totalPrice();
    const monthly = this.totalMonthlyCollection();
    
    if (!total || !monthly) return [];
    
    // Simplified Tanda timeline with snowball algorithm
    const timeline: TandaMilestone[] = [];
    const members = 10; // Default group size
    const unitPrice = total / members;
    const monthlyPerMember = monthly / members;
    
    let cumulativeSavings = 0;
    let currentMonth = 0;
    
    for (let unit = 1; unit <= members; unit++) {
      const savingsNeeded = unitPrice - (cumulativeSavings / unit);
      const monthsToSave = Math.ceil(savingsNeeded / (monthly + (unit - 1) * monthlyPerMember * 0.1));
      
      currentMonth += monthsToSave;
      
      timeline.push({
        type: 'ahorro',
        duration: monthsToSave,
        label: `Ahorro Colectivo ${unit}`
      });
      
      timeline.push({
        type: 'entrega',
        unitNumber: unit,
        duration: 0.5,
        label: `Entrega Unidad ${unit}`
      });
      
      cumulativeSavings += monthsToSave * monthly;
    }
    
    return timeline;
  });

  constructor(private simulationService: SimulationService) {}

  ngOnInit(): void {
    this.mode.set(this.initialMode);
    
    if (this.client) {
      this.selectedMarket = this.client.ecosystemId ? 'edomex' : 'aguascalientes';
      this.selectedClientType = this.client.flow === BusinessFlow.CreditoColectivo ? 'collective' : 'individual';
    }
    
    this.loadAvailablePackages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onMarketChange(): void {
    this.loadAvailablePackages();
    this.resetSelection();
  }

  protected onClientTypeChange(): void {
    this.loadAvailablePackages();
    this.resetSelection();
  }

  protected setMode(newMode: SimulatorMode): void {
    this.mode.set(newMode);
    this.resetSelection();
  }

  private loadAvailablePackages(): void {
    const packageKeys = this.getRelevantPackageKeys();
    this.isLoading.set(true);
    
    const packages: Package[] = [];
    let loaded = 0;
    
    packageKeys.forEach(key => {
      this.simulationService.getProductPackage(key)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (pkg) => {
            if (pkg) packages.push(pkg);
            loaded++;
            if (loaded === packageKeys.length) {
              this.availablePackages.set(packages);
              this.isLoading.set(false);
            }
          },
          error: () => {
            loaded++;
            if (loaded === packageKeys.length) {
              this.availablePackages.set(packages);
              this.isLoading.set(false);
            }
          }
        });
    });
  }

  private getRelevantPackageKeys(): string[] {
    const keys: string[] = [];
    
    // Add all relevant packages for the current market
    if (this.mode() === 'savings' && this.selectedClientType === 'collective' && this.selectedMarket === 'edomex') {
      keys.push('edomex-colectivo');
    } 
    
    // Always include direct and installment options for the market
    keys.push(`${this.selectedMarket}-directa`);
    keys.push(`${this.selectedMarket}-plazo`);
    
    // Add collective option if available
    if (this.selectedMarket === 'edomex') {
      keys.push('edomex-colectivo');
    }
    
    return [...new Set(keys)]; // Remove duplicates
  }

  protected onPackageChange(): void {
    const pkg = this.availablePackages().find(p => p.id === this.selectedPackageId);
    this.selectedPackage.set(pkg || null);
    
    if (pkg) {
      // Initialize with required components
      const required = new Set(pkg.components.filter((c: ProductComponent) => !c.isOptional).map((c: ProductComponent) => c.id));
      this.selectedComponents.set(required);
      
      // Set defaults
      this.selectedTerm = pkg.terms[0] || 0;
      
      // Calculate minimum down payment after components are set
      setTimeout(() => {
        this.downPayment = Math.max(
          this.totalPrice() * pkg.minDownPaymentPercentage,
          this.downPayment
        );
      }, 0);
    } else {
      this.selectedComponents.set(new Set());
      this.downPayment = 0;
      this.selectedTerm = 0;
    }
  }

  protected isComponentSelected(componentId: string): boolean {
    return this.selectedComponents().has(componentId);
  }

  protected toggleComponent(componentId: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const components = new Set(this.selectedComponents());
    
    if (checkbox.checked) {
      components.add(componentId);
    } else {
      components.delete(componentId);
    }
    
    this.selectedComponents.set(components);
    this.calculateFinancing();
  }

  protected calculateFinancing(): void {
    // Recalculate when values change
    const minPayment = this.minDownPayment();
    if (this.downPayment < minPayment) {
      this.downPayment = minPayment;
    }
  }

  protected canGenerateQuote(): boolean {
    return this.totalPrice() > 0 && this.selectedTerm > 0 && this.downPayment >= this.minDownPayment();
  }

  protected generateQuote(): void {
    if (!this.canGenerateQuote()) return;
    
    const quote: Quote = {
      totalPrice: this.totalPrice(),
      downPayment: this.downPayment,
      amountToFinance: this.amountToFinance(),
      term: this.selectedTerm,
      monthlyPayment: this.monthlyPayment(),
      market: this.selectedMarket,
      clientType: this.selectedClientType,
      flow: this.mode() === 'savings' ? BusinessFlow.AhorroProgramado : 
            this.selectedClientType === 'collective' ? BusinessFlow.CreditoColectivo : BusinessFlow.VentaPlazo
    };
    
    this.generatedQuote.set(quote);
  }

  protected formalizeQuote(): void {
    const quote = this.generatedQuote();
    if (quote) {
      this.onFormalize.emit(quote);
    }
  }

  protected reset(): void {
    this.selectedPackageId = '';
    this.selectedPackage.set(null);
    this.selectedComponents.set(new Set());
    this.downPayment = 0;
    this.selectedTerm = 0;
    this.generatedQuote.set(null);
  }

  private resetSelection(): void {
    this.selectedPackageId = '';
    this.selectedPackage.set(null);
    this.selectedComponents.set(new Set());
    this.downPayment = 0;
    this.selectedTerm = 0;
    this.generatedQuote.set(null);
    this.loadAvailablePackages();
  }
}