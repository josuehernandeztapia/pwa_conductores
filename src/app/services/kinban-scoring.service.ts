import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface KinbanScoreRequest {
  clientId: string;
  personalInfo: {
    name: string;
    rfc?: string;
    email?: string;
    phone?: string;
  };
  businessInfo: {
    market: 'aguascalientes' | 'edomex';
    product: 'venta-directa' | 'venta-plazo' | 'ahorro-programado' | 'credito-colectivo';
    requestedAmount?: number;
    monthlyIncome?: number;
  };
  documentsInfo: {
    totalDocuments: number;
    completedDocuments: number;
    hasINE: boolean;
    hasProofOfAddress: boolean;
    hasRFC: boolean;
    hasMetamap: boolean;
  };
}

export interface KinbanScoreResponse {
  clientId: string;
  score: number; // 0-100
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'rejected';
  color: 'green' | 'yellow' | 'orange' | 'red';
  status: 'approved' | 'conditional' | 'review' | 'rejected';
  factors: {
    identity: number; // 0-25 points
    creditworthiness: number; // 0-25 points
    businessViability: number; // 0-25 points
    documentation: number; // 0-25 points
  };
  recommendations: string[];
  nextSteps: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'very-high';
  timestamp: Date;
  processingTime: number; // in milliseconds
}

export interface StoredScore {
  clientId: string;
  score: KinbanScoreResponse;
  createdAt: Date;
  isValid: boolean; // expires after 30 days
}

@Injectable({
  providedIn: 'root'
})
export class KinbanScoringService {
  private readonly API_URL = `${environment.apiUrl}/kinban-scoring`;
  private readonly CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

  // In-memory cache for demo purposes
  private scoreCache = new Map<string, StoredScore>();
  
  // Simulation parameters
  private readonly SIMULATION_DELAY = 3000; // 3 seconds processing time
  private readonly BASE_SCORE = 75; // Default score for simulation
  private readonly SCORE_VARIANCE = 15; // ±15 points variance

  constructor(private http: HttpClient) {}

  /**
   * Calculate KINBAN/HASE score for a client
   * In production, this would call the actual KINBAN API
   * For now, it simulates a realistic scoring process
   */
  calculateScore(request: KinbanScoreRequest): Observable<KinbanScoreResponse> {
    // Check cache first
    const cached = this.getCachedScore(request.clientId);
    if (cached && this.isScoreValid(cached)) {
      return of(cached.score).pipe(delay(500)); // Quick cache response
    }

    // Simulate API call with realistic processing time
    return this.simulateScoring(request).pipe(
      delay(this.SIMULATION_DELAY),
      map(score => {
        // Cache the result
        this.cacheScore(request.clientId, score);
        return score;
      })
    );
  }

  /**
   * Get cached score if available and valid
   */
  getCachedScore(clientId: string): StoredScore | null {
    const cached = this.scoreCache.get(clientId);
    if (cached && this.isScoreValid(cached)) {
      return cached;
    }
    return null;
  }

  /**
   * Check if a score is still valid (not expired)
   */
  private isScoreValid(storedScore: StoredScore): boolean {
    const age = Date.now() - storedScore.createdAt.getTime();
    return age < this.CACHE_DURATION && storedScore.isValid;
  }

  /**
   * Cache a score result
   */
  private cacheScore(clientId: string, score: KinbanScoreResponse): void {
    this.scoreCache.set(clientId, {
      clientId,
      score,
      createdAt: new Date(),
      isValid: true
    });
  }

  /**
   * Simulate the KINBAN/HASE scoring algorithm
   * This creates realistic-looking scores based on client data
   */
  private simulateScoring(request: KinbanScoreRequest): Observable<KinbanScoreResponse> {
    return new Observable(observer => {
      const startTime = Date.now();

      // Calculate individual factor scores
      const identityScore = this.calculateIdentityScore(request);
      const creditScore = this.calculateCreditworthinessScore(request);
      const businessScore = this.calculateBusinessViabilityScore(request);
      const documentationScore = this.calculateDocumentationScore(request);

      // Total score (with some randomization for simulation)
      const baseTotal = identityScore + creditScore + businessScore + documentationScore;
      const randomVariance = (Math.random() - 0.5) * 2 * this.SCORE_VARIANCE;
      const totalScore = Math.max(0, Math.min(100, Math.round(baseTotal + randomVariance)));

      // Determine level and status based on score
      const { level, color, status, riskLevel } = this.determineScoreLevel(totalScore);

      // Generate recommendations and next steps
      const recommendations = this.generateRecommendations(request, {
        identity: identityScore,
        creditworthiness: creditScore,
        businessViability: businessScore,
        documentation: documentationScore
      });

      const nextSteps = this.generateNextSteps(status, request);

      const response: KinbanScoreResponse = {
        clientId: request.clientId,
        score: totalScore,
        level,
        color,
        status,
        factors: {
          identity: identityScore,
          creditworthiness: creditScore,
          businessViability: businessScore,
          documentation: documentationScore
        },
        recommendations,
        nextSteps,
        riskLevel,
        timestamp: new Date(),
        processingTime: Date.now() - startTime
      };

      observer.next(response);
      observer.complete();
    });
  }

  private calculateIdentityScore(request: KinbanScoreRequest): number {
    let score = 15; // Base score

    // RFC validation adds points
    if (request.personalInfo.rfc && request.personalInfo.rfc.length >= 12) {
      score += 5;
    }

    // Email validation
    if (request.personalInfo.email && request.personalInfo.email.includes('@')) {
      score += 3;
    }

    // Phone validation
    if (request.personalInfo.phone && request.personalInfo.phone.length >= 10) {
      score += 2;
    }

    return Math.min(25, score);
  }

