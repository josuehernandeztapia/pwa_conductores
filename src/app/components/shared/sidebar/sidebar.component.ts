import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogoComponent } from '../logo/logo.component';

export type View = 'dashboard' | 'oportunidades' | 'ecosistemas' | 'crm-pipeline' | 'document-center' | 'clientes' | 'simulador' | 'grupos-colectivos' | 'configuracion' | 'ahorro-mode' | 'cotizador-mode' | 'proteccion-simulator' | 'business-intelligence';

interface NavLinkProps {
  icon: string;
  label: string;
  active: boolean;
  alertCount?: number;
  isCollapsed: boolean;
  onClick: () => void;
}

@Component({
  selector: 'app-nav-link',
  standalone: true,
  imports: [CommonModule],
  template: `
    <a
      href="#"
      (click)="handleClick($event)"
      [class]="linkClasses"
      [title]="isCollapsed ? label : null"
    >
      <i [class]="'w-6 h-6 ' + icon"></i>
      <span [class]="labelClasses">{{ label }}</span>
      @if (alertCount && alertCount > 0) {
        <span [class]="badgeClasses">
          {{ alertCount }}
        </span>
      }
      @if (isCollapsed) {
        <span class="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:block bg-gray-800 text-white text-xs font-semibold px-2 py-1 rounded-md whitespace-nowrap">
          {{ label }}
        </span>
      }
    </a>
  `
})
export class NavLinkComponent {
  @Input() icon!: string;
  @Input() label!: string;
  @Input() active: boolean = false;
  @Input() alertCount?: number;
  @Input() isCollapsed: boolean = false;
  @Output() linkClick = new EventEmitter<void>();

  get linkClasses(): string {
    const baseClasses = 'relative flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 group';
    const activeClasses = this.active 
      ? 'bg-primary-cyan-800 text-white' 
      : 'text-gray-400 hover:bg-gray-700 hover:text-white';
    return `${baseClasses} ${activeClasses}`;
  }

  get labelClasses(): string {
    return `ml-3 flex-1 transition-opacity duration-200 ${this.isCollapsed ? 'opacity-0' : 'opacity-100'}`;
  }

  get badgeClasses(): string {
    const baseClasses = 'flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white transition-opacity duration-200';
    const positionClasses = this.isCollapsed ? 'absolute -top-1 -right-1' : '';
    return `${baseClasses} ${positionClasses}`;
  }

