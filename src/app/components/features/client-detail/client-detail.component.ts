import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetamapComponent } from '../metamap/metamap.component';
import { DigitalSignatureComponent } from '../../shared/digital-signature/digital-signature.component';
import { PaymentRequestComponent } from '../../shared/payment-request/payment-request.component';
import { DocumentCaptureComponent, CapturedDocument } from '../../shared/document-capture/document-capture.component';
import { KinbanScoringComponent } from '../../shared/kinban-scoring/kinban-scoring.component';
import { Client, DocumentStatus, BusinessFlow } from '../../../models/types';
import { MifielDocument } from '../../../services/mifiel.service';
import { ProductConfiguration } from '../../../services/document-rules-engine.service';
import { KinbanScoreRequest, KinbanScoreResponse } from '../../../services/kinban-scoring.service';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, MetamapComponent, DigitalSignatureComponent, PaymentRequestComponent, DocumentCaptureComponent, KinbanScoringComponent],
  templateUrl: './client-detail.component.html',
  styleUrl: './client-detail.component.scss'
})
export class ClientDetailComponent {
  @Input() client: Client | null = null;
  
  protected readonly showMetamap = signal(false);
  protected readonly showDigitalSignature = signal(false);
  protected readonly showPaymentRequest = signal(false);
  protected readonly showDocumentCapture = signal(false);
  protected readonly showKinbanScoring = signal(false);
  protected readonly currentTab = signal<'overview' | 'documents' | 'scoring' | 'payment' | 'signature'>('overview');
  
  // Scoring state
  protected readonly scoringResult = signal<KinbanScoreResponse | null>(null);
  protected readonly isScoringCompleted = signal(false);
  
  // Document configuration computed from client data
  protected readonly documentConfiguration = computed<ProductConfiguration>(() => {
    if (!this.client) {
      return {
        market: 'aguascalientes',
        product: 'venta-directa'
      };
    }

    // Determine market based on client data or context
    const market: 'aguascalientes' | 'edomex' = 'aguascalientes'; // Default, could be enhanced
    
    // Map business flow to product configuration
    let product: 'venta-directa' | 'venta-plazo' | 'ahorro-programado';
    switch (this.client.flow) {
      case BusinessFlow.VentaDirecta:
        product = 'venta-directa';
        break;
      case BusinessFlow.VentaPlazo:
        product = 'venta-plazo';
        break;
      case BusinessFlow.AhorroProgramado:
        product = 'ahorro-programado';
        break;
      default:
        product = 'venta-directa';
    }

    // Determine client type
    const clientType = this.client.collectiveCreditGroupId ? 'colectivo' : 'individual';

    return {
      market,
      product,
      clientType
    };
  });

  // KINBAN Score Request computed from client data
  protected readonly kinbanScoreRequest = computed<KinbanScoreRequest>(() => {
    if (!this.client) {
      return {
        clientId: 'unknown',
        personalInfo: {
          name: 'Unknown Client'
        },
        businessInfo: {
          market: 'aguascalientes',
          product: 'venta-directa'
        },
        documentsInfo: {
          totalDocuments: 0,
          completedDocuments: 0,
          hasINE: false,
          hasProofOfAddress: false,
          hasRFC: false,
          hasMetamap: false
        }
      };
    }

    const config = this.documentConfiguration();
    const approvedDocs = this.client.documents.filter(d => d.status === DocumentStatus.Aprobado);
    
    return {
      clientId: this.client.id,
      personalInfo: {
        name: this.client.name,
        rfc: this.extractRFCFromDocuments(),
        email: this.extractEmailFromClient(),
        phone: this.extractPhoneFromClient()
      },
      businessInfo: {
        market: config.market,
        product: config.product,
        requestedAmount: this.client.downPayment || undefined,
        monthlyIncome: this.estimateMonthlyIncome()
      },
      documentsInfo: {
        totalDocuments: this.client.documents.length,
        completedDocuments: approvedDocs.length,
        hasINE: this.client.documents.some(d => d.name === 'INE Vigente' && d.status === DocumentStatus.Aprobado),
        hasProofOfAddress: this.client.documents.some(d => d.name === 'Comprobante de domicilio' && d.status === DocumentStatus.Aprobado),
        hasRFC: this.client.documents.some(d => d.name === 'Constancia de situación fiscal' && d.status === DocumentStatus.Aprobado),
        hasMetamap: this.client.documents.some(d => d.name === 'Verificación Biométrica (Metamap)' && d.status === DocumentStatus.Aprobado)
      }
    };
  });

  protected toggleMetamapVerification(): void {
    this.showMetamap.set(!this.showMetamap());
  }

  protected onVerificationComplete(event: { clientId: string, status: string, data: any }): void {
    console.log('Verification completed:', event);
    // Update client document status
    if (this.client) {
      const metamapDoc = this.client.documents.find(d => d.name === 'Verificación Biométrica (Metamap)');
      if (metamapDoc) {
        metamapDoc.status = DocumentStatus.Aprobado;
      }
    }
  }

