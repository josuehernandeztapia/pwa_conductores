// Onboarding Flow Types - Correct business flow structure

export type Market = 'aguascalientes' | 'edomex';
export type Product = 'venta-directa' | 'venta-plazo' | 'ahorro-programado' | 'credito-colectivo';

export interface OnboardingStage {
  id: string;
  name: string;
  description: string;
  order: number;
  required: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

export interface PreRequisite {
  id: string;
  name: string;
  description: string;
  required: boolean;
  markets: Market[];
  products: Product[];
  status: 'missing' | 'pending_validation' | 'approved' | 'rejected';
}

export interface ContractStage {
  id: string;
  contractType: 'promesa_compraventa' | 'venta_plazo' | 'compraventa' | 'convenio_dacion';
  name: string;
  description: string;
  stage: 'initial' | 'conversion' | 'final' | 'financial';
  required: boolean;
  markets: Market[];
  products: Product[];
  triggerConditions?: string[];
}

export interface OnboardingFlow {
  clientId: string;
  market: Market;
  product: Product;
  clientType: 'individual' | 'colectivo';
  
  // Pre-requisites (before onboarding starts)
  preRequisites: PreRequisite[];
  
  // Main onboarding stages
  stages: OnboardingStage[];
  
  // Contract progression
  contracts: ContractStage[];
  
  // Current state
  currentStage: string;
  currentContract: string | null;
  
