import { Document, DocumentStatus } from './types';

export type EcosystemType = 'ruta_transporte' | 'cooperativa' | 'asociacion';
export type EcosystemStatus = 'registro_inicial' | 'expediente_en_revision' | 'aprobada' | 'activa' | 'suspendida';

export interface EcosystemDocument extends Document {
  category: 'legal' | 'fiscal' | 'operational' | 'representative';
  expirationDate?: Date;
  issuer?: string;
  folio?: string;
}

export interface LegalRepresentative {
  id: string;
  name: string;
  position: string; // 'Presidente', 'Representante Legal', 'Apoderado'
  rfc?: string;
  curp?: string;
  documents: EcosystemDocument[]; // INE, Poder, etc.
  isActive: boolean;
}

export interface RoutePermit {
  id: string;
  routeNumber: string;
  routeName: string;
  origin: string;
  destination: string;
  permitNumber: string;
  issuedBy: string; // SCT, Gobierno Estatal, etc.
  validFrom: Date;
  validTo: Date;
  vehicleCapacity: number;
  operatingDays: string[];
  status: 'vigente' | 'por_vencer' | 'vencido' | 'suspendido';
}

export interface EcosystemOnboardingStage {
  id: string;
  name: string;
  description: string;
  order: number;
  required: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'blocked';
  documents: string[]; // Document IDs required for this stage
  estimatedDuration: number; // in days
  dueDate?: Date;
}

export interface Ecosystem {
  id: string;
  name: string;
  type: EcosystemType;
  status: EcosystemStatus;
  
  // Contact Information
  email?: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  
  // Legal Information
  businessName: string; // Razón social
  rfc: string;
  constitutionDate?: Date;
  registrationNumber?: string; // Registro público de comercio
  
  // Representatives
  legalRepresentatives: LegalRepresentative[];
  primaryRepresentativeId: string;
  
  // Route-specific information
  routes?: RoutePermit[];
  operatingRegion: string; // 'Estado de México', 'Aguascalientes'
  totalMembers: number;
  activeMembers: number;
  
  // Documents
  documents: EcosystemDocument[];
  
  // Onboarding Flow
  onboardingStages: EcosystemOnboardingStage[];
  currentStage?: string;
  
  // Business Metrics
  monthlyRevenue?: number;
  averageAge: number; // Promedio edad de unidades
  fleetSize: number;
  
  // Timestamps
  registeredAt: Date;
  approvedAt?: Date;
  lastUpdated: Date;
  
  // System
  createdBy: string; // Asesor ID
  assignedAsesorId?: string;
  
  // Carta Aval Management
  cartaAvalEnabled: boolean;
  cartaAvalTemplate?: string;
  issuedCartasAval: CartaAval[];
}

export interface CartaAval {
  id: string;
  ecosystemId: string;
  clientId: string;
  clientName: string;
  issuedDate: Date;
  validUntil: Date;
  amount?: number; // Monto avalado
  purpose: 'ahorro_programado' | 'credito_colectivo' | 'venta_plazo';
  status: 'vigente' | 'utilizada' | 'vencida' | 'cancelada';
  issuedBy: string; // Representative ID
  documentUrl?: string;
  notes?: string;
}

// Pre-defined document requirements for ecosystem onboarding
export const ECOSYSTEM_DOCUMENT_REQUIREMENTS: Record<EcosystemType, EcosystemDocument[]> = {
  ruta_transporte: [
    // Legal Documents
    {
      id: 'acta_constitutiva',
      name: 'Acta Constitutiva de la Ruta',
      status: DocumentStatus.Pendiente,
      category: 'legal',
      tooltip: 'Documento que acredita la constitución legal de la ruta/cooperativa'
    },
    {
      id: 'rpp_inscription',
      name: 'Inscripción en Registro Público de la Propiedad',
      status: DocumentStatus.Pendiente,
      category: 'legal',
      tooltip: 'Registro oficial de la constitución de la empresa'
    },
    {
      id: 'estatutos_sociales',
      name: 'Estatutos Sociales',
      status: DocumentStatus.Pendiente,
      category: 'legal',
      tooltip: 'Reglamento interno de la organización'
    },
    
    // Fiscal Documents
    {
      id: 'rfc_moral',
      name: 'RFC de Persona Moral',
      status: DocumentStatus.Pendiente,
      category: 'fiscal',
      tooltip: 'Registro Federal de Contribuyentes de la empresa'
    },
    {
      id: 'constancia_fiscal',
      name: 'Constancia de Situación Fiscal',
      status: DocumentStatus.Pendiente,
      category: 'fiscal',
      tooltip: 'Situación fiscal actualizada ante el SAT'
    },
    {
      id: 'comprobante_domicilio_fiscal',
      name: 'Comprobante de Domicilio Fiscal',
      status: DocumentStatus.Pendiente,
      category: 'fiscal',
      tooltip: 'Comprobante del domicilio fiscal registrado'
    },
    
    // Legal Representative Documents
    {
      id: 'poder_representante',
      name: 'Poder del Representante Legal',
      status: DocumentStatus.Pendiente,
      category: 'representative',
      tooltip: 'Documento que acredita las facultades del representante legal'
    },
    {
      id: 'ine_representante',
      name: 'INE del Representante Legal',
      status: DocumentStatus.Pendiente,
      category: 'representative',
      tooltip: 'Identificación oficial del representante legal'
    },
    {
      id: 'curp_representante',
      name: 'CURP del Representante Legal',
      status: DocumentStatus.Pendiente,
      category: 'representative',
      isOptional: true,
      tooltip: 'Clave Única de Registro de Población del representante'
    },
    
    // Operational Documents
    {
      id: 'concesion_transporte',
      name: 'Concesión de Transporte',
      status: DocumentStatus.Pendiente,
      category: 'operational',
      tooltip: 'Permiso oficial para operar el transporte público'
    },
    {
      id: 'padron_vehicular',
      name: 'Padrón Vehicular de la Ruta',
      status: DocumentStatus.Pendiente,
      category: 'operational',
      tooltip: 'Lista oficial de vehículos autorizados en la ruta'
    },
    {
      id: 'carta_antiguedad',
      name: 'Carta de Antigüedad de la Ruta',
      status: DocumentStatus.Pendiente,
      category: 'operational',
      tooltip: 'Documento que acredita la antigüedad operando la ruta'
    }
  ],
  
  cooperativa: [
    // Similar structure for cooperativas
    {
      id: 'acta_constitutiva_coop',
      name: 'Acta Constitutiva de la Cooperativa',
      status: DocumentStatus.Pendiente,
      category: 'legal'
    }
    // ... más documentos específicos de cooperativas
  ],
  
  asociacion: [
    // Similar structure for asociaciones
    {
      id: 'acta_constitutiva_asoc',
      name: 'Acta Constitutiva de la Asociación',
      status: DocumentStatus.Pendiente,
      category: 'legal'
    }
    // ... más documentos específicos de asociaciones
  ]
};

