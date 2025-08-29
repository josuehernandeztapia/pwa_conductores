import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { View } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-nav-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      (click)="onClick()"
      [class]="buttonClasses"
    >
      <div class="relative">
        <i [class]="'w-6 h-6 ' + icon"></i>
        @if (alertCount && alertCount > 0) {
          <span class="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-gray-900">
            {{ alertCount }}
          </span>
        }
      </div>
      <span class="text-xs mt-1">{{ label }}</span>
    </button>
  `
})
export class NavItemComponent {
  @Input() icon!: string;
  @Input() label!: string;
  @Input() active: boolean = false;
  @Input() alertCount?: number;
  
  @Output() click = new EventEmitter<void>();
  
  onClick(): void {
    this.click.emit();
  }

  get buttonClasses(): string {
    const baseClasses = 'flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200';
    const activeClasses = this.active 
      ? 'text-primary-cyan-400' 
      : 'text-gray-400 hover:text-white';
    return `${baseClasses} ${activeClasses}`;
  }
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, NavItemComponent],
  template: `
    <div class="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-gray-900 border-t border-gray-800 flex justify-around items-center z-40">
      <app-nav-item
        icon="fas fa-tachometer-alt"
        label="Dashboard"
        [active]="activeView === 'dashboard'"
        (click)="onViewChange('dashboard')"
      />
      <app-nav-item
        icon="fas fa-chart-bar"
        label="Oportunidades"
        [active]="activeView === 'oportunidades'"
        [alertCount]="alertCounts['oportunidades']"
        (click)="onViewChange('oportunidades')"
      />
      <app-nav-item
        icon="fas fa-users"
        label="Clientes"
        [active]="activeView === 'clientes'"
        [alertCount]="alertCounts['clientes']"
        (click)="onViewChange('clientes')"
      />
      <app-nav-item
        icon="fas fa-calculator"
        label="Simulador"
        [active]="activeView === 'simulador'"
        (click)="onViewChange('simulador')"
      />
    </div>
  `
})
export class BottomNavComponent {
  @Input() activeView: View = 'dashboard';
  @Input() alertCounts: { [key in View]?: number } = {};
  
  @Output() viewChange = new EventEmitter<View>();

  onViewChange(view: View): void {
    this.viewChange.emit(view);
  }
}