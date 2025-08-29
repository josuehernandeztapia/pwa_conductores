import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { EcosystemService } from '../../../services/ecosystem.service';
import { 
  Ecosystem, 
  CartaAval,
  canEcosystemIssueCartaAval 
} from '../../../models/ecosystem-onboarding.types';

@Component({
  selector: 'app-carta-aval',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './carta-aval.component.html',
  styles: [`
    .fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @media print {
      .no-print {
        display: none !important;
      }
    }
  `]
})
export class CartaAvalComponent implements OnInit {
  private ecosystemService = inject(EcosystemService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  selectedEcosystem = signal<Ecosystem | null>(null);
  isEditing = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  showPreview = signal<boolean>(false);
  
  formData = signal<Partial<CartaAval>>({
    clientId: '',
    clientName: '',
    issuedDate: new Date(),
    validUntil: new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)), // 90 days from now
    amount: undefined,
    purpose: 'ahorro_programado',
    status: 'vigente',
    issuedBy: '',
    documentUrl: '',
    notes: ''
  });

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['ecosystemId']) {
        const ecosystem = this.ecosystemService.getEcosystem(params['ecosystemId']);
        if (ecosystem) {
          this.selectedEcosystem.set(ecosystem);
          // Set primary representative as default
          const updatedFormData = { ...this.formData() };
          updatedFormData.issuedBy = ecosystem.primaryRepresentativeId;
          this.formData.set(updatedFormData);
        }
      }

      if (params['cartaAvalId']) {
        this.isEditing.set(true);
        this.loadCartaAvalForEditing(params['cartaAvalId']);
      }
    });

    // Show preview when form has minimum required data
    this.setupPreviewWatcher();
  }

  private setupPreviewWatcher() {
    // In a real implementation, this would be a reactive effect
    // For now, we'll show preview after a delay when form is filled
  }

  private loadCartaAvalForEditing(cartaAvalId: string) {
    const ecosystem = this.selectedEcosystem();
    if (!ecosystem) return;

    const cartaAval = ecosystem.issuedCartasAval.find(c => c.id === cartaAvalId);
    if (cartaAval) {
      this.formData.set({
        ...cartaAval,
        issuedDate: new Date(cartaAval.issuedDate),
        validUntil: new Date(cartaAval.validUntil)
      });
    }
  }

  canIssueCartaAval(): boolean {
    const ecosystem = this.selectedEcosystem();
    return ecosystem ? canEcosystemIssueCartaAval(ecosystem) : false;
  }

  submitCartaAval() {
    if (!this.canIssueCartaAval() || !this.selectedEcosystem()) return;

    this.isSubmitting.set(true);

    try {
      const ecosystem = this.selectedEcosystem()!;
      const formData = this.formData();

      const cartaAvalData = {
        clientId: formData.clientId!,
        clientName: formData.clientName!,
        issuedDate: new Date(formData.issuedDate!),
        validUntil: new Date(formData.validUntil!),
        amount: formData.amount,
        purpose: formData.purpose as CartaAval['purpose'],
        status: formData.status as CartaAval['status'],
        issuedBy: formData.issuedBy!,
        documentUrl: formData.documentUrl,
        notes: formData.notes
      };

      if (this.isEditing()) {
        // Update existing carta aval
        this.ecosystemService.updateCartaAvalStatus(
          ecosystem.id, 
          formData.id!, 
          cartaAvalData.status
        );
      } else {
        // Create new carta aval
        const newCartaAval = this.ecosystemService.issueCartaAval(ecosystem.id, cartaAvalData);
        
        if (newCartaAval) {
          // Show success and preview
          this.showPreview.set(true);
          setTimeout(() => {
            this.router.navigate(['/ecosistemas'], {
              queryParams: { 
                message: `Carta Aval ${newCartaAval.id} generada exitosamente`,
                ecosystemId: ecosystem.id
              }
            });
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Error creating carta aval:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  generateCartaAvalNumber(): string {
    const ecosystem = this.selectedEcosystem();
    if (!ecosystem) return 'CA-XXXX-001';

    const prefix = ecosystem.type === 'ruta_transporte' ? 'RT' : 
                   ecosystem.type === 'cooperativa' ? 'COOP' : 'ASOC';
    const count = ecosystem.issuedCartasAval.length + 1;
    const year = new Date().getFullYear();
    
    return `CA-${prefix}-${year}-${count.toString().padStart(3, '0')}`;
  }

  getRepresentativeName(): string {
    const ecosystem = this.selectedEcosystem();
    const formData = this.formData();
    
    if (!ecosystem || !formData.issuedBy) return '';

    const rep = ecosystem.legalRepresentatives.find(r => r.id === formData.issuedBy);
    return rep ? rep.name : '';
  }

  getRepresentativeTitle(): string {
    const ecosystem = this.selectedEcosystem();
    const formData = this.formData();
    
    if (!ecosystem || !formData.issuedBy) return '';

    const rep = ecosystem.legalRepresentatives.find(r => r.id === formData.issuedBy);
    return rep ? rep.position : '';
  }

  getPurposeText(purpose: string): string {
    switch (purpose) {
      case 'ahorro_programado':
        return 'Plan de Ahorro Programado';
      case 'credito_colectivo':
        return 'Crédito Colectivo (Tanda)';
      case 'venta_plazo':
        return 'Venta a Plazo';
      default:
        return purpose;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  goBack() {
    const ecosystem = this.selectedEcosystem();
    if (ecosystem) {
      this.router.navigate(['/ecosistemas'], {
        queryParams: { ecosystemId: ecosystem.id }
      });
    } else {
      this.router.navigate(['/ecosistemas']);
    }
  }
}