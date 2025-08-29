import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EcosystemService, EcosystemStats } from '../../../services/ecosystem.service';
import { Ecosystem, EcosystemStatus } from '../../../models/ecosystem-onboarding.types';
import { CollectiveCreditGroup } from '../../../models/types';
import { OdooEcosistema, OdooProspecto } from '../../../services/odoo-api.service';

@Component({
  selector: 'app-ecosistemas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ecosistemas.component.html',
  styleUrl: './ecosistemas.component.scss'
})
export class EcosistemasComponent implements OnInit {
  private ecosystemService = inject(EcosystemService);
  private router = inject(Router);

  ecosystems = computed(() => this.ecosystemService.allEcosystems());
  liveEcosystems = computed(() => this.ecosystemService.liveEcosystems());
  liveProspects = computed(() => this.ecosystemService.liveProspects());
  
  selectedEcosystem = signal<Ecosystem | null>(null);
  selectedLiveEcosystem = signal<OdooEcosistema | null>(null);
  
  // View state
  viewMode = signal<'list' | 'details' | 'live'>('list');
  dataSource = signal<'demo' | 'live'>('demo');
  selectedTab = signal<'info' | 'groups' | 'clients' | 'cartas' | 'prospects' | 'pipeline'>('info');

  // Computed data for selected ecosystem
  ecosystemStats = computed(() => {
    const selected = this.selectedEcosystem();
    return selected ? this.ecosystemService.getEcosystemStats(selected.id) : null;
  });

  ecosystemGroups = computed(() => {
    const selected = this.selectedEcosystem();
    return selected ? this.ecosystemService.getCollectiveGroupsByEcosystem(selected.id) : [];
  });

  ecosystemClients = computed(() => {
    const selected = this.selectedEcosystem();
    return selected ? this.ecosystemService.getClientsByEcosystem(selected.id) : [];
  });

  ecosystemCartasAval = computed(() => {
    const selected = this.selectedEcosystem();
    return selected ? this.ecosystemService.getCartasAvalByEcosystem(selected.id) : [];
  });

  ngOnInit() {
    // Generate demo data if none exists
    if (this.ecosystems().length === 0) {
      this.generateDemoData();
    }
    
    // Load live data from Odoo
    this.refreshLiveData();
  }

  generateDemoData() {
    this.ecosystemService.generateDemoEcosystems();
    this.ecosystemService.updateDemoCollectiveGroups();
    this.ecosystemService.updateDemoClients();
  }

  viewEcosystemDetails(ecosystem: Ecosystem) {
    this.selectedEcosystem.set(ecosystem);
    this.viewMode.set('details');
  }

  goBackToList() {
    this.viewMode.set('list');
    this.selectedEcosystem.set(null);
    this.selectedTab.set('info');
  }

  createNewEcosystem() {
    this.router.navigate(['/ecosystem-onboarding']);
  }

  editEcosystem(ecosystem: Ecosystem) {
    this.router.navigate(['/ecosystem-onboarding'], { 
      queryParams: { id: ecosystem.id } 
    });
  }

  readonly validTabs = ['info', 'groups', 'clients', 'cartas'] as const;
  
  selectTab(tab: 'info' | 'groups' | 'clients' | 'cartas') {
    this.selectedTab.set(tab);
  }

