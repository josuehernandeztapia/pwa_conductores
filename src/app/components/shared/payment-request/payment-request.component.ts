import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConektaService, PaymentRequest, ConektaOrder, PaymentMethod, OXXOPaymentInfo, SPEIPaymentInfo, PaymentLinkResponse } from '../../../services/conekta.service';
import { ToastService } from '../../../services/toast.service';
import { MakeIntegrationService } from '../../../services/make-integration.service';
import { catchError, of } from 'rxjs';

interface PaymentInfo {
  orderId?: string;
  method: PaymentMethod;
  amount: number;
  status: 'creating' | 'pending' | 'completed' | 'failed';
  oxxoInfo?: OXXOPaymentInfo;
  speiInfo?: SPEIPaymentInfo;
  linkInfo?: PaymentLinkResponse;
  createdAt: Date;
  expiresAt?: Date;
}

@Component({
  selector: 'app-payment-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="payment-request-container">
      <div class="payment-header">
        <h3 class="text-lg font-semibold text-white mb-4">💳 Solicitar Pago de Enganche</h3>
        <div class="payment-amount bg-primary-cyan-900 border border-primary-cyan-700 rounded-lg p-4 mb-6">
          <div class="text-center">
            <p class="text-sm text-primary-cyan-300 mb-1">Monto a Cobrar</p>
            <p class="text-3xl font-bold text-white">{{ formatCurrency(paymentAmount) }}</p>
            <p class="text-sm text-gray-400 mt-1">{{ paymentDescription }}</p>
          </div>
        </div>
      </div>

      <!-- Selector de Método de Pago -->
      @if (mode() === 'select') {
        <div class="payment-methods">
          <h4 class="text-md font-medium text-white mb-4">Selecciona el método de pago:</h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <!-- OXXO -->
            <button 
              (click)="selectPaymentMethod('oxxo')"
              [disabled]="isProcessing()"
              class="payment-method-card">
              <div class="flex items-center p-4">
                <div class="payment-icon bg-red-500">
                  🏪
                </div>
                <div class="ml-4 text-left">
                  <h5 class="font-semibold text-white">OXXO</h5>
                  <p class="text-sm text-gray-400">Paga en efectivo</p>
                  <p class="text-xs text-gray-500">Disponible 7 días</p>
                </div>
              </div>
            </button>

            <!-- SPEI -->
            <button 
              (click)="selectPaymentMethod('spei')"
              [disabled]="isProcessing()"
              class="payment-method-card">
              <div class="flex items-center p-4">
                <div class="payment-icon bg-blue-500">
                  🏦
                </div>
                <div class="ml-4 text-left">
                  <h5 class="font-semibold text-white">SPEI</h5>
                  <p class="text-sm text-gray-400">Transferencia bancaria</p>
                  <p class="text-xs text-gray-500">Disponible 24 hrs</p>
                </div>
              </div>
            </button>

            <!-- Link de Pago -->
            <button 
              (click)="selectPaymentMethod('link')"
              [disabled]="isProcessing()"
              class="payment-method-card md:col-span-2">
              <div class="flex items-center p-4">
                <div class="payment-icon bg-green-500">
                  🔗
                </div>
                <div class="ml-4 text-left">
                  <h5 class="font-semibold text-white">Link de Pago</h5>
                  <p class="text-sm text-gray-400">Tarjeta, OXXO o SPEI en un solo link</p>
                  <p class="text-xs text-gray-500">La opción más flexible</p>
                </div>
              </div>
            </button>
          </div>

          @if (isProcessing()) {
            <div class="processing-indicator">
              <i class="fas fa-spinner fa-spin mr-2"></i>
              Generando instrucciones de pago...
            </div>
          }
        </div>
      }

      <!-- Información de Pago Generada -->
      @if (mode() === 'payment' && currentPayment()) {
        <div class="payment-instructions">
          <!-- OXXO Instructions -->
          @if (currentPayment()?.method === 'oxxo' && currentPayment()?.oxxoInfo) {
            <div class="payment-info oxxo-info">
              <div class="payment-info-header">
                <h4 class="text-lg font-semibold text-white flex items-center">
                  <span class="payment-icon bg-red-500 mr-3">🏪</span>
                  Pago en OXXO
                </h4>
                <div class="payment-status status-pending">
                  <i class="fas fa-clock mr-2"></i>
                  Pendiente de Pago
                </div>
              </div>

              <div class="reference-section">
                <div class="reference-card">
                  <p class="text-sm text-gray-400 mb-2">Referencia OXXO</p>
                  <div class="reference-display">
                    <span class="reference-number">{{ currentPayment()?.oxxoInfo?.reference }}</span>
                    <button 
                      (click)="copyToClipboard(currentPayment()?.oxxoInfo?.reference || '')"
                      class="copy-button">
                      <i class="fas fa-copy"></i>
                    </button>
                  </div>
                </div>
                
                <div class="expiration-info">
                  <p class="text-sm text-gray-400">
                    <i class="fas fa-clock mr-2"></i>
                    Válido hasta: {{ formatExpirationDate(currentPayment()?.oxxoInfo?.expires_at || 0) }}
                  </p>
                </div>
              </div>

              <div class="instructions-box">
                <h5 class="font-semibold text-white mb-3">Instrucciones:</h5>
                <ol class="instruction-list">
                  <li>Acude a cualquier tienda OXXO</li>
                  <li>Proporciona la referencia al cajero</li>
                  <li>Realiza el pago por <strong>{{ formatCurrency(paymentAmount) }}</strong></li>
                  <li>Guarda tu comprobante de pago</li>
                </ol>
              </div>
            </div>
          }

          <!-- SPEI Instructions -->
          @if (currentPayment()?.method === 'spei' && currentPayment()?.speiInfo) {
            <div class="payment-info spei-info">
              <div class="payment-info-header">
                <h4 class="text-lg font-semibold text-white flex items-center">
                  <span class="payment-icon bg-blue-500 mr-3">🏦</span>
                  Transferencia SPEI
                </h4>
                <div class="payment-status status-pending">
                  <i class="fas fa-clock mr-2"></i>
                  Pendiente de Pago
                </div>
              </div>

              <div class="reference-section">
                <div class="spei-details">
                  <div class="spei-field">
                    <label class="text-sm text-gray-400">CLABE</label>
                    <div class="reference-display">
                      <span class="clabe-number">{{ currentPayment()?.speiInfo?.clabe }}</span>
                      <button 
                        (click)="copyToClipboard(currentPayment()?.speiInfo?.clabe || '')"
                        class="copy-button">
                        <i class="fas fa-copy"></i>
                      </button>
                    </div>
                  </div>

                  <div class="spei-field">
                    <label class="text-sm text-gray-400">Banco</label>
                    <span class="bank-name">{{ currentPayment()?.speiInfo?.bank }}</span>
                  </div>

                  <div class="spei-field">
                    <label class="text-sm text-gray-400">Referencia</label>
                    <span class="reference-text">{{ currentPayment()?.speiInfo?.reference }}</span>
                  </div>
                </div>

                <div class="expiration-info">
                  <p class="text-sm text-gray-400">
                    <i class="fas fa-clock mr-2"></i>
                    Válido hasta: {{ formatExpirationDate(currentPayment()?.speiInfo?.expires_at || 0) }}
                  </p>
                </div>
              </div>

              <div class="instructions-box">
                <h5 class="font-semibold text-white mb-3">Instrucciones:</h5>
                <ol class="instruction-list">
                  <li>Usa la CLABE para hacer la transferencia</li>
                  <li>Monto exacto: <strong>{{ formatCurrency(paymentAmount) }}</strong></li>
                  <li>Incluye la referencia en el concepto</li>
                  <li>El pago se refleja en segundos</li>
                </ol>
              </div>
            </div>
          }

          <!-- Payment Link -->
          @if (currentPayment()?.method === 'link' && currentPayment()?.linkInfo) {
            <div class="payment-info link-info">
              <div class="payment-info-header">
                <h4 class="text-lg font-semibold text-white flex items-center">
                  <span class="payment-icon bg-green-500 mr-3">🔗</span>
                  Link de Pago
                </h4>
                <div class="payment-status status-pending">
                  <i class="fas fa-clock mr-2"></i>
                  Pendiente de Pago
                </div>
              </div>

              <div class="link-section">
                <div class="link-card">
                  <p class="text-sm text-gray-400 mb-3">Comparte este link con el cliente:</p>
                  <div class="link-display">
                    <input 
                      type="text" 
                      [value]="currentPayment()?.linkInfo?.url || ''"
                      readonly
                      class="link-input">
                    <button 
                      (click)="copyToClipboard(currentPayment()?.linkInfo?.url || '')"
                      class="copy-button">
                      <i class="fas fa-copy"></i>
                    </button>
                    <button 
                      (click)="openPaymentLink()"
                      class="open-link-button">
                      <i class="fas fa-external-link-alt"></i>
                    </button>
                  </div>
                </div>

                <div class="expiration-info">
                  <p class="text-sm text-gray-400">
                    <i class="fas fa-clock mr-2"></i>
                    Válido hasta: {{ formatExpirationDate(currentPayment()?.linkInfo?.expires_at || 0) }}
                  </p>
                </div>
              </div>

              <div class="instructions-box">
                <h5 class="font-semibold text-white mb-3">El cliente puede pagar con:</h5>
                <ul class="payment-options">
                  <li><i class="fas fa-credit-card mr-2"></i>Tarjeta de débito o crédito</li>
                  <li><i class="fas fa-store mr-2"></i>OXXO (en efectivo)</li>
                  <li><i class="fas fa-university mr-2"></i>SPEI (transferencia)</li>
                </ul>
              </div>
            </div>
          }

          <!-- Action Buttons -->
          <div class="payment-actions">
            <button 
              (click)="refreshPaymentStatus()"
              [disabled]="isRefreshing()"
              class="refresh-button">
              @if (isRefreshing()) {
                <i class="fas fa-spinner fa-spin mr-2"></i>
                Verificando...
              } @else {
                <i class="fas fa-refresh mr-2"></i>
                Verificar Estado
              }
            </button>

            <button 
              (click)="mode.set('select')"
              class="back-button">
              <i class="fas fa-arrow-left mr-2"></i>
              Cambiar Método
            </button>
          </div>
        </div>
      }

      <!-- Payment Completed -->
      @if (mode() === 'completed') {
        <div class="payment-completed">
          <div class="success-animation">
            <i class="fas fa-check-circle text-green-400 text-6xl mb-4"></i>
          </div>
          <h4 class="text-xl font-bold text-white mb-2">¡Pago Confirmado!</h4>
          <p class="text-gray-300 mb-4">El pago ha sido procesado exitosamente</p>
          <div class="completed-actions">
            <button 
              (click)="proceedToContract()"
              class="proceed-button">
              <i class="fas fa-file-signature mr-2"></i>
              Continuar con Firma Digital
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .payment-request-container {
      max-width: 600px;
    }

    .payment-method-card {
      @apply bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-primary-cyan-500 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed;
    }

    .payment-icon {
      @apply w-12 h-12 rounded-lg flex items-center justify-center text-2xl text-white;
    }

    .processing-indicator {
      @apply flex items-center justify-center text-primary-cyan-400 bg-primary-cyan-900 border border-primary-cyan-700 rounded-lg p-4;
    }

    .payment-info {
      @apply bg-gray-700 rounded-lg p-6 mb-6;
    }

    .payment-info-header {
      @apply flex items-center justify-between mb-6 pb-4 border-b border-gray-600;
    }

    .payment-status.status-pending {
      @apply flex items-center px-3 py-1 rounded-full text-sm bg-amber-600 text-white;
    }

    .reference-section {
      @apply mb-6;
    }

    .reference-card, .spei-details {
      @apply bg-gray-800 rounded-lg p-4 mb-4;
    }

    .reference-display, .link-display {
      @apply flex items-center gap-2;
    }

    .reference-number, .clabe-number {
      @apply font-mono text-xl font-bold text-white bg-gray-900 px-4 py-2 rounded border flex-1 text-center;
    }

    .link-input {
      @apply flex-1 bg-gray-900 text-white px-4 py-2 rounded border font-mono text-sm;
    }

    .copy-button, .open-link-button {
      @apply bg-primary-cyan-600 hover:bg-primary-cyan-700 text-white p-2 rounded transition-colors;
    }

    .spei-field {
      @apply mb-3 flex flex-col;
    }

    .spei-field label {
      @apply mb-1;
    }

    .bank-name, .reference-text {
      @apply text-white font-semibold;
    }

    .instructions-box {
      @apply bg-gray-800 rounded-lg p-4;
    }

    .instruction-list {
      @apply text-gray-300 space-y-2 list-decimal list-inside;
    }

    .payment-options {
      @apply text-gray-300 space-y-2;
    }

    .payment-actions {
      @apply flex gap-4 justify-center;
    }

    .refresh-button, .back-button {
      @apply px-4 py-2 rounded-lg font-medium transition-colors;
    }

    .refresh-button {
      @apply bg-primary-cyan-600 hover:bg-primary-cyan-700 text-white;
    }

    .back-button {
      @apply bg-gray-600 hover:bg-gray-500 text-white;
    }

    .payment-completed {
      @apply text-center py-8;
    }

    .success-animation {
      @apply mb-6;
    }

    .proceed-button {
      @apply bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors;
    }

    .expiration-info {
      @apply mt-3 flex items-center justify-center text-center;
    }
  `]
})
export class PaymentRequestComponent {
  @Input() clientId!: string;
  @Input() paymentAmount: number = 0;
  @Input() paymentDescription: string = 'Pago de enganche';

  @Output() paymentCompleted = new EventEmitter<PaymentInfo>();
  @Output() proceedToSignature = new EventEmitter<void>();

  // Component state
  protected readonly mode = signal<'select' | 'payment' | 'completed'>('select');
  protected readonly currentPayment = signal<PaymentInfo | null>(null);
  protected readonly isProcessing = signal(false);
  protected readonly isRefreshing = signal(false);

  constructor(
    private conektaService: ConektaService,
    private toastService: ToastService,
    private makeIntegration: MakeIntegrationService
  ) {}

  protected async selectPaymentMethod(method: PaymentMethod): Promise<void> {
    if (this.isProcessing()) return;

    this.isProcessing.set(true);

    try {
      const request = this.buildPaymentRequest(method);
      let paymentInfo: PaymentInfo;

      switch (method) {
        case 'oxxo':
          const oxxoOrder = await this.conektaService.createOXXOPayment(request).toPromise();
          if (oxxoOrder) {
            paymentInfo = {
              orderId: oxxoOrder.id,
              method: 'oxxo',
              amount: this.paymentAmount,
              status: 'pending',
              oxxoInfo: this.conektaService.extractOXXOInfo(oxxoOrder) || undefined,
              createdAt: new Date(),
              expiresAt: oxxoOrder.charges?.data?.[0]?.payment_method?.expires_at ? 
                new Date(oxxoOrder.charges.data[0].payment_method.expires_at * 1000) : undefined
            };
          } else {
            throw new Error('No se pudo crear la orden OXXO');
          }
          break;

        case 'spei':
          const speiOrder = await this.conektaService.createSPEIPayment(request).toPromise();
          if (speiOrder) {
            paymentInfo = {
              orderId: speiOrder.id,
              method: 'spei',
              amount: this.paymentAmount,
              status: 'pending',
              speiInfo: this.conektaService.extractSPEIInfo(speiOrder) || undefined,
              createdAt: new Date(),
              expiresAt: speiOrder.charges?.data?.[0]?.payment_method?.expires_at ? 
                new Date(speiOrder.charges.data[0].payment_method.expires_at * 1000) : undefined
            };
          } else {
            throw new Error('No se pudo crear la orden SPEI');
          }
          break;

        case 'link':
          const paymentLink = await this.conektaService.createPaymentLink(request).toPromise();
          if (paymentLink) {
            paymentInfo = {
              orderId: paymentLink.id,
              method: 'link',
              amount: this.paymentAmount,
              status: 'pending',
              linkInfo: paymentLink,
              createdAt: new Date(),
              expiresAt: new Date(paymentLink.expires_at * 1000)
            };
          } else {
            throw new Error('No se pudo crear el link de pago');
          }
          break;

        default:
          throw new Error('Método de pago no soportado');
      }

      this.currentPayment.set(paymentInfo);
      this.mode.set('payment');
      this.toastService.success('Instrucciones de pago generadas');

    } catch (error) {
      console.error('Error creating payment:', error);
      this.toastService.error('Error al generar las instrucciones de pago');
    } finally {
      this.isProcessing.set(false);
    }
  }

  protected async refreshPaymentStatus(): Promise<void> {
    const payment = this.currentPayment();
    if (!payment?.orderId || this.isRefreshing()) return;

    this.isRefreshing.set(true);

    try {
      if (payment.method === 'link') {
        const linkStatus = await this.conektaService.getPaymentLink(payment.orderId).toPromise();
        if (linkStatus?.status === 'paid') {
          const updatedPayment = { ...payment, status: 'completed' as const };
          this.currentPayment.set(updatedPayment);
          this.mode.set('completed');
          
          // Send to Make.com automation (fire-and-forget)
          this.makeIntegration.sendPaymentConfirmation({
            clientId: this.clientId,
            method: payment.method,
            amount: payment.amount,
            paymentId: payment.orderId!,
            currency: 'MXN',
            status: 'confirmed',
            timestamp: new Date()
          }).pipe(
            catchError((error: any) => {
              console.warn('Make.com webhook failed (non-critical):', error);
              return of(null);
            })
          ).subscribe();
          
          this.paymentCompleted.emit(updatedPayment);
          this.toastService.success('¡Pago confirmado!');
        }
      } else {
        const order = await this.conektaService.getOrder(payment.orderId).toPromise();
        if (order && this.conektaService.isPaymentCompleted(order)) {
          const updatedPayment = { ...payment, status: 'completed' as const };
          this.currentPayment.set(updatedPayment);
          this.mode.set('completed');
          
          // Send to Make.com automation (fire-and-forget)
          this.makeIntegration.sendPaymentConfirmation({
            clientId: this.clientId,
            method: payment.method,
            amount: payment.amount,
            paymentId: payment.orderId!,
            currency: 'MXN',
            status: 'confirmed',
            timestamp: new Date()
          }).pipe(
            catchError((error: any) => {
              console.warn('Make.com webhook failed (non-critical):', error);
              return of(null);
            })
          ).subscribe();
          
          this.paymentCompleted.emit(updatedPayment);
          this.toastService.success('¡Pago confirmado!');
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      this.toastService.error('Error al verificar el estado del pago');
    } finally {
      this.isRefreshing.set(false);
    }
  }

  protected copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.toastService.success('Copiado al portapapeles');
    }).catch(() => {
      this.toastService.error('Error al copiar');
    });
  }

  protected openPaymentLink(): void {
    const payment = this.currentPayment();
    if (payment?.linkInfo?.url) {
      window.open(payment.linkInfo.url, '_blank');
    }
  }

  protected proceedToContract(): void {
    this.proceedToSignature.emit();
  }

  protected formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  protected formatExpirationDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private buildPaymentRequest(method: PaymentMethod): PaymentRequest {
    return {
      clientId: this.clientId,
      amount: this.paymentAmount,
      description: this.paymentDescription,
      customerInfo: {
        name: 'Cliente Conductor',
        email: 'cliente@example.com',
        phone: '+525512345678'
      },
      lineItems: [{
        name: this.paymentDescription,
        unit_price: this.paymentAmount,
        quantity: 1,
        description: `Pago para cliente ${this.clientId}`
      }],
      method
    };
  }
}