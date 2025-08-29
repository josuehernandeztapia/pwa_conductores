import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { SimulationService } from '../../../services/simulation.service';
import { PdfService } from '../../../services/pdf.service';
import { Client, NavigationContext } from '../../../models/types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  protected readonly clients = signal<Client[]>([]);
  protected readonly isLoading = signal(true);

  constructor(
    private simulationService: SimulationService,
    private pdfService: PdfService
  ) {}

  ngOnInit(): void {
    this.loadClients();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadClients(): void {
    this.simulationService.getClients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clients) => {
          this.clients.set(clients);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to fetch clients:', error);
          this.isLoading.set(false);
        }
      });
  }

  onClientSelect(client: Client, context?: NavigationContext): void {
    // Navigate to client detail
    console.log('Client selected:', client, context);
  }

  protected getActiveClients(): number {
    return this.clients().filter(c => 
      ['Activo', 'Pagos al Corriente', 'Activo en Grupo'].includes(c.status)
    ).length;
  }

  protected getOpportunities(): number {
    return this.clients().filter(c => c.status === 'Nuevas Oportunidades').length;
  }

  protected getCompletedClients(): number {
    return this.clients().filter(c => 
      ['Meta Alcanzada', 'Turno Adjudicado', 'Completado', 'Unidad Lista para Entrega'].includes(c.status)
    ).length;
  }

  protected getRecentClients(): Client[] {
    return this.clients()
      .sort((a, b) => {
        const latestEventA = a.events[0]?.timestamp || new Date(0);
        const latestEventB = b.events[0]?.timestamp || new Date(0);
        return new Date(latestEventB).getTime() - new Date(latestEventA).getTime();
      })
      .slice(0, 5);
  }

  protected getHealthScoreClass(score?: number): string {
    if (!score) return 'health-low';
    if (score >= 90) return 'health-high';
    if (score >= 70) return 'health-medium';
    return 'health-low';
  }

  // PDF generation methods
  protected generateClientReport(client: Client): void {
    this.pdfService.generateClientReportPdf(client);
  }

  protected generateDocumentStatus(client: Client): void {
    this.pdfService.generateDocumentStatusPdf(client);
  }
}