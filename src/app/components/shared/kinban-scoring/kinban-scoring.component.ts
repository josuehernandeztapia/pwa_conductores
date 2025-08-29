import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, of } from 'rxjs';
import { KinbanScoringService, KinbanScoreRequest, KinbanScoreResponse } from '../../../services/kinban-scoring.service';
import { MakeIntegrationService } from '../../../services/make-integration.service';

@Component({
  selector: 'app-kinban-scoring',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kinban-scoring-container">
      <!-- Header -->
      <div class="scoring-header">
        <div class="flex items-center gap-3 mb-4">
          <div class="kinban-logo">
            <i class="fas fa-shield-alt text-blue-500 text-2xl"></i>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-white">Evaluación Crediticia KINBAN/HASE</h3>
            <p class="text-sm text-gray-400">Sistema automatizado de scoring crediticio</p>
          </div>
        </div>
      </div>

      <!-- Processing State -->
      @if (isProcessing()) {
        <div class="processing-state">
          <div class="processing-animation">
            <div class="kinban-spinner">
              <i class="fas fa-cog fa-spin text-blue-400 text-4xl mb-4"></i>
            </div>
          </div>
          <h4 class="text-lg font-semibold text-white mb-2">Procesando Evaluación Crediticia</h4>
          <p class="text-gray-300 mb-4">Analizando perfil del cliente con algoritmos KINBAN/HASE...</p>
          
          <div class="processing-steps">
            <div class="step" [class.completed]="processingStep() >= 1">
              <i class="fas fa-user-check"></i>
              <span>Validación de Identidad</span>
            </div>
            <div class="step" [class.completed]="processingStep() >= 2">
              <i class="fas fa-credit-card"></i>
              <span>Análisis Crediticio</span>
            </div>
            <div class="step" [class.completed]="processingStep() >= 3">
              <i class="fas fa-building"></i>
              <span>Viabilidad de Negocio</span>
            </div>
            <div class="step" [class.completed]="processingStep() >= 4">
              <i class="fas fa-file-alt"></i>
              <span>Documentación</span>
            </div>
          </div>
          
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progressPercentage()"></div>
          </div>
          <p class="text-xs text-gray-400 mt-2">{{progressPercentage()}}% completado</p>
        </div>
      }

      <!-- Score Results -->
      @if (scoreResult() && !isProcessing()) {
        <div class="score-results">
          <!-- Main Score Display -->
          <div class="main-score" [class]="getScoreColorClass(scoreResult()!.color)">
            <div class="score-circle">
              <div class="score-number">{{scoreResult()!.score}}</div>
              <div class="score-label">/ 100</div>
            </div>
            <div class="score-info">
              <h4 class="score-level">{{getScoreLevelText(scoreResult()!.level)}}</h4>
              <p class="score-status">{{getStatusText(scoreResult()!.status)}}</p>
              <div class="risk-indicator" [class]="getRiskColorClass(scoreResult()!.riskLevel)">
                <i [class]="getRiskIcon(scoreResult()!.riskLevel)"></i>
                Riesgo: {{getRiskText(scoreResult()!.riskLevel)}}
              </div>
            </div>
          </div>

          <!-- Factor Breakdown -->
          <div class="factors-breakdown">
            <h5 class="text-white font-semibold mb-3">Desglose de Evaluación</h5>
            <div class="factors-grid">
              <div class="factor-item">
                <div class="factor-header">
                  <i class="fas fa-user-check text-blue-400"></i>
                  <span>Identidad</span>
                </div>
                <div class="factor-score">{{scoreResult()!.factors.identity}}/25</div>
                <div class="factor-bar">
                  <div class="factor-fill" [style.width.%]="(scoreResult()!.factors.identity / 25) * 100"></div>
                </div>
              </div>
              
              <div class="factor-item">
                <div class="factor-header">
                  <i class="fas fa-credit-card text-green-400"></i>
                  <span>Solvencia</span>
                </div>
                <div class="factor-score">{{scoreResult()!.factors.creditworthiness}}/25</div>
                <div class="factor-bar">
                  <div class="factor-fill" [style.width.%]="(scoreResult()!.factors.creditworthiness / 25) * 100"></div>
                </div>
              </div>
              
              <div class="factor-item">
                <div class="factor-header">
                  <i class="fas fa-building text-purple-400"></i>
                  <span>Negocio</span>
                </div>
                <div class="factor-score">{{scoreResult()!.factors.businessViability}}/25</div>
                <div class="factor-bar">
                  <div class="factor-fill" [style.width.%]="(scoreResult()!.factors.businessViability / 25) * 100"></div>
                </div>
              </div>
              
              <div class="factor-item">
                <div class="factor-header">
                  <i class="fas fa-file-alt text-yellow-400"></i>
                  <span>Documentos</span>
                </div>
                <div class="factor-score">{{scoreResult()!.factors.documentation}}/25</div>
                <div class="factor-bar">
                  <div class="factor-fill" [style.width.%]="(scoreResult()!.factors.documentation / 25) * 100"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recommendations -->
          @if (scoreResult()!.recommendations.length > 0) {
            <div class="recommendations">
              <h5 class="text-white font-semibold mb-3">
                <i class="fas fa-lightbulb text-yellow-400 mr-2"></i>
                Recomendaciones
              </h5>
              <ul class="recommendation-list">
                @for (recommendation of scoreResult()!.recommendations; track $index) {
                  <li>{{recommendation}}</li>
                }
              </ul>
            </div>
          }

          <!-- Next Steps -->
          <div class="next-steps">
            <h5 class="text-white font-semibold mb-3">
              <i class="fas fa-route text-blue-400 mr-2"></i>
              Próximos Pasos
            </h5>
            <ul class="steps-list">
              @for (step of scoreResult()!.nextSteps; track $index) {
                <li>{{step}}</li>
              }
            </ul>
          </div>

          <!-- Processing Info -->
          <div class="processing-info">
            <div class="info-grid">
              <div class="info-item">
                <i class="fas fa-clock text-gray-400"></i>
                <span>Tiempo de procesamiento: {{scoreResult()!.processingTime}}ms</span>
              </div>
              <div class="info-item">
                <i class="fas fa-calendar text-gray-400"></i>
                <span>Evaluado: {{formatDate(scoreResult()!.timestamp)}}</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            @if (scoreResult()!.status === 'approved') {
              <button 
                (click)="continueOnboarding()"
                class="continue-button">
                <i class="fas fa-arrow-right mr-2"></i>
                Continuar con Onboarding
              </button>
            }
            
            @if (scoreResult()!.status === 'conditional' || scoreResult()!.status === 'review') {
              <button 
                (click)="reviewCase()"
                class="review-button">
                <i class="fas fa-eye mr-2"></i>
                Revisar Caso
              </button>
            }
            
            <button 
              (click)="recalculateScore()"
              class="recalculate-button"
              [disabled]="isProcessing()">
              <i class="fas fa-refresh mr-2"></i>
              Recalcular Score
            </button>
          </div>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="error-state">
          <i class="fas fa-exclamation-triangle text-red-400 text-3xl mb-3"></i>
          <h4 class="text-lg font-semibold text-white mb-2">Error en la Evaluación</h4>
          <p class="text-gray-300 mb-4">{{error()}}</p>
          <button 
            (click)="retryScoring()"
            class="retry-button">
            <i class="fas fa-redo mr-2"></i>
            Intentar Nuevamente
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .kinban-scoring-container {
      @apply bg-gray-800 rounded-lg p-6 max-w-4xl mx-auto;
    }

    .scoring-header {
      @apply border-b border-gray-700 pb-4 mb-6;
    }

    .processing-state {
      @apply text-center py-8;
    }

    .processing-animation {
      @apply mb-6;
    }

    .kinban-spinner {
      @apply flex justify-center;
    }

    .processing-steps {
      @apply flex justify-center gap-8 mb-6 flex-wrap;
    }

    .step {
      @apply flex flex-col items-center gap-2 text-gray-400 transition-colors;
    }

    .step.completed {
      @apply text-blue-400;
    }

    .step i {
      @apply text-xl;
    }

    .step span {
      @apply text-xs;
    }

    .progress-bar {
      @apply w-full max-w-md mx-auto bg-gray-700 rounded-full h-2;
    }

    .progress-fill {
      @apply bg-blue-400 h-full rounded-full transition-all duration-300;
    }

    .score-results {
      @apply space-y-6;
    }

    .main-score {
      @apply flex items-center gap-6 p-6 rounded-lg border-l-4;
    }

    .main-score.green {
      @apply bg-green-900/30 border-green-400;
    }

    .main-score.yellow {
      @apply bg-yellow-900/30 border-yellow-400;
    }

    .main-score.orange {
      @apply bg-orange-900/30 border-orange-400;
    }

    .main-score.red {
      @apply bg-red-900/30 border-red-400;
    }

    .score-circle {
      @apply flex flex-col items-center justify-center w-24 h-24 rounded-full border-4 border-current;
    }

    .score-number {
      @apply text-2xl font-bold text-white;
    }

    .score-label {
      @apply text-xs text-gray-300;
    }

    .score-info {
      @apply flex-1;
    }

    .score-level {
      @apply text-xl font-bold text-white mb-1;
    }

    .score-status {
      @apply text-gray-300 mb-2;
    }

    .risk-indicator {
      @apply flex items-center gap-2 text-sm;
    }

    .risk-indicator.low {
      @apply text-green-400;
    }

    .risk-indicator.medium {
      @apply text-yellow-400;
    }

    .risk-indicator.high {
      @apply text-orange-400;
    }

    .risk-indicator.very-high {
      @apply text-red-400;
    }

    .factors-breakdown {
      @apply bg-gray-700 rounded-lg p-4;
    }

    .factors-grid {
      @apply grid grid-cols-1 sm:grid-cols-2 gap-4;
    }

    .factor-item {
      @apply space-y-2;
    }

    .factor-header {
      @apply flex items-center gap-2 text-sm text-white;
    }

    .factor-score {
      @apply text-lg font-semibold text-white;
    }

    .factor-bar {
      @apply w-full bg-gray-600 rounded-full h-2;
    }

    .factor-fill {
      @apply bg-blue-400 h-full rounded-full transition-all duration-300;
    }

    .recommendations, .next-steps {
      @apply bg-gray-700 rounded-lg p-4;
    }

    .recommendation-list, .steps-list {
      @apply space-y-2 text-gray-300 text-sm;
    }

    .recommendation-list li, .steps-list li {
      @apply flex items-start gap-2;
    }

    .recommendation-list li::before {
      @apply content-['•'] text-yellow-400 font-bold;
    }

    .steps-list li {
      @apply whitespace-pre-wrap;
    }

    .processing-info {
      @apply text-xs text-gray-400 border-t border-gray-700 pt-4;
    }

    .info-grid {
      @apply flex justify-center gap-6 flex-wrap;
    }

    .info-item {
      @apply flex items-center gap-2;
    }

    .action-buttons {
      @apply flex gap-4 justify-center flex-wrap;
    }

    .continue-button {
      @apply bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors;
    }

    .review-button {
      @apply bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors;
    }

    .recalculate-button {
      @apply bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors;
    }

    .error-state {
      @apply text-center py-8;
    }

    .retry-button {
      @apply bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors;
    }
  `]
})
export class KinbanScoringComponent {
  @Input() clientId!: string;
  @Input() clientName!: string;
  @Input() scoreRequest!: KinbanScoreRequest;
  
  @Output() scoringCompleted = new EventEmitter<KinbanScoreResponse>();
  @Output() continueFlow = new EventEmitter<void>();
  @Output() reviewRequired = new EventEmitter<KinbanScoreResponse>();

  // Component state
  protected readonly isProcessing = signal(false);
  protected readonly scoreResult = signal<KinbanScoreResponse | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly processingStep = signal(0);

  // Computed values
  protected readonly progressPercentage = computed(() => (this.processingStep() / 4) * 100);

  constructor(
    private kinbanScoringService: KinbanScoringService,
    private makeIntegration: MakeIntegrationService
  ) {}

  ngOnInit() {
    // Check if we have a cached score first
    const cached = this.kinbanScoringService.getCachedScore(this.clientId);
    if (cached) {
      this.scoreResult.set(cached.score);
      this.scoringCompleted.emit(cached.score);
    } else {
      // Start scoring automatically
      this.startScoring();
    }
  }

  protected startScoring(): void {
    this.isProcessing.set(true);
    this.error.set(null);
    this.scoreResult.set(null);

    // Simulate processing steps
    this.simulateProcessingSteps();

    // Execute actual scoring
    this.kinbanScoringService.calculateScore(this.scoreRequest).subscribe({
      next: (score) => {
        this.isProcessing.set(false);
        this.scoreResult.set(score);
        this.scoringCompleted.emit(score);

        // Send to Make.com automation (fire-and-forget)
        this.makeIntegration.sendScoringComplete({
          clientId: this.clientId,
          score: score.score,
          level: score.level,
          status: score.status,
          riskLevel: score.riskLevel,
          timestamp: new Date()
        }).pipe(
          catchError(error => {
            console.warn('Make.com webhook failed (non-critical):', error);
            return of(null);
          })
        ).subscribe();
      },
      error: (error) => {
        this.isProcessing.set(false);
        this.error.set('Error al procesar la evaluación crediticia. Por favor, intenta nuevamente.');
        console.error('Scoring error:', error);
      }
    });
  }

  private simulateProcessingSteps(): void {
    const stepDuration = 750; // 750ms per step
    
    setTimeout(() => this.processingStep.set(1), stepDuration);
    setTimeout(() => this.processingStep.set(2), stepDuration * 2);
    setTimeout(() => this.processingStep.set(3), stepDuration * 3);
    setTimeout(() => this.processingStep.set(4), stepDuration * 4);
  }

  protected continueOnboarding(): void {
    this.continueFlow.emit();
  }

  protected reviewCase(): void {
    const score = this.scoreResult();
    if (score) {
      this.reviewRequired.emit(score);
    }
  }

  protected recalculateScore(): void {
    // Clear cache and recalculate
    this.kinbanScoringService.clearScoreCache(this.clientId);
    this.processingStep.set(0);
    this.startScoring();
  }

  protected retryScoring(): void {
    this.startScoring();
  }

  // UI Helper methods
  protected getScoreColorClass(color: string): string {
    return color;
  }

  protected getScoreLevelText(level: string): string {
    const levels = {
      'excellent': 'Excelente',
      'good': 'Bueno',
      'fair': 'Regular',
      'poor': 'Pobre',
      'rejected': 'Rechazado'
    };
    return levels[level as keyof typeof levels] || level;
  }

  protected getStatusText(status: string): string {
    const statusTexts = {
      'approved': 'Aprobado para financiamiento',
      'conditional': 'Aprobación condicional',
      'review': 'Requiere revisión manual',
      'rejected': 'No aprobado'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  protected getRiskColorClass(riskLevel: string): string {
    const classes = {
      'low': 'low',
      'medium': 'medium', 
      'high': 'high',
      'very-high': 'very-high'
    };
    return classes[riskLevel as keyof typeof classes] || 'medium';
  }

  protected getRiskIcon(riskLevel: string): string {
    const icons = {
      'low': 'fas fa-shield-alt',
      'medium': 'fas fa-exclamation-triangle',
      'high': 'fas fa-exclamation-circle',
      'very-high': 'fas fa-times-circle'
    };
    return icons[riskLevel as keyof typeof icons] || 'fas fa-exclamation-triangle';
  }

  protected getRiskText(riskLevel: string): string {
    const texts = {
      'low': 'Bajo',
      'medium': 'Medio',
      'high': 'Alto', 
      'very-high': 'Muy Alto'
    };
    return texts[riskLevel as keyof typeof texts] || riskLevel;
  }

  protected formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }
}