  handleClick(event: Event): void {
    event.preventDefault();
    this.linkClick.emit();
  }
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, LogoComponent, NavLinkComponent],
  template: `
    <div [class]="sidebarClasses">
      <div [class]="headerClasses">
        <app-logo [class]="logoSize" />
      </div>
      <div class="flex-1 flex flex-col p-4 overflow-y-auto">
        <nav class="flex-1 space-y-2">
          <app-nav-link
            icon="fas fa-tachometer-alt"
            label="Dashboard"
            [active]="activeView === 'dashboard'"
            [isCollapsed]="isCollapsed"
            (linkClick)="onViewChange('dashboard')"
          />
          <app-nav-link
            icon="fas fa-chart-bar"
            label="Oportunidades"
            [active]="activeView === 'oportunidades'"
            [alertCount]="alertCounts['oportunidades']"
            [isCollapsed]="isCollapsed"
            (linkClick)="onViewChange('oportunidades')"
          />
          <app-nav-link
            icon="fas fa-book"
            label="Ecosistemas (Rutas)"
            [active]="activeView === 'ecosistemas'"
            [isCollapsed]="isCollapsed"
            (linkClick)="onViewChange('ecosistemas')"
          />
          <app-nav-link
            icon="fas fa-funnel-dollar"
            label="CRM Pipeline"
            [active]="activeView === 'crm-pipeline'"
            [alertCount]="alertCounts['crm-pipeline']"
            [isCollapsed]="isCollapsed"
            (linkClick)="onViewChange('crm-pipeline')"
          />
          <app-nav-link
            icon="fas fa-folder-open"
            label="Centro Documentos"
            [active]="activeView === 'document-center'"
            [alertCount]="alertCounts['document-center']"
            [isCollapsed]="isCollapsed"
            (linkClick)="onViewChange('document-center')"
          />
          <app-nav-link
            icon="fas fa-users"
            label="Clientes"
            [active]="activeView === 'clientes'"
            [alertCount]="alertCounts['clientes']"
            [isCollapsed]="isCollapsed"
            (linkClick)="onViewChange('clientes')"
          />
          
          <div class="pt-4 mt-4 border-t border-gray-700/50">
            <app-nav-link
              icon="fas fa-calculator"
              label="Simulador de Soluciones"
              [active]="activeView === 'simulador'"
              [isCollapsed]="isCollapsed"
              (linkClick)="onViewChange('simulador')"
            />
            <app-nav-link
              icon="fas fa-users"
              label="Grupos Colectivos"
              [active]="activeView === 'grupos-colectivos'"
              [isCollapsed]="isCollapsed"
              (linkClick)="onViewChange('grupos-colectivos')"
            />
          </div>

          <div class="pt-4 mt-4 border-t border-gray-700/50">
            <p class="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Calculadoras</p>
            <app-nav-link
              icon="fas fa-piggy-bank"
              label="Modo Ahorro"
              [active]="activeView === 'ahorro-mode'"
              [isCollapsed]="isCollapsed"
              (linkClick)="onViewChange('ahorro-mode')"
            />
            <app-nav-link
              icon="fas fa-file-invoice-dollar"
              label="Cotizador"
              [active]="activeView === 'cotizador-mode'"
              [isCollapsed]="isCollapsed"
              (linkClick)="onViewChange('cotizador-mode')"
            />
            <app-nav-link
              icon="fas fa-shield-alt"
              label="Protección"
              [active]="activeView === 'proteccion-simulator'"
              [isCollapsed]="isCollapsed"
              (linkClick)="onViewChange('proteccion-simulator')"
            />
          </div>

          <div class="pt-4 mt-4 border-t border-gray-700/50">
            <app-nav-link
              icon="fas fa-chart-line"
              label="Business Intelligence"
              [active]="activeView === 'business-intelligence'"
              [isCollapsed]="isCollapsed"
              (linkClick)="onViewChange('business-intelligence')"
            />
            <app-nav-link
              icon="fas fa-cog"
              label="Configuración"
              [active]="activeView === 'configuracion'"
              [isCollapsed]="isCollapsed"
              (linkClick)="onViewChange('configuracion')"
            />
          </div>
        </nav>
        <div class="mt-auto">
          <button 
            (click)="toggleCollapsed()"
            class="w-full flex items-center justify-center p-3 text-gray-400 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
            [title]="isCollapsed ? 'Expandir' : 'Colapsar'"
          >
            <i [class]="collapseIconClasses"></i>
          </button>
        </div>
      </div>
    </div>
  `
})
export class SidebarComponent {
  @Input() activeView: View = 'dashboard';
  @Input() alertCounts: { [key in View]?: number } = {};
  @Input() isCollapsed: boolean = false;
  
  @Output() viewChange = new EventEmitter<View>();
  @Output() collapsedChange = new EventEmitter<boolean>();

  get sidebarClasses(): string {
    return `hidden md:flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 ease-in-out ${this.isCollapsed ? 'w-20' : 'w-64'}`;
  }

  get headerClasses(): string {
    return `flex items-center justify-center h-20 border-b border-gray-800 px-4 ${this.isCollapsed ? 'px-2' : 'px-4'}`;
  }

  get logoSize(): string {
    return this.isCollapsed ? 'h-10' : 'h-16';
  }

  get collapseIconClasses(): string {
    return `fas fa-angle-double-left w-6 h-6 transition-transform duration-300 ${this.isCollapsed ? 'rotate-180' : ''}`;
  }

  onViewChange(view: View): void {
    this.viewChange.emit(view);
  }

  toggleCollapsed(): void {
    const newCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(newCollapsed);
  }
}