// Pre-defined onboarding stages for ecosystems
export const ECOSYSTEM_ONBOARDING_STAGES: Record<EcosystemType, EcosystemOnboardingStage[]> = {
  ruta_transporte: [
    {
      id: 'registro_inicial',
      name: 'Registro Inicial',
      description: 'Captura de información básica de la ruta',
      order: 1,
      required: true,
      status: 'pending',
      documents: [],
      estimatedDuration: 1
    },
    {
      id: 'documentos_legales',
      name: 'Documentos Legales',
      description: 'Acta constitutiva, estatutos y registro público',
      order: 2,
      required: true,
      status: 'pending',
      documents: ['acta_constitutiva', 'rpp_inscription', 'estatutos_sociales'],
      estimatedDuration: 5
    },
    {
      id: 'documentos_fiscales',
      name: 'Documentos Fiscales',
      description: 'RFC, constancias fiscales y comprobantes',
      order: 3,
      required: true,
      status: 'pending',
      documents: ['rfc_moral', 'constancia_fiscal', 'comprobante_domicilio_fiscal'],
      estimatedDuration: 3
    },
    {
      id: 'representante_legal',
      name: 'Representante Legal',
      description: 'Documentos del representante legal y poderes',
      order: 4,
      required: true,
      status: 'pending',
      documents: ['poder_representante', 'ine_representante', 'curp_representante'],
      estimatedDuration: 2
    },
    {
      id: 'documentos_operacionales',
      name: 'Documentos Operacionales',
      description: 'Concesiones, permisos y padrones vehiculares',
      order: 5,
      required: true,
      status: 'pending',
      documents: ['concesion_transporte', 'padron_vehicular', 'carta_antiguedad'],
      estimatedDuration: 7
    },
    {
      id: 'revision_final',
      name: 'Revisión Final',
      description: 'Verificación y aprobación del expediente completo',
      order: 6,
      required: true,
      status: 'pending',
      documents: [],
      estimatedDuration: 3
    },
    {
      id: 'activacion_sistema',
      name: 'Activación en Sistema',
      description: 'Alta en sistema y habilitación para emitir cartas aval',
      order: 7,
      required: true,
      status: 'pending',
      documents: [],
      estimatedDuration: 1
    }
  ],
  
  cooperativa: [
    // Similar stages for cooperativas
  ],
  
  asociacion: [
    // Similar stages for asociaciones
  ]
};

// Helper functions
export function getEcosystemDocumentRequirements(type: EcosystemType): EcosystemDocument[] {
  return ECOSYSTEM_DOCUMENT_REQUIREMENTS[type] || [];
}

export function getEcosystemOnboardingStages(type: EcosystemType): EcosystemOnboardingStage[] {
  return ECOSYSTEM_ONBOARDING_STAGES[type] || [];
}

export function canEcosystemIssueCartaAval(ecosystem: Ecosystem): boolean {
  return ecosystem.status === 'activa' && 
         ecosystem.cartaAvalEnabled &&
         ecosystem.documents.filter(d => d.status === DocumentStatus.Aprobado).length >= 8; // Minimum docs required
}

export function getRequiredDocumentsForStage(stageId: string, ecosystemType: EcosystemType): EcosystemDocument[] {
  const stage = ECOSYSTEM_ONBOARDING_STAGES[ecosystemType]?.find(s => s.id === stageId);
  const allDocs = ECOSYSTEM_DOCUMENT_REQUIREMENTS[ecosystemType] || [];
  
  return allDocs.filter(doc => stage?.documents.includes(doc.id));
}

export function calculateEcosystemCompletionPercentage(ecosystem: Ecosystem): number {
  const totalStages = ecosystem.onboardingStages.length;
  const completedStages = ecosystem.onboardingStages.filter(s => s.status === 'completed').length;
  
  return totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;
}

export function getNextPendingStage(ecosystem: Ecosystem): EcosystemOnboardingStage | null {
  return ecosystem.onboardingStages
    .filter(s => s.status === 'pending')
    .sort((a, b) => a.order - b.order)[0] || null;
}