  protected onVerificationStart(event: { clientId: string }): void {
    console.log('Verification started:', event);
    // Update UI to show verification in progress
    if (this.client) {
      const metamapDoc = this.client.documents.find(d => d.name === 'Verificación Biométrica (Metamap)');
      if (metamapDoc) {
        metamapDoc.status = DocumentStatus.EnRevision;
      }
    }
  }

  protected onVerificationError(event: { clientId: string, error: any }): void {
    console.error('Verification error:', event);
    // Update UI to show error state
    if (this.client) {
      const metamapDoc = this.client.documents.find(d => d.name === 'Verificación Biométrica (Metamap)');
      if (metamapDoc) {
        metamapDoc.status = DocumentStatus.Rechazado;
      }
    }
  }

  protected hasMetamapDocument(): boolean {
    return this.client?.documents.some(d => d.name === 'Verificación Biométrica (Metamap)') || false;
  }

  protected getMetamapDocumentStatus(): string {
    const doc = this.client?.documents.find(d => d.name === 'Verificación Biométrica (Metamap)');
    return doc?.status || DocumentStatus.Pendiente;
  }

  protected toggleDigitalSignature(): void {
    this.showDigitalSignature.set(!this.showDigitalSignature());
  }

  protected onDocumentSigned(document: MifielDocument): void {
    console.log('Document signed:', document);
    // Update document status or notify about successful signing
    // In a real app, you might want to create a new document record
    // or update an existing document status
  }

  protected needsDigitalSignature(): boolean {
    // Show digital signature for clients who need contracts signed
    return this.client?.flow === 'Venta a Plazo' || this.client?.flow === 'Plan de Ahorro';
  }

  protected needsKinbanScoring(): boolean {
    // Show KINBAN scoring for clients who have completed documentation but need credit evaluation
    if (!this.client) return false;
    
    const hasBasicDocs = this.client.documents.some(doc => 
      ['INE', 'Comprobante de Domicilio'].includes(doc.name) && doc.status === 'Aprobado'
    );
    
    // Show scoring if basic docs are completed and no scoring has been done yet
    return hasBasicDocs && !this.isScoringCompleted();
  }

  protected togglePaymentRequest(): void {
    this.showPaymentRequest.set(!this.showPaymentRequest());
  }

  protected needsPayment(): boolean {
    // Show payment request for approved clients who haven't paid
    return this.client?.status === 'Aprobado' || this.client?.status === 'Activo';
  }

  protected getPaymentAmount(): number {
    // Calculate payment amount based on client's plan
    if (this.client?.paymentPlan?.monthlyGoal) {
      return this.client.paymentPlan.monthlyGoal;
    }
    if (this.client?.savingsPlan?.goal) {
      // For savings plans, request 20% as down payment
      return this.client.savingsPlan.goal * 0.20;
    }
    // Default down payment amount
    return 150000; // $150,000 MXN default
  }

  protected onPaymentCompleted(paymentInfo: any): void {
    console.log('Payment completed:', paymentInfo);
    
    // Update client status - in real app this would be handled by webhook
    if (this.client) {
      this.client.status = 'Pago Confirmado';
    }
    
    // Automatically show digital signature after payment
    setTimeout(() => {
      this.showDigitalSignature.set(true);
      this.showPaymentRequest.set(false);
    }, 2000);
  }

  protected onProceedToSignature(): void {
    this.showDigitalSignature.set(true);
    this.showPaymentRequest.set(false);
  }

  // Document capture methods
  protected toggleDocumentCapture(): void {
    this.showDocumentCapture.set(!this.showDocumentCapture());
  }

  protected setActiveTab(tab: 'overview' | 'documents' | 'scoring' | 'payment' | 'signature'): void {
    this.currentTab.set(tab);
    
    // Auto-show relevant components based on tab
    switch (tab) {
      case 'documents':
        this.showDocumentCapture.set(true);
        this.showKinbanScoring.set(false);
        this.showPaymentRequest.set(false);
        this.showDigitalSignature.set(false);
        break;
      case 'scoring':
        this.showKinbanScoring.set(true);
        this.showDocumentCapture.set(false);
        this.showPaymentRequest.set(false);
        this.showDigitalSignature.set(false);
        break;
      case 'payment':
        this.showPaymentRequest.set(true);
        this.showDocumentCapture.set(false);
        this.showKinbanScoring.set(false);
        this.showDigitalSignature.set(false);
        break;
      case 'signature':
        this.showDigitalSignature.set(true);
        this.showDocumentCapture.set(false);
        this.showKinbanScoring.set(false);
        this.showPaymentRequest.set(false);
        break;
      default:
        this.showDocumentCapture.set(false);
        this.showKinbanScoring.set(false);
        this.showPaymentRequest.set(false);
        this.showDigitalSignature.set(false);
    }
  }