  // Progress tracking
  startedAt: Date;
  completedAt?: Date;
  blockedAt?: Date;
  blockReason?: string;
}

// Pre-defined flow configurations
export const FLOW_CONFIGURATIONS: Record<string, Partial<OnboardingFlow>> = {
  // Aguascalientes - Venta Directa
  'aguascalientes_venta_directa_individual': {
    market: 'aguascalientes',
    product: 'venta-directa',
    clientType: 'individual',
    preRequisites: [], // No pre-requisites for AGS
    stages: [
      {
        id: 'basic_docs',
        name: 'Documentos Básicos',
        description: 'INE Vigente, Comprobante de domicilio, RFC',
        order: 1,
        required: true,
        status: 'pending'
      },
      {
        id: 'scoring',
        name: 'Evaluación Crediticia',
        description: 'KINBAN/HASE scoring automático',
        order: 2,
        required: true,
        status: 'pending'
      },
      {
        id: 'payment',
        name: 'Pago Total',
        description: 'SPEI por monto total',
        order: 3,
        required: true,
        status: 'pending'
      },
      {
        id: 'contract_signature',
        name: 'Firma de Contrato',
        description: 'Firma digital del contrato de compraventa',
        order: 4,
        required: true,
        status: 'pending'
      }
    ],
    contracts: [
      {
        id: 'initial_promise',
        contractType: 'promesa_compraventa',
        name: 'Promesa de Compraventa',
        description: 'Contrato inicial para reservar la unidad',
        stage: 'initial',
        required: true,
        markets: ['aguascalientes'],
        products: ['venta-directa']
      },
      {
        id: 'final_sale',
        contractType: 'compraventa',
        name: 'Contrato de Compraventa',
        description: 'Contrato final al completar el pago',
        stage: 'final',
        required: true,
        markets: ['aguascalientes'],
        products: ['venta-directa'],
        triggerConditions: ['payment_completed']
      }
    ]
  },

  // Aguascalientes - Venta a Plazo
  'aguascalientes_venta_plazo_individual': {
    market: 'aguascalientes',
    product: 'venta-plazo',
    clientType: 'individual',
    preRequisites: [],
    stages: [
      {
        id: 'complete_docs',
        name: 'Expediente Completo',
        description: 'INE, Comprobante domicilio, Tarjeta circulación, Concesión, RFC',
        order: 1,
        required: true,
        status: 'pending'
      },
      {
        id: 'scoring',
        name: 'Evaluación Crediticia',
        description: 'KINBAN/HASE scoring automático',
        order: 2,
        required: true,
        status: 'pending'
      },
      {
        id: 'down_payment',
        name: 'Enganche (60%)',
        description: 'Pago del 60% del valor total',
        order: 3,
        required: true,
        status: 'pending'
      },
      {
        id: 'contract_signature',
        name: 'Firma de Contrato',
        description: 'Contrato de Venta a Plazo',
        order: 4,
        required: true,
        status: 'pending'
      }
    ],
    contracts: [
      {
        id: 'installment_sale',
        contractType: 'venta_plazo',
        name: 'Contrato de Venta a Plazo',
        description: 'Contrato de financiamiento a 12-24 meses',
        stage: 'initial',
        required: true,
        markets: ['aguascalientes'],
        products: ['venta-plazo']
      }
    ]
  },

  // Estado de México - Ahorro Programado
  'edomex_ahorro_programado_individual': {
    market: 'edomex',
    product: 'ahorro-programado',
    clientType: 'individual',
    preRequisites: [
      {
        id: 'carta_aval_ruta',
        name: 'Carta Aval de Ruta',
        description: 'Aval de la ruta para participar en el programa',
        required: true,
        markets: ['edomex'],
        products: ['ahorro-programado', 'credito-colectivo', 'venta-plazo'],
        status: 'missing'
      }
    ],
    stages: [
      {
        id: 'basic_docs',
        name: 'Documentos Básicos',
        description: 'INE, Comprobante de Domicilio (+ Tarjeta circulación y Concesión si activa recaudo)',
        order: 1,
        required: true,
        status: 'pending'
      },
      {
        id: 'savings_plan',
        name: 'Configurar Plan de Ahorro',
        description: 'Definir métodos de ahorro y metas',
        order: 2,
        required: true,
        status: 'pending'
      },
      {
        id: 'initial_contract',
        name: 'Contrato Inicial',
        description: 'Firma de Promesa de Compraventa',
        order: 3,
        required: true,
        status: 'pending'
      },
      {
        id: 'savings_period',
        name: 'Período de Ahorro',
        description: 'Acumular fondos hasta alcanzar la meta',
        order: 4,
        required: true,
        status: 'pending'
      },
      {
        id: 'conversion_to_sale',
        name: 'Conversión a Venta',
        description: 'Al alcanzar meta, convertir a Venta a Plazo',
        order: 5,
        required: true,
        status: 'pending'
      }
    ],
    contracts: [
      {
        id: 'savings_promise',
        contractType: 'promesa_compraventa',
        name: 'Promesa de Compraventa (Ahorro)',
        description: 'Contrato inicial para plan de ahorro',
        stage: 'initial',
        required: true,
        markets: ['edomex'],
        products: ['ahorro-programado']
      },
      {
        id: 'converted_sale',
        contractType: 'venta_plazo',
        name: 'Contrato de Venta a Plazo',
        description: 'Contrato final al alcanzar meta de ahorro',
        stage: 'conversion',
        required: true,
        markets: ['edomex'],
        products: ['ahorro-programado'],
        triggerConditions: ['savings_goal_reached']
      },
      {
        id: 'dacion_agreement',
        contractType: 'convenio_dacion',
        name: 'Convenio de Dación en Pago',
        description: 'Garantía financiera para el financiamiento',
        stage: 'financial',
        required: true,
        markets: ['edomex'],
        products: ['ahorro-programado', 'venta-plazo'],
        triggerConditions: ['contract_signing']
      }
    ]
  },

  // Estado de México - Venta a Plazo Individual
  'edomex_venta_plazo_individual': {
    market: 'edomex',
    product: 'venta-plazo',
    clientType: 'individual',
    preRequisites: [
      {
        id: 'carta_aval_ruta',
        name: 'Carta Aval de Ruta',
        description: 'Aval de la ruta para participar en el programa',
        required: true,
        markets: ['edomex'],
        products: ['ahorro-programado', 'credito-colectivo', 'venta-plazo'],
        status: 'missing'
      }
    ],
    stages: [
      {
        id: 'complete_docs',
        name: 'Expediente Completo',
        description: 'Todos los documentos individuales + Factura unidad actual',
        order: 1,
        required: true,
        status: 'pending'
      },
      {
        id: 'scoring',
        name: 'Evaluación Crediticia',
        description: 'KINBAN/HASE scoring automático',
        order: 2,
        required: true,
        status: 'pending'
      },
      {
        id: 'down_payment',
        name: 'Enganche (15-20%)',
        description: 'Pago del enganche mínimo',
        order: 3,
        required: true,
        status: 'pending'
      },
      {
        id: 'contract_signature',
        name: 'Firma de Contratos',
        description: 'Venta a Plazo + Convenio de Dación',
        order: 4,
        required: true,
        status: 'pending'
      }
    ],
    contracts: [
      {
        id: 'installment_sale_edomex',
        contractType: 'venta_plazo',
        name: 'Contrato de Venta a Plazo',
        description: 'Contrato de financiamiento a 48-60 meses con cláusulas híbridas',
        stage: 'initial',
        required: true,
        markets: ['edomex'],
        products: ['venta-plazo']
      },
      {
        id: 'dacion_agreement_edomex',
        contractType: 'convenio_dacion',
        name: 'Convenio de Dación en Pago',
        description: 'Garantía de colateral social y dación en pago',
        stage: 'financial',
        required: true,
        markets: ['edomex'],
        products: ['venta-plazo'],
        triggerConditions: ['contract_signing']
      }
    ]
  },

  // Estado de México - Crédito Colectivo (Tanda)
  'edomex_credito_colectivo_colectivo': {
    market: 'edomex',
    product: 'credito-colectivo',
    clientType: 'colectivo',
    preRequisites: [
      {
        id: 'carta_aval_ruta',
        name: 'Carta Aval de Ruta',
        description: 'Aval de la ruta para el grupo colectivo',
        required: true,
        markets: ['edomex'],
        products: ['credito-colectivo'],
        status: 'missing'
      }
    ],
    stages: [
      {
        id: 'group_formation',
        name: 'Formación del Grupo',
        description: 'Consolidar grupo de 5+ miembros',
        order: 1,
        required: true,
        status: 'pending'
      },
      {
        id: 'collective_docs',
        name: 'Expedientes Colectivos',
        description: 'Documentos completos de todos los miembros',
        order: 2,
        required: true,
        status: 'pending'
      },
      {
        id: 'group_scoring',
        name: 'Evaluación Colectiva',
        description: 'KINBAN scoring del grupo',
        order: 3,
        required: true,
        status: 'pending'
      },
      {
        id: 'savings_cycle',
        name: 'Ciclo de Ahorro',
        description: 'Ahorro colectivo para primera unidad',
        order: 4,
        required: true,
        status: 'pending'
      },
      {
        id: 'tanda_execution',
        name: 'Ejecución de Tanda',
        description: 'Ciclos de entrega y pago colectivo',
        order: 5,
        required: true,
        status: 'pending'
      }
    ],
    contracts: [
      {
        id: 'collective_promise',
        contractType: 'promesa_compraventa',
        name: 'Promesa de Compraventa Colectiva',
        description: 'Contrato inicial del grupo para tanda',
        stage: 'initial',
        required: true,
        markets: ['edomex'],
        products: ['credito-colectivo']
      },
      {
        id: 'collective_installment',
        contractType: 'venta_plazo',
        name: 'Contrato de Venta a Plazo Colectivo',
        description: 'Contratos individuales dentro del esquema colectivo',
        stage: 'conversion',
        required: true,
        markets: ['edomex'],
        products: ['credito-colectivo'],
        triggerConditions: ['first_unit_delivered']
      },
      {
        id: 'collective_dacion',
        contractType: 'convenio_dacion',
        name: 'Convenio de Dación Colectivo',
        description: 'Garantías colectivas y dación en pago grupal',
        stage: 'financial',
        required: true,
        markets: ['edomex'],
        products: ['credito-colectivo'],
        triggerConditions: ['contract_signing']
      }
    ]
  }
};

// Helper functions
export function getFlowConfiguration(market: Market, product: Product, clientType: 'individual' | 'colectivo'): Partial<OnboardingFlow> {
  const key = `${market}_${product}_${clientType}`;
  return FLOW_CONFIGURATIONS[key] || FLOW_CONFIGURATIONS['aguascalientes_venta_directa_individual'];
}

export function getPreRequisitesForFlow(market: Market, product: Product): PreRequisite[] {
  if (market === 'edomex' && ['ahorro-programado', 'credito-colectivo', 'venta-plazo'].includes(product)) {
    return [
      {
        id: 'carta_aval_ruta',
        name: 'Carta Aval de Ruta',
        description: 'Documento requerido antes de iniciar el proceso en Estado de México',
        required: true,
        markets: ['edomex'],
        products: ['ahorro-programado', 'credito-colectivo', 'venta-plazo'],
        status: 'missing'
      }
    ];
  }
  return [];
}

export function getContractProgression(market: Market, product: Product): ContractStage[] {
  const flow = getFlowConfiguration(market, product, 'individual');
  return flow.contracts || [];
}