  private calculateCreditworthinessScore(request: KinbanScoreRequest): number {
    let score = 18; // Base score - everyone starts with decent credit simulation

    // Market-based adjustments
    if (request.businessInfo.market === 'aguascalientes') {
      score += 2; // AGS market is considered lower risk
    }

    // Product-based adjustments
    if (request.businessInfo.product === 'venta-directa') {
      score += 3; // Cash sales are lowest risk
    } else if (request.businessInfo.product === 'credito-colectivo') {
      score += 1; // Collective credit has social collateral
    }

    // Income-based adjustments (if provided)
    if (request.businessInfo.monthlyIncome && request.businessInfo.requestedAmount) {
      const debtToIncomeRatio = request.businessInfo.requestedAmount / (request.businessInfo.monthlyIncome * 12);
      if (debtToIncomeRatio < 0.3) {
        score += 2;
      }
    }

    return Math.min(25, score);
  }

  private calculateBusinessViabilityScore(request: KinbanScoreRequest): number {
    let score = 17; // Base business viability score

    // Market experience factor
    if (request.businessInfo.market === 'edomex' && request.businessInfo.product === 'credito-colectivo') {
      score += 3; // EdoMex collective credit is proven model
    }

    // Product viability
    if (request.businessInfo.product === 'venta-plazo' || request.businessInfo.product === 'ahorro-programado') {
      score += 2; // These products show planning capability
    }

    // Random business factor simulation
    score += Math.floor(Math.random() * 4); // 0-3 additional points

    return Math.min(25, score);
  }

  private calculateDocumentationScore(request: KinbanScoreRequest): number {
    let score = 10; // Base documentation score

    const completionRate = request.documentsInfo.totalDocuments > 0 
      ? request.documentsInfo.completedDocuments / request.documentsInfo.totalDocuments 
      : 0;

    // Completion rate bonus
    score += Math.floor(completionRate * 10);

    // Essential documents bonuses
    if (request.documentsInfo.hasINE) score += 2;
    if (request.documentsInfo.hasProofOfAddress) score += 1;
    if (request.documentsInfo.hasRFC) score += 1;
    if (request.documentsInfo.hasMetamap) score += 1;

    return Math.min(25, score);
  }

  private determineScoreLevel(score: number): {
    level: KinbanScoreResponse['level'];
    color: KinbanScoreResponse['color'];
    status: KinbanScoreResponse['status'];
    riskLevel: KinbanScoreResponse['riskLevel'];
  } {
    if (score >= 80) {
      return { level: 'excellent', color: 'green', status: 'approved', riskLevel: 'low' };
    } else if (score >= 70) {
      return { level: 'good', color: 'green', status: 'approved', riskLevel: 'low' };
    } else if (score >= 60) {
      return { level: 'fair', color: 'yellow', status: 'conditional', riskLevel: 'medium' };
    } else if (score >= 40) {
      return { level: 'poor', color: 'orange', status: 'review', riskLevel: 'high' };
    } else {
      return { level: 'rejected', color: 'red', status: 'rejected', riskLevel: 'very-high' };
    }
  }

  private generateRecommendations(request: KinbanScoreRequest, factors: KinbanScoreResponse['factors']): string[] {
    const recommendations: string[] = [];

    if (factors.identity < 20) {
      recommendations.push('Completar información de identificación (RFC, email, teléfono)');
    }

    if (factors.documentation < 20) {
      recommendations.push('Completar documentación requerida para el producto seleccionado');
    }

    if (factors.creditworthiness < 20) {
      recommendations.push('Considerar un enganche mayor para mejorar el perfil crediticio');
    }

    if (factors.businessViability < 20) {
      recommendations.push('Revisar la viabilidad del modelo de negocio propuesto');
    }

    // Default positive recommendations for good scores
    if (recommendations.length === 0) {
      recommendations.push('Perfil crediticio excelente');
      recommendations.push('Documentación completa y verificada');
      recommendations.push('Listo para continuar con el proceso de financiamiento');
    }

    return recommendations;
  }

  private generateNextSteps(status: KinbanScoreResponse['status'], request: KinbanScoreRequest): string[] {
    const steps: string[] = [];

    switch (status) {
      case 'approved':
        steps.push('✅ Continuar con el proceso de pago de enganche');
        steps.push('📄 Preparar documentos para firma de contrato');
        steps.push('🚛 Programar entrega de unidad');
        break;
      
      case 'conditional':
        steps.push('📋 Completar documentación pendiente');
        steps.push('💰 Revisar términos de financiamiento');
        steps.push('🔄 Re-evaluar score una vez completados los requisitos');
        break;
      
      case 'review':
        steps.push('👥 Programar reunión con equipo comercial');
        steps.push('📊 Análisis detallado del caso');
        steps.push('⚖️ Evaluación manual de riesgos');
        break;
      
      case 'rejected':
        steps.push('❌ Solicitud no aprobada en este momento');
        steps.push('📞 Contactar para explorar alternativas');
        steps.push('🔄 Re-aplicar en el futuro con mejor perfil');
        break;
    }

    return steps;
  }

  /**
   * Get all cached scores (for admin purposes)
   */
  getAllCachedScores(): StoredScore[] {
    return Array.from(this.scoreCache.values())
      .filter(score => this.isScoreValid(score));
  }

  /**
   * Clear score cache for a specific client
   */
  clearScoreCache(clientId: string): void {
    this.scoreCache.delete(clientId);
  }

  /**
   * Clear all score cache
   */
  clearAllCache(): void {
    this.scoreCache.clear();
  }
}