import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';

declare global {
  interface Window {
    metamap: any;
  }
}

@Component({
  selector: 'app-metamap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="metamap-container">
      <div class="metamap-header">
        <h3>Verificación de Identidad</h3>
        <p>Complete su verificación biométrica con Metamap</p>
      </div>
      
      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Cargando verificación...</p>
        </div>
      } @else {
        <div #metamapContainer class="metamap-button-container">
          <!-- Metamap button will be inserted here -->
        </div>
      }
      
      @if (verificationStatus()) {
        <div class="verification-status" [class]="'status-' + verificationStatus()">
          <div class="status-icon">
            @switch (verificationStatus()) {
              @case ('completed') { ✅ }
              @case ('pending') { ⏳ }
              @case ('rejected') { ❌ }
              @default { ❓ }
            }
          </div>
          <div class="status-message">
            @switch (verificationStatus()) {
              @case ('completed') { Verificación completada exitosamente }
              @case ('pending') { Verificación en proceso }
              @case ('rejected') { Verificación rechazada - Intente nuevamente }
              @default { Estado desconocido }
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './metamap.component.scss'
})
export class MetamapComponent implements OnInit, OnDestroy {
  @Input() clientId: string = '689833b7d4e7dd0ca48216fb';
  @Input() flowId: string = '689833b7d4e7dd00d08216fa';
  @Input() metadata: string = '{"key": "value"}';
  
  @ViewChild('metamapContainer', { static: true }) 
  metamapContainer!: ElementRef;

  protected readonly isLoading = signal(true);
  protected readonly verificationStatus = signal<'pending' | 'completed' | 'rejected' | null>(null);
  
  // Outputs for parent component
  readonly onVerificationComplete = output<{ clientId: string, status: string, data: any }>();
  readonly onVerificationStart = output<{ clientId: string }>();
  readonly onVerificationError = output<{ clientId: string, error: any }>();

  ngOnInit(): void {
    this.initializeMetamap();
  }

  ngOnDestroy(): void {
    this.cleanupMetamap();
  }

  private initializeMetamap(): void {
    // Wait for Metamap script to load
    if (typeof window !== 'undefined' && window.metamap) {
      this.setupMetamapButton();
    } else {
      // Retry after script loads
      setTimeout(() => {
        if (window.metamap) {
          this.setupMetamapButton();
        } else {
          console.error('Metamap SDK failed to load');
          this.isLoading.set(false);
        }
      }, 1000);
    }
  }

  private setupMetamapButton(): void {
    try {
      // Create metamap button element
      const metamapButton = document.createElement('metamap-button');
      
      // Set attributes
      if (this.clientId) {
        metamapButton.setAttribute('clientid', this.clientId);
      }
      metamapButton.setAttribute('flowid', this.flowId);
      
      if (this.metadata) {
        metamapButton.setAttribute('metadata', this.metadata);
      }

      // Add event listeners
      metamapButton.addEventListener('verification-start', (event: any) => {
        console.log('Metamap verification started:', event.detail);
        this.onVerificationStart.emit({ clientId: this.clientId });
        this.verificationStatus.set('pending');
      });

      metamapButton.addEventListener('verification-complete', (event: any) => {
        console.log('Metamap verification completed:', event.detail);
        this.verificationStatus.set('completed');
        this.onVerificationComplete.emit({
          clientId: this.clientId,
          status: 'completed',
          data: event.detail
        });
      });

      metamapButton.addEventListener('verification-error', (event: any) => {
        console.error('Metamap verification error:', event.detail);
        this.verificationStatus.set('rejected');
        this.onVerificationError.emit({
          clientId: this.clientId,
          error: event.detail
        });
      });

      // Append button to container
      if (this.metamapContainer?.nativeElement) {
        this.metamapContainer.nativeElement.appendChild(metamapButton);
        this.isLoading.set(false);
      }
    } catch (error) {
      console.error('Error setting up Metamap button:', error);
      this.isLoading.set(false);
    }
  }

  private cleanupMetamap(): void {
    if (this.metamapContainer?.nativeElement) {
      this.metamapContainer.nativeElement.innerHTML = '';
    }
  }

  // Public method to trigger verification programmatically
  public startVerification(): void {
    const button = this.metamapContainer?.nativeElement.querySelector('metamap-button');
    if (button) {
      button.click();
    }
  }
}