  getStatusClass(status: EcosystemStatus): string {
    switch (status) {
      case 'activa':
        return 'bg-green-100 text-green-800';
      case 'aprobada':
        return 'bg-blue-100 text-blue-800';
      case 'expediente_en_revision':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspendida':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(status: EcosystemStatus): string {
    switch (status) {
      case 'activa':
        return 'Activa';
      case 'aprobada':
        return 'Aprobada';
      case 'expediente_en_revision':
        return 'En Revisión';
      case 'suspendida':
        return 'Suspendida';
      default:
        return 'Registro Inicial';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'ruta_transporte':
        return 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z';
      case 'cooperativa':
        return 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z';
      case 'asociacion':
        return 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4';
      default:
        return 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z';
    }
  }

  createNewGroup() {
    const ecosystem = this.selectedEcosystem();
    if (ecosystem) {
      this.router.navigate(['/grupos-colectivos/nuevo'], {
        queryParams: { ecosystemId: ecosystem.id }
      });
    }
  }

  viewGroup(group: CollectiveCreditGroup) {
    this.router.navigate(['/grupos-colectivos', group.id]);
  }

  issueCartaAval() {
    const ecosystem = this.selectedEcosystem();
    if (ecosystem) {
      this.router.navigate(['/carta-aval/nueva'], {
        queryParams: { ecosystemId: ecosystem.id }
      });
    }
  }

  trackByEcosystemId(index: number, ecosystem: Ecosystem): string {
    return ecosystem.id;
  }

  // ===== LIVE DATA METHODS =====
  refreshLiveData() {
    this.ecosystemService.syncEcosystemsFromOdoo().subscribe({
      next: (ecosystems) => {
        console.log('Synchronized ecosystems from Odoo:', ecosystems.length);
      },
      error: (error) => {
        console.error('Failed to sync ecosystems:', error);
      }
    });

    this.ecosystemService.syncProspectsFromOdoo().subscribe({
      next: (prospects) => {
        console.log('Synchronized prospects from Odoo:', prospects.length);
      },
      error: (error) => {
        console.error('Failed to sync prospects:', error);
      }
    });
  }

  switchToLiveData() {
    this.dataSource.set('live');
    this.viewMode.set('list');
    this.refreshLiveData();
  }

  switchToDemoData() {
    this.dataSource.set('demo');
    this.viewMode.set('list');
  }

  viewLiveEcosystemDetails(ecosystem: OdooEcosistema) {
    this.selectedLiveEcosystem.set(ecosystem);
    this.viewMode.set('live');
    this.selectedTab.set('info');
  }

  createLiveEcosystem() {
    const newEcosystemData: Partial<OdooEcosistema> = {
      nombre: 'Nuevo Ecosistema',
      tipo: 'ruta',
      mercado: 'aguascalientes',
      estado: 'pendiente',
      representanteLegal: {
        nombre: '',
        email: '',
        telefono: ''
      },
      documentosRequeridos: [],
      documentosCompletos: false,
      clientesAsociados: 0,
      gruposColectivos: 0
    };

    this.ecosystemService.createEcosystemInOdoo(newEcosystemData).subscribe({
      next: (newEcosystem) => {
        console.log('Created new ecosystem in Odoo:', newEcosystem);
        this.viewLiveEcosystemDetails(newEcosystem);
      },
      error: (error) => {
        console.error('Failed to create ecosystem:', error);
      }
    });
  }

  updateLiveEcosystem(ecosystemId: string, updates: Partial<OdooEcosistema>) {
    this.ecosystemService.updateEcosystemInOdoo(ecosystemId, updates).subscribe({
      next: (updatedEcosystem) => {
        console.log('Updated ecosystem in Odoo:', updatedEcosystem);
      },
      error: (error) => {
        console.error('Failed to update ecosystem:', error);
      }
    });
  }

  createProspect(ecosystemId?: string) {
    const newProspectData: Partial<OdooProspecto> = {
      nombre: 'Nuevo Prospecto',
      telefono: '',
      mercado: 'aguascalientes',
      tipoInteres: 'individual',
      ecosistemaObjetivo: ecosystemId,
      origenLead: 'web',
      estado: 'nuevo'
    };

    this.ecosystemService.createProspectInOdoo(newProspectData).subscribe({
      next: (newProspect) => {
        console.log('Created new prospect in Odoo:', newProspect);
      },
      error: (error) => {
        console.error('Failed to create prospect:', error);
      }
    });
  }

  convertProspect(prospectId: string) {
    const conversionData = {
      ecosistemaAsignado: this.selectedLiveEcosystem()?.id
    };

    this.ecosystemService.convertProspectInOdoo(prospectId, conversionData).subscribe({
      next: (result) => {
        console.log('Converted prospect to client:', result);
      },
      error: (error) => {
        console.error('Failed to convert prospect:', error);
      }
    });
  }

  getEcosystemProspects() {
    const selectedEcosystem = this.selectedLiveEcosystem();
    if (!selectedEcosystem) return [];
    
    return this.liveProspects().filter(p => 
      p.ecosistemaObjetivo === selectedEcosystem.id
    );
  }

  readonly validLiveTabs = ['info', 'prospects', 'pipeline'] as const;
  
  selectLiveTab(tab: 'info' | 'prospects' | 'pipeline') {
    this.selectedTab.set(tab);
  }

  goBackFromLive() {
    this.viewMode.set('list');
    this.selectedLiveEcosystem.set(null);
    this.selectedTab.set('info');
  }

  getLiveStatusClass(estado: string): string {
    switch (estado) {
      case 'activo':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactivo':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getLiveTypeIcon(tipo: string): string {
    switch (tipo) {
      case 'ruta':
        return 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z';
      case 'cooperativa':
        return 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z';
      case 'asociacion':
        return 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4';
      default:
        return 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z';
    }
  }
}