  protected onDocumentCaptured(document: CapturedDocument): void {
    console.log('Document captured:', document);
    
    // Update client document status
    if (this.client) {
      const clientDoc = this.client.documents.find(d => d.name === document.name);
      if (clientDoc) {
        clientDoc.status = DocumentStatus.EnRevision;
      }
    }

    // Check if we should trigger scoring after document completion
    this.checkScoringTrigger();
  }

  protected onDocumentsUpdated(): void {
    console.log('Documents updated');
    // Refresh document status or trigger other updates
    this.checkScoringTrigger();
  }

  // KINBAN Scoring methods
  protected toggleKinbanScoring(): void {
    this.showKinbanScoring.set(!this.showKinbanScoring());
  }

  protected needsScoring(): boolean {
    // Show scoring if client has completed basic documentation
    if (!this.client) return false;
    
    const basicDocsCompleted = this.client.documents.filter(d => 
      ['INE Vigente', 'Comprobante de domicilio', 'Constancia de situación fiscal'].includes(d.name) &&
      d.status === DocumentStatus.Aprobado
    ).length >= 2;

    return basicDocsCompleted && !this.isScoringCompleted();
  }

  protected onScoringCompleted(result: KinbanScoreResponse): void {
    console.log('KINBAN scoring completed:', result);
    this.scoringResult.set(result);
    this.isScoringCompleted.set(true);

    // Update client health score based on KINBAN result
    if (this.client) {
      this.client.healthScore = result.score;
    }

    // Auto-advance based on score
    if (result.status === 'approved') {
      setTimeout(() => {
        this.currentTab.set('payment');
        this.showKinbanScoring.set(false);
      }, 2000);
    }
  }

  protected onScoringContinueFlow(): void {
    // Continue to next step in onboarding (payment)
    this.currentTab.set('payment');
    this.showKinbanScoring.set(false);
  }

  protected onScoringReviewRequired(result: KinbanScoreResponse): void {
    console.log('Scoring requires review:', result);
    // Handle cases that need manual review
    // Could open a modal or redirect to review process
  }

  private checkScoringTrigger(): void {
    // Auto-trigger scoring when enough documents are completed
    if (this.needsScoring() && !this.showKinbanScoring()) {
      // Small delay to allow UI to update
      setTimeout(() => {
        this.currentTab.set('scoring');
        this.showKinbanScoring.set(true);
      }, 1000);
    }
  }

  // Helper methods for KINBAN score request
  private extractRFCFromDocuments(): string | undefined {
    // In a real app, this would extract RFC from the tax document
    // For simulation, generate a sample RFC
    return this.client?.name ? this.generateSampleRFC(this.client.name) : undefined;
  }

  private generateSampleRFC(name: string): string {
    // Generate a sample RFC based on name for simulation
    const nameParts = name.split(' ');
    const firstTwo = nameParts[0]?.substring(0, 2).toUpperCase() || 'XX';
    const lastTwo = nameParts[nameParts.length - 1]?.substring(0, 2).toUpperCase() || 'XX';
    const randomNum = Math.floor(Math.random() * 900000) + 100000;
    return `${firstTwo}${lastTwo}${randomNum}`;
  }

  private extractEmailFromClient(): string | undefined {
    // In a real app, this would come from client profile
    // For simulation, generate based on name
    if (this.client?.name) {
      const cleanName = this.client.name.toLowerCase().replace(/\s+/g, '.');
      return `${cleanName}@example.com`;
    }
    return undefined;
  }

  private extractPhoneFromClient(): string | undefined {
    // In a real app, this would come from client profile
    // For simulation, generate a sample phone
    return `55${Math.floor(Math.random() * 90000000) + 10000000}`;
  }

  private estimateMonthlyIncome(): number | undefined {
    // Estimate monthly income based on requested amount and flow
    if (!this.client?.downPayment) return undefined;
    
    // Simple estimation: down payment should be about 3-4 months of income
    return Math.floor(this.client.downPayment / 3.5);
  }

  protected onDocumentsRefresh(): void {
    console.log('Documents updated - refreshing client view');
    // Here you could refresh the client data from the backend
    // or emit an event to parent components
  }

  protected needsDocumentCapture(): boolean {
    // Show document capture for all clients in onboarding process
    return this.client?.status === 'Expediente Pendiente' || 
           this.client?.status === 'En Proceso' ||
           this.client?.status === 'Nuevas Oportunidades';
  }

  protected getTabClass(tab: string): string {
    const baseClasses = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200';
    const activeClasses = 'bg-primary-cyan-600 text-white';
    const inactiveClasses = 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';
    
    return `${baseClasses} ${this.currentTab() === tab ? activeClasses : inactiveClasses}`;
  }
}
