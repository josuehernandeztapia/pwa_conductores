import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Conekta API Interfaces
export interface ConektaCustomer {
  id?: string;
  name: string;
  email: string;
  phone?: string;
}

export interface ConektaLineItem {
  name: string;
  unit_price: number;
  quantity: number;
  description?: string;
}

export interface ConektaCharge {
  amount: number;
  currency: string;
  description: string;
  customer_info: ConektaCustomer;
  line_items: ConektaLineItem[];
  payment_method: {
    type: 'oxxo_cash' | 'spei' | 'card';
    expires_at?: number; // Unix timestamp
  };
}

export interface ConektaOrder {
  id: string;
  object: 'order';
  amount: number;
  currency: string;
  customer_info: ConektaCustomer;
  line_items: ConektaLineItem[];
  charges: {
    data: ConektaChargeResponse[];
  };
  payment_status: 'pending' | 'paid' | 'partially_paid' | 'unpaid';
  created_at: number;
}

export interface ConektaChargeResponse {
  id: string;
  object: 'charge';
  amount: number;
  currency: string;
  payment_method: {
    type: string;
    object: string;
    reference?: string; // OXXO reference
    expires_at?: number;
    clabe?: string; // SPEI CLABE
    bank?: string;
    auth_code?: string;
  };
  status: 'pending' | 'paid' | 'failed' | 'canceled';
}

export interface OXXOPaymentInfo {
  reference: string;
  expires_at: number;
  barcode_url?: string;
  instructions: string;
}

export interface SPEIPaymentInfo {
  clabe: string;
  bank: string;
  reference: string;
  expires_at: number;
}

export interface PaymentLinkRequest {
  amount: number;
  currency: string;
  description: string;
  customer_info: ConektaCustomer;
  line_items: ConektaLineItem[];
  expires_at?: number;
  allowed_payment_methods: string[];
}

export interface PaymentLinkResponse {
  id: string;
  url: string;
  expires_at: number;
  status: 'active' | 'expired' | 'paid';
}

export type PaymentMethod = 'oxxo' | 'spei' | 'card' | 'link';

export interface PaymentRequest {
  clientId: string;
  amount: number;
  description: string;
  customerInfo: ConektaCustomer;
  lineItems: ConektaLineItem[];
  method: PaymentMethod;
}

@Injectable({
  providedIn: 'root'
})
export class ConektaService {
  private readonly apiUrl = environment.conekta.apiUrl;
  private readonly privateKey = environment.conekta.privateKey;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const credentials = btoa(`${this.privateKey}:`);
    return new HttpHeaders({
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.conekta-v2.1.0+json'
    });
  }

  /**
   * Crear pago OXXO
   */
  createOXXOPayment(request: PaymentRequest): Observable<ConektaOrder> {
    const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 días

    const payload: ConektaCharge = {
      amount: Math.round(request.amount * 100), // Convertir a centavos
      currency: 'MXN',
      description: request.description,
      customer_info: request.customerInfo,
      line_items: request.lineItems.map(item => ({
        ...item,
        unit_price: Math.round(item.unit_price * 100)
      })),
      payment_method: {
        type: 'oxxo_cash',
        expires_at: expiresAt
      }
    };

    return this.http.post<ConektaOrder>(`${this.apiUrl}/orders`, payload, {
      headers: this.getHeaders()
    });
  }

  /**
   * Crear pago SPEI
   */
  createSPEIPayment(request: PaymentRequest): Observable<ConektaOrder> {
    const expiresAt = Math.floor(Date.now() / 1000) + (1 * 24 * 60 * 60); // 1 día

    const payload: ConektaCharge = {
      amount: Math.round(request.amount * 100),
      currency: 'MXN',
      description: request.description,
      customer_info: request.customerInfo,
      line_items: request.lineItems.map(item => ({
        ...item,
        unit_price: Math.round(item.unit_price * 100)
      })),
      payment_method: {
        type: 'spei',
        expires_at: expiresAt
      }
    };

    return this.http.post<ConektaOrder>(`${this.apiUrl}/orders`, payload, {
      headers: this.getHeaders()
    });
  }

  /**
   * Crear link de pago
   */
  createPaymentLink(request: PaymentRequest): Observable<PaymentLinkResponse> {
    const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 días

    const payload: PaymentLinkRequest = {
      amount: Math.round(request.amount * 100),
      currency: 'MXN',
      description: request.description,
      customer_info: request.customerInfo,
      line_items: request.lineItems.map(item => ({
        ...item,
        unit_price: Math.round(item.unit_price * 100)
      })),
      expires_at: expiresAt,
      allowed_payment_methods: ['cash', 'spei', 'card']
    };

    return this.http.post<PaymentLinkResponse>(`${this.apiUrl}/checkout`, payload, {
      headers: this.getHeaders()
    });
  }

  /**
   * Consultar estado de orden
   */
  getOrder(orderId: string): Observable<ConektaOrder> {
    return this.http.get<ConektaOrder>(`${this.apiUrl}/orders/${orderId}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Consultar estado de link de pago
   */
  getPaymentLink(linkId: string): Observable<PaymentLinkResponse> {
    return this.http.get<PaymentLinkResponse>(`${this.apiUrl}/checkout/${linkId}`, {
      headers: this.getHeaders()
    });
  }

  /**
   * Extraer información de pago OXXO de la respuesta
   */
  extractOXXOInfo(order: ConektaOrder): OXXOPaymentInfo | null {
    const charge = order.charges?.data?.[0];
    if (charge?.payment_method?.type === 'oxxo_cash') {
      return {
        reference: charge.payment_method.reference || '',
        expires_at: charge.payment_method.expires_at || 0,
        barcode_url: (charge.payment_method as any).barcode_url,
        instructions: `Acude a cualquier OXXO y proporciona la referencia: ${charge.payment_method.reference}`
      };
    }
    return null;
  }

  /**
   * Extraer información de pago SPEI de la respuesta
   */
  extractSPEIInfo(order: ConektaOrder): SPEIPaymentInfo | null {
    const charge = order.charges?.data?.[0];
    if (charge?.payment_method?.type === 'spei') {
      return {
        clabe: charge.payment_method.clabe || '',
        bank: charge.payment_method.bank || 'STP',
        reference: charge.id,
        expires_at: charge.payment_method.expires_at || 0
      };
    }
    return null;
  }

  /**
   * Verificar si un pago está completado
   */
  isPaymentCompleted(order: ConektaOrder): boolean {
    return order.payment_status === 'paid';
  }

  /**
   * Formatear monto para mostrar
   */
  formatAmount(amountInCentavos: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amountInCentavos / 100);
  }

  /**
   * Formatear fecha de expiración
   */
  formatExpirationDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Generar datos mock para testing
   */
  generateMockPaymentRequest(clientId: string, amount: number): PaymentRequest {
    return {
      clientId,
      amount,
      description: `Enganche - Vagoneta H6C - Cliente ${clientId}`,
      customerInfo: {
        name: 'Juan Pérez González',
        email: 'juan.perez@example.com',
        phone: '+525512345678'
      },
      lineItems: [{
        name: 'Enganche Vagoneta H6C',
        unit_price: amount,
        quantity: 1,
        description: 'Pago de enganche para adquisición de vagoneta H6C'
      }],
      method: 'oxxo'
    };
  }
}