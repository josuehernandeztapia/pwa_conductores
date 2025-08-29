import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/features/dashboard/dashboard.component').then(c => c.DashboardComponent)
  },
  {
    path: 'simulador',
    loadComponent: () => import('./components/features/simulador/simulador.component').then(c => c.SimuladorComponent)
  },
  {
    path: 'oportunidades',
    loadComponent: () => import('./components/features/oportunidades/oportunidades.component').then(c => c.OportunidadesComponent)
  },
  {
    path: 'ecosistemas',
    loadComponent: () => import('./components/features/ecosistemas/ecosistemas.component').then(c => c.EcosistemasComponent)
  },
  {
    path: 'crm-pipeline',
    loadComponent: () => import('./components/features/crm-pipeline/crm-pipeline.component').then(c => c.CrmPipelineComponent)
  },
  {
    path: 'document-center',
    loadComponent: () => import('./components/features/document-center/document-center.component').then(c => c.DocumentCenterComponent)
  },
  {
    path: 'clientes',
    loadComponent: () => import('./components/features/clientes/clientes.component').then(c => c.ClientesComponent)
  },
  {
    path: 'clientes/:id',
    loadComponent: () => import('./components/features/client-detail/client-detail.component').then(c => c.ClientDetailComponent)
  },
  {
    path: 'grupos-colectivos',
    loadComponent: () => import('./components/features/grupos-colectivos/grupos-colectivos.component').then(c => c.GruposColectivosComponent)
  },
  {
    path: 'configuracion',
    loadComponent: () => import('./components/features/configuracion/configuracion.component').then(c => c.ConfiguracionComponent)
  },
  {
    path: 'ahorro-mode',
    loadComponent: () => import('./components/features/ahorro-mode/ahorro-mode.component').then(c => c.AhorroModeComponent)
  },
  {
    path: 'cotizador-mode',
    loadComponent: () => import('./components/features/cotizador-mode/cotizador-mode.component').then(c => c.CotizadorModeComponent)
  },
  {
    path: 'proteccion-simulator',
    loadComponent: () => import('./components/features/proteccion-simulator/proteccion-simulator.component').then(c => c.ProteccionSimulatorComponent)
  },
  {
    path: 'proteccion-simulator/:clientId',
    loadComponent: () => import('./components/features/proteccion-simulator/proteccion-simulator.component').then(c => c.ProteccionSimulatorComponent)
  },
  {
    path: 'business-intelligence',
    loadComponent: () => import('./components/features/business-intelligence/business-intelligence.component').then(c => c.BusinessIntelligenceComponent)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];