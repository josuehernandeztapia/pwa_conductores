import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export enum NotificationType {
  Lead = 'lead',
  Milestone = 'milestone',
  Risk = 'risk',
  System = 'system'
}

export type NotificationAction = {
  text: string;
  type: 'convert' | 'assign_unit' | 'configure_plan' | 'contact_client' | 'review_docs';
};

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  timestamp: Date;
  clientId?: string;
  clientName?: string;
  action?: NotificationAction;
  isRead?: boolean;
}

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-gray-800 rounded-lg border border-gray-700 shadow-lg">
      <div class="p-4 border-b border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Notificaciones</h3>
          <div class="flex items-center space-x-2">
            @if (unreadCount > 0) {
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
                {{ unreadCount }}
              </span>
            }
            <button
              (click)="markAllAsRead()"
              class="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Marcar todo como leído
            </button>
          </div>
        </div>
        
        <!-- Filter tabs -->
        <div class="flex space-x-1 mt-3">
          <button
            *ngFor="let filter of filterOptions"
            (click)="selectedFilter.set(filter.value)"
            [class]="getFilterButtonClasses(filter.value)"
          >
            {{ filter.label }}
            @if (filter.count > 0) {
              <span class="ml-1 text-xs">({{ filter.count }})</span>
            }
          </button>
        </div>
      </div>
      
      <div class="max-h-96 overflow-y-auto">
        @if (filteredNotifications().length === 0) {
          <div class="p-6 text-center">
            <i class="fas fa-bell-slash text-gray-600 text-3xl mb-2"></i>
            <p class="text-gray-400 text-sm">No hay notificaciones</p>
          </div>
        } @else {
          <div class="divide-y divide-gray-700">
            @for (notification of filteredNotifications(); track notification.id) {
              <div [class]="getNotificationClasses(notification)">
                <div class="flex items-start space-x-3">
                  <div class="flex-shrink-0 mt-1">
                    <i [class]="getNotificationIcon(notification.type)"></i>
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <p [class]="getMessageClasses(notification)">
                          {{ notification.message }}
                        </p>
                        @if (notification.clientName) {
                          <p class="text-xs text-gray-500 mt-1">
                            Cliente: {{ notification.clientName }}
                          </p>
                        }
                      </div>
                      <div class="ml-2 flex-shrink-0">
                        <span class="text-xs text-gray-500">
                          {{ formatTime(notification.timestamp) }}
                        </span>
                      </div>
                    </div>
                    
                    @if (notification.action) {
                      <div class="mt-2">
                        <button
                          (click)="handleAction(notification)"
                          [class]="getActionButtonClasses(notification.action.type)"
                        >
                          {{ notification.action.text }}
                          <i class="fas fa-arrow-right ml-1 text-xs"></i>
                        </button>
                      </div>
                    }
                  </div>
                  
                  <div class="flex-shrink-0">
                    <button
                      (click)="dismissNotification(notification.id)"
                      class="text-gray-500 hover:text-gray-300 p-1"
                      title="Descartar"
                    >
                      <i class="fas fa-times text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class NotificationsPanelComponent {
  @Input() set notificationsList(value: Notification[]) {
    this.notifications.set(value || []);
  }

  @Output() actionTriggered = new EventEmitter<{ action: string; clientId?: string }>();
  @Output() notificationDismissed = new EventEmitter<number>();

  protected readonly notifications = signal<Notification[]>([
    {
      id: 1,
      message: "Nuevo cliente interesado en venta a plazo para Aguascalientes",
      type: NotificationType.Lead,
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      clientName: "María González",
      clientId: "client-001",
      action: { text: "Convertir Lead", type: "convert" },
      isRead: false
    },
    {
      id: 2,
      message: "Cliente alcanzó meta de ahorro programado",
      type: NotificationType.Milestone,
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      clientName: "José Rodriguez",
      clientId: "client-002",
      action: { text: "Configurar Plan", type: "configure_plan" },
      isRead: false
    },
    {
      id: 3,
      message: "Documentos pendientes: Cliente no ha subido INE actualizada",
      type: NotificationType.Risk,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      clientName: "Ana López",
      clientId: "client-003",
      action: { text: "Contactar Cliente", type: "contact_client" },
      isRead: true
    },
    {
      id: 4,
      message: "Unidad disponible para asignación en tanda colectiva",
      type: NotificationType.System,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      action: { text: "Asignar Unidad", type: "assign_unit" },
      isRead: false
    }
  ]);

  protected readonly selectedFilter = signal<string>('all');

  get unreadCount(): number {
    return this.notifications().filter(n => !n.isRead).length;
  }

  get filterOptions() {
    const notifications = this.notifications();
    return [
      { value: 'all', label: 'Todas', count: notifications.length },
      { value: 'lead', label: 'Leads', count: notifications.filter(n => n.type === NotificationType.Lead).length },
      { value: 'milestone', label: 'Hitos', count: notifications.filter(n => n.type === NotificationType.Milestone).length },
      { value: 'risk', label: 'Riesgos', count: notifications.filter(n => n.type === NotificationType.Risk).length },
      { value: 'system', label: 'Sistema', count: notifications.filter(n => n.type === NotificationType.System).length }
    ];
  }

  readonly filteredNotifications = computed(() => {
    const filter = this.selectedFilter();
    if (filter === 'all') {
      return this.notifications().sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    return this.notifications()
      .filter(n => n.type === filter)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  });

  getFilterButtonClasses(filterValue: string): string {
    const baseClasses = 'px-3 py-1 text-xs font-medium rounded-full transition-colors';
    const isActive = this.selectedFilter() === filterValue;
    
    if (isActive) {
      return `${baseClasses} bg-primary-cyan-600 text-white`;
    }
    return `${baseClasses} text-gray-400 hover:text-white hover:bg-gray-700`;
  }

  getNotificationClasses(notification: Notification): string {
    const baseClasses = 'p-4 hover:bg-gray-700/30 transition-colors';
    if (!notification.isRead) {
      return `${baseClasses} bg-gray-700/20`;
    }
    return baseClasses;
  }

  getMessageClasses(notification: Notification): string {
    const baseClasses = 'text-sm';
    if (!notification.isRead) {
      return `${baseClasses} text-white font-medium`;
    }
    return `${baseClasses} text-gray-300`;
  }

  getNotificationIcon(type: NotificationType): string {
    const baseClasses = 'w-4 h-4';
    switch (type) {
      case NotificationType.Lead:
        return `fas fa-user-plus ${baseClasses} text-blue-400`;
      case NotificationType.Milestone:
        return `fas fa-trophy ${baseClasses} text-emerald-400`;
      case NotificationType.Risk:
        return `fas fa-exclamation-triangle ${baseClasses} text-amber-400`;
      case NotificationType.System:
        return `fas fa-cog ${baseClasses} text-gray-400`;
      default:
        return `fas fa-bell ${baseClasses} text-gray-400`;
    }
  }

  getActionButtonClasses(actionType: string): string {
    const baseClasses = 'inline-flex items-center px-3 py-1 text-xs font-semibold rounded-lg transition-all hover:scale-105';
    
    switch (actionType) {
      case 'convert':
        return `${baseClasses} bg-blue-600 hover:bg-blue-700 text-white`;
      case 'configure_plan':
        return `${baseClasses} bg-emerald-600 hover:bg-emerald-700 text-white`;
      case 'contact_client':
        return `${baseClasses} bg-amber-600 hover:bg-amber-700 text-white`;
      case 'assign_unit':
        return `${baseClasses} bg-primary-cyan-600 hover:bg-primary-cyan-700 text-white`;
      case 'review_docs':
        return `${baseClasses} bg-purple-600 hover:bg-purple-700 text-white`;
      default:
        return `${baseClasses} bg-gray-600 hover:bg-gray-500 text-gray-200`;
    }
  }

  handleAction(notification: Notification): void {
    if (notification.action) {
      this.actionTriggered.emit({
        action: notification.action.type,
        clientId: notification.clientId
      });
      
      // Mark notification as read when action is taken
      if (!notification.isRead) {
        this.markAsRead(notification.id);
      }
    }
  }

  dismissNotification(notificationId: number): void {
    this.notifications.update(notifications => 
      notifications.filter(n => n.id !== notificationId)
    );
    this.notificationDismissed.emit(notificationId);
  }

  markAsRead(notificationId: number): void {
    this.notifications.update(notifications =>
      notifications.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
  }

  markAllAsRead(): void {
    this.notifications.update(notifications =>
      notifications.map(n => ({ ...n, isRead: true }))
    );
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return timestamp.toLocaleDateString('es-MX', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
}