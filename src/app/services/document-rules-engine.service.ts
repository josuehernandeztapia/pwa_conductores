import { Injectable } from '@angular/core';

export interface DocumentRequirement {
  name: string;
  isRequired: boolean;
  isOptional?: boolean;
  tooltip?: string;
}

export interface ProductConfiguration {
  market: 'aguascalientes' | 'edomex';
  product: 'venta-directa' | 'venta-plazo' | 'ahorro-programado';
  clientType?: 'individual' | 'colectivo';
}

@Injectable({
  providedIn: 'root'
})
export class DocumentRulesEngineService {

  private documentCatalog: { [key: string]: DocumentRequirement } = {
    'ine': {
      name: 'INE Vigente',
      isRequired: true,
      tooltip: 'Identificación oficial vigente'
    },
    'comprobante-domicilio': {
      name: 'Comprobante de domicilio',
      isRequired: true,
      tooltip: 'Recibo de luz, agua, teléfono o predial no mayor a 3 meses'
    },
    'constancia-fiscal': {
      name: 'Constancia de situación fiscal',
      isRequired: true,
      tooltip: 'Documento del SAT que acredite la situación fiscal'
    },
    'concesion': {
      name: 'Copia de la concesión',
      isRequired: true,
      tooltip: 'Documento oficial que otorga el derecho de operar la ruta'
    },
    'tarjeta-circulacion': {
      name: 'Tarjeta de circulación',
      isRequired: true,
      tooltip: 'Documento de identificación del vehículo'
    },
    'factura-unidad': {
      name: 'Factura de la unidad actual',
      isRequired: true,
      tooltip: 'Comprobante de propiedad de la unidad actual'
    },
    'carta-aval': {
      name: 'Carta Aval de Ruta',
      isRequired: true,
      tooltip: 'Documento que avala al cliente dentro de la ruta'
    },
    'convenio-dacion': {
      name: 'Convenio de Dación en Pago',
      isRequired: true,
      tooltip: 'Acuerdo legal de garantía sobre la unidad'
    },
    'acta-constitutiva': {
      name: 'Acta Constitutiva de la Ruta',
      isRequired: true,
      tooltip: 'Documento legal que constituye la ruta'
    },
    'poder-representante': {
      name: 'Poder del Representante Legal',
      isRequired: true,
      tooltip: 'Documento que otorga representación legal'
    },
    'verificacion-biometrica': {
      name: 'Verificación Biométrica (Metamap)',
      isRequired: true,
      tooltip: 'Validación biométrica de identidad'
    }
  };

  getRequiredDocuments(config: ProductConfiguration): DocumentRequirement[] {
    const { market, product, clientType } = config;
    
    // Aguascalientes rules
    if (market === 'aguascalientes') {
      if (product === 'venta-directa') {
        // Express documents + Concesión (added per user request)
        return this.getDocuments(['ine', 'comprobante-domicilio', 'constancia-fiscal', 'concesion']);
      }
      
      if (product === 'venta-plazo') {
        // Individual complete documents
        return this.getDocuments([
          'ine', 'comprobante-domicilio', 'tarjeta-circulacion', 
          'concesion', 'constancia-fiscal'
        ]);
      }
      
      if (product === 'ahorro-programado') {
        // New AGS Ahorro Programado - same as EdoMex basic (per user request)
        return this.getDocuments([
          'ine', 'comprobante-domicilio', 'tarjeta-circulacion',
          'concesion', 'constancia-fiscal'
        ]);
      }
    }

    // Estado de México rules
    if (market === 'edomex') {
      if (product === 'venta-directa') {
        // Express documents
        return this.getDocuments(['ine', 'comprobante-domicilio', 'constancia-fiscal']);
      }
      
      if (product === 'venta-plazo') {
        // Complete documents for Individual or Colectivo
        return this.getDocuments([
          'ine', 'comprobante-domicilio', 'tarjeta-circulacion',
          'concesion', 'constancia-fiscal', 'factura-unidad',
          'carta-aval', 'convenio-dacion'
        ]);
      }
      
      if (product === 'ahorro-programado') {
        // Updated per user request: always include Tarjeta de Circulación and Concesión
        return this.getDocuments([
          'ine', 'comprobante-domicilio', 'tarjeta-circulacion', 'concesion'
        ]);
      }
    }

    // Fallback - basic documents
    return this.getDocuments(['ine', 'comprobante-domicilio']);
  }

  private getDocuments(documentKeys: string[]): DocumentRequirement[] {
    return documentKeys
      .map(key => this.documentCatalog[key])
      .filter(doc => doc !== undefined);
  }

  getDocumentByName(documentName: string): DocumentRequirement | undefined {
    const key = Object.keys(this.documentCatalog).find(
      k => this.documentCatalog[k].name === documentName
    );
    return key ? this.documentCatalog[key] : undefined;
  }

  validateDocumentCompleteness(
    config: ProductConfiguration,
    submittedDocuments: string[]
  ): {
    isComplete: boolean;
    missingDocuments: DocumentRequirement[];
    completedDocuments: DocumentRequirement[];
  } {
    const requiredDocs = this.getRequiredDocuments(config);
    const completedDocs = requiredDocs.filter(doc => 
      submittedDocuments.includes(doc.name)
    );
    const missingDocs = requiredDocs.filter(doc => 
      !submittedDocuments.includes(doc.name)
    );

    return {
      isComplete: missingDocs.length === 0,
      missingDocuments: missingDocs,
      completedDocuments: completedDocs
    };
  }

  getDocumentUploadInstructions(documentName: string): string {
    const instructions: { [key: string]: string } = {
      'INE Vigente': 'Fotografía clara de ambos lados de la credencial INE vigente',
      'Comprobante de domicilio': 'Recibo de servicio (luz, agua, teléfono) no mayor a 3 meses',
      'Constancia de situación fiscal': 'Documento oficial del SAT descargado del portal',
      'Copia de la concesión': 'Documento oficial de la concesión de transporte',
      'Tarjeta de circulación': 'Fotografía clara de la tarjeta de circulación vigente',
      'Factura de la unidad actual': 'Factura original de compra de la unidad actual',
      'Carta Aval de Ruta': 'Documento firmado por el representante de la ruta',
      'Convenio de Dación en Pago': 'Documento legal firmado ante notario',
      'Verificación Biométrica (Metamap)': 'Proceso de verificación de identidad biométrica'
    };

    return instructions[documentName] || 'Fotografía clara y legible del documento';
  }
}