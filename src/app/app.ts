import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, interval } from 'rxjs';
import { SimulationService } from './services/simulation.service';
import { Client, Notification, View } from './models/types';
import { FooterComponent } from './components/shared/footer/footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  protected readonly title = signal('Conductores del Mundo - Asesor PWA');
  protected readonly clients = signal<Client[]>([]);
  protected readonly notifications = signal<Notification[]>([]);
  protected readonly unreadCount = signal(0);
  protected readonly sidebarAlerts = signal<{ [key in View]?: number }>({});
  protected readonly isLoading = signal(true);

  constructor(private simulationService: SimulationService) {}

  ngOnInit(): void {
    this.loadClients();
    this.setupNotificationPolling();
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
          this.calculateSidebarAlerts(clients);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to fetch clients:', error);
          this.isLoading.set(false);
        }
      });
  }

  private setupNotificationPolling(): void {
    interval(8000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.simulationService.getSimulatedAlert(this.clients())
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (newAlert) => {
              if (newAlert) {
                this.notifications.update(notifications => [newAlert, ...notifications]);
                this.unreadCount.update(count => count + 1);
              }
            },
            error: (error) => {
              console.error('Failed to fetch simulated alert:', error);
            }
          });
      });
  }

  private calculateSidebarAlerts(clients: Client[]): void {
    if (clients.length > 0) {
      this.simulationService.getSidebarAlertCounts(clients)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (counts) => {
            this.sidebarAlerts.set(counts);
          },
          error: (error) => {
            console.error('Failed to get sidebar alert counts:', error);
          }
        });
    }
  }
}