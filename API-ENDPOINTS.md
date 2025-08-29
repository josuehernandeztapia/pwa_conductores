# 🔌 API Endpoints - Conductores del Mundo ↔ Odoo

## 📋 Índice de Endpoints

Este documento detalla los **150+ endpoints** implementados para la integración completa entre la PWA Angular y Odoo ERP.

---

## 🏗️ Estructura Base

### **Configuración de Conexión**
```typescript
// Base URL y autenticación
baseUrl: 'https://tu-instancia.odoo.com'
headers: {
  'Authorization': 'Bearer ' + apiKey,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
```

### **Formato de Respuesta Estándar**
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}
```

---

## A) 🔐 AUTENTICACIÓN Y SESIONES

### **A1. Login y Autenticación**
```typescript
POST /api/auth/login
Body: { username: string, password: string, database: string }
Response: { access_token: string, user_info: UserProfile, expires_in: number }

POST /api/auth/refresh
Body: { refresh_token: string }
Response: { access_token: string, expires_in: number }

POST /api/auth/logout
Headers: { Authorization: 'Bearer token' }
Response: { message: 'Logged out successfully' }
```

### **A2. Perfil de Usuario**
```typescript
GET /api/user/profile
Response: {
  id: number,
  name: string,
  email: string,
  role: 'asesor' | 'supervisor' | 'gerente',
  permissions: string[],
  avatar_url?: string
}

PUT /api/user/profile
Body: { name?, email?, phone?, avatar? }
Response: { updated: UserProfile }
```

---

## B) 👥 GESTIÓN DE CLIENTES

### **B1. CRUD Básico de Clientes**
```typescript
GET /api/clients
Query: { page?, limit?, search?, flow_type?, ecosystem_id? }
Response: { 
  clients: Client[], 
  pagination: PaginationInfo 
}

POST /api/clients
Body: {
  name: string,
  email: string,
  phone: string,
  flow: BusinessFlow,
  ecosystem_id?: string
}
Response: { client: Client }

PUT /api/clients/{clientId}
Body: { name?, email?, phone?, status? }
Response: { client: Client }

DELETE /api/clients/{clientId}
Response: { success: boolean }
```

### **B2. Clientes por Flujo de Negocio**
```typescript
GET /api/clients/by-flow/{flowType}
Params: flowType = 'venta_plazo' | 'ahorro_programado' | 'credito_colectivo' | 'venta_directa'
Response: { clients: Client[] }

GET /api/clients/{clientId}/flow-details
Response: {
  savings_plan?: SavingsPlan,
  payment_plan?: PaymentPlan,
  collective_group?: CollectiveGroup
}

POST /api/clients/{clientId}/convert-flow
Body: { new_flow: BusinessFlow, migration_data: any }
Response: { success: boolean, new_client_state: Client }
```

### **B3. Health Score y Analytics**
```typescript
GET /api/clients/{clientId}/health-score
Response: {
  score: number,
  factors: {
    payment_history: number,
    document_completeness: number,
    engagement: number,
    risk_indicators: number
  },
  recommendations: string[]
}

PUT /api/clients/{clientId}/health-score
Body: { manual_adjustments: { factor: string, value: number }[] }
Response: { updated_score: number }
```

---

## C) 🛣️ ECOSISTEMAS Y RUTAS

### **C1. Gestión de Ecosistemas**
```typescript
GET /api/ecosystems
Query: { page?, limit?, type?, location?, active_only? }
Response: { ecosystems: Ecosystem[] }

POST /api/ecosystems
Body: {
  name: string,
  type: 'ruta' | 'cooperativa' | 'asociacion',
  location: string,
  contact_person: string,
  contact_phone: string
}
Response: { ecosystem: Ecosystem }

PUT /api/ecosystems/{ecosystemId}
Body: { name?, location?, contact_person?, status? }
Response: { ecosystem: Ecosystem }
```

### **C2. Miembros del Ecosistema**
```typescript
GET /api/ecosystems/{ecosystemId}/members
Response: { 
  members: EcosystemMember[],
  stats: {
    total_members: number,
    active_clients: number,
    revenue_generated: number
  }
}

POST /api/ecosystems/{ecosystemId}/members
Body: { client_id: string, role?: string }
Response: { member: EcosystemMember }

DELETE /api/ecosystems/{ecosystemId}/members/{memberId}
Response: { success: boolean }
```

### **C3. Cartas Aval**
```typescript
POST /api/ecosystems/{ecosystemId}/carta-aval
Body: {
  client_ids: string[],
  endorsement_amount: number,
  terms: string,
  expiry_date: string
}
Response: { carta_aval: CartaAval }

GET /api/ecosystems/{ecosystemId}/cartas-aval
Response: { cartas_aval: CartaAval[] }

PUT /api/cartas-aval/{cartaAvalId}/status
Body: { status: 'active' | 'expired' | 'revoked' }
Response: { carta_aval: CartaAval }
```

---

## D) 🏢 GRUPOS COLECTIVOS

### **D1. Gestión de Grupos**
```typescript
GET /api/collective-groups
Query: { ecosystem_id?, status?, page?, limit? }
Response: { groups: CollectiveCreditGroup[] }

POST /api/collective-groups
Body: {
  name: string,
  ecosystem_id: string,
  capacity: number,
  savings_goal_per_unit: number,
  monthly_payment_per_unit: number
}
Response: { group: CollectiveCreditGroup }

PUT /api/collective-groups/{groupId}
Body: { name?, capacity?, phase?, savings_goal? }
Response: { group: CollectiveCreditGroup }
```

### **D2. Miembros del Grupo**
```typescript
POST /api/collective-groups/{groupId}/members
Body: { client_id: string, individual_contribution: number }
Response: { member: CollectiveCreditMember }

DELETE /api/collective-groups/{groupId}/members/{memberId}
Response: { success: boolean }

PUT /api/collective-groups/{groupId}/members/{memberId}
Body: { individual_contribution?, status? }
Response: { member: CollectiveCreditMember }
```

### **D3. Entregas y Progreso**
```typescript
POST /api/collective-groups/{groupId}/deliver-unit
Body: { 
  member_id: string,
  unit_details: { model: string, price: number },
  delivery_date: string
}
Response: { delivery: UnitDelivery }

GET /api/collective-groups/{groupId}/progress
Response: {
  savings_progress: number,
  payment_progress: number,
  units_delivered: number,
  next_delivery_estimate: string
}
```

---

## E) 📄 GESTIÓN DOCUMENTAL

### **E1. Documentos del Cliente**
```typescript
GET /api/clients/{clientId}/documents
Response: { 
  documents: Document[],
  completeness: {
    required_count: number,
    completed_count: number,
    percentage: number
  }
}

POST /api/clients/{clientId}/documents
Body: FormData with file + { document_type: DocumentType, is_optional: boolean }
Response: { document: Document, upload_id: string }

DELETE /api/documents/{documentId}
Response: { success: boolean }
```

### **E2. Procesamiento OCR**
```typescript
POST /api/documents/{documentId}/ocr
Response: { 
  ocr_result: {
    extracted_text: string,
    structured_data: any,
    confidence: number,
    processing_time: number
  }
}

PUT /api/documents/{documentId}/validate
Body: {
  validation_result: 'approved' | 'rejected',
  notes?: string,
  corrections?: any
}
Response: { document: Document }
```

### **E3. Expedientes Completos**
```typescript
GET /api/clients/{clientId}/expediente
Response: {
  expediente_id: string,
  completeness: number,
  missing_documents: DocumentType[],
  status: 'incomplete' | 'review' | 'approved',
  last_updated: string
}

POST /api/expedientes/{expedienteId}/submit
Response: { 
  submitted: boolean,
  review_queue_position: number,
  estimated_review_time: string
}
```

---

## F) 📊 CRM Y PIPELINE

### **F1. Prospectos y Leads**
```typescript
GET /api/crm/prospects
Query: { stage?, source?, asesor_id?, page?, limit? }
Response: { prospects: Prospect[] }

POST /api/crm/prospects
Body: {
  name: string,
  email: string,
  phone: string,
  source: 'website' | 'referral' | 'cold_call' | 'social_media',
  initial_interest: BusinessFlow
}
Response: { prospect: Prospect }

PUT /api/crm/prospects/{prospectId}/stage
Body: { stage: PipelineStage }
Response: { prospect: Prospect }
```

### **F2. Scoring Automático**
```typescript
GET /api/crm/prospects/{prospectId}/score
Response: {
  total_score: number,
  score_breakdown: {
    demographics: number,
    financial: number,
    behavioral: number,
    engagement: number
  },
  risk_level: 'low' | 'medium' | 'high',
  recommendations: string[]
}

POST /api/crm/prospects/batch-score
Body: { prospect_ids: string[] }
Response: { scored_prospects: Array<{id: string, score: number}> }
```

### **F3. Automatizaciones**
```typescript
GET /api/crm/automation-rules
Response: { rules: AutomationRule[] }

POST /api/crm/automation-rules
Body: {
  name: string,
  trigger: 'stage_change' | 'score_threshold' | 'time_based',
  conditions: AutomationCondition[],
  actions: AutomationAction[]
}
Response: { rule: AutomationRule }

POST /api/crm/prospects/{prospectId}/convert
Response: { client: Client, conversion_details: ConversionResult }
```

---

## G) 🧮 SIMULADOR Y COTIZACIONES

### **G1. Cotizaciones de Vagonetas**
```typescript
POST /api/quotes/calculate
Body: {
  vehicle_model: 'Vagoneta H6C',
  base_price: 799000,
  down_payment_percentage: number,
  term_months: number,
  client_type: 'individual' | 'collective',
  market: 'aguascalientes' | 'edomex'
}
Response: { 
  quote: Quote,
  amortization_table: AmortizationRow[],
  total_interest: number,
  monthly_payment: number
}

GET /api/quotes/{quoteId}
Response: { quote: Quote }

POST /api/quotes/{quoteId}/approve
Response: { approved_quote: Quote, contract_template_url: string }
```

### **G2. Configuración de Productos**
```typescript
GET /api/products/packages
Response: { packages: Package[] }

PUT /api/products/packages/{packageId}
Body: { components?, rate?, terms? }
Response: { package: Package }

GET /api/products/components
Response: { components: Component[] }
```

---

## H) 🔔 NOTIFICACIONES

### **H1. Notificaciones del Sistema**
```typescript
GET /api/notifications
Query: { type?, read?, limit? }
Response: { notifications: Notification[] }

PUT /api/notifications/{notificationId}/read
Response: { notification: Notification }

POST /api/notifications/mark-all-read
Response: { marked_count: number }
```

### **H2. Alertas Automatizadas**
```typescript
GET /api/alerts/intelligent
Response: { alerts: IntelligentAlert[] }

POST /api/alerts/configure
Body: {
  type: 'performance' | 'system' | 'client' | 'financial',
  conditions: AlertCondition[],
  severity: 'low' | 'medium' | 'high',
  notification_channels: string[]
}
Response: { alert_config: AlertConfiguration }
```

---

## I) 💰 PLANES DE AHORRO Y PAGOS

### **I1. Planes de Ahorro Programado**
```typescript
GET /api/clients/{clientId}/savings-plan
Response: { 
  savings_plan: SavingsPlan,
  progress_history: SavingsProgress[],
  projected_completion: string
}

POST /api/clients/{clientId}/savings-plan
Body: {
  goal_amount: number,
  monthly_contribution: number,
  collection_method: 'voluntary' | 'collection',
  collection_details?: CollectionDetails
}
Response: { savings_plan: SavingsPlan }

POST /api/savings-plans/{planId}/contribution
Body: { amount: number, payment_method: string, notes?: string }
Response: { contribution: SavingsContribution }
```

### **I2. Cobro por Recolección**
```typescript
GET /api/collection/routes
Response: { routes: CollectionRoute[] }

POST /api/collection/schedule
Body: {
  route_id: string,
  client_ids: string[],
  collection_date: string,
  collector_id: string
}
Response: { collection_schedule: CollectionSchedule }

POST /api/collection/{scheduleId}/collect
Body: {
  collected_amounts: Array<{client_id: string, amount: number}>,
  fuel_data: Array<{plate: string, liters: number, price_per_liter: number}>
}
Response: { collection_result: CollectionResult }
```

---

## J) 📑 CONTRATOS Y LEGAL

### **J1. Contratos de Venta**
```typescript
POST /api/contracts/generate
Body: {
  client_id: string,
  quote_id: string,
  contract_type: 'venta_plazo' | 'credito_colectivo',
  terms: ContractTerms
}
Response: { contract: Contract, pdf_url: string }

GET /api/contracts/{contractId}
Response: { contract: Contract }

POST /api/contracts/{contractId}/sign
Body: { signature_data: string, signer_ip: string }
Response: { signed_contract: Contract }
```

### **J2. Convenios de Dación en Pago**
```typescript
POST /api/contracts/dacion-pago
Body: {
  client_id: string,
  old_vehicle_details: VehicleDetails,
  new_vehicle_details: VehicleDetails,
  difference_amount: number
}
Response: { dacion_contract: DacionContract }
```

---

## K) 🚚 LOGÍSTICA E IMPORTACIONES

### **K1. Estado de Importaciones**
```typescript
GET /api/imports/status
Query: { client_id?, import_batch? }
Response: { import_statuses: ImportStatus[] }

PUT /api/imports/{importId}/milestone
Body: { 
  milestone: 'pedido_planta' | 'unidad_fabricada' | 'transito_maritimo' | 'en_aduana' | 'liberada',
  status: 'completed' | 'in_progress' | 'pending',
  estimated_date?: string,
  notes?: string
}
Response: { import_status: ImportStatus }
```

### **K2. Asignación de Unidades**
```typescript
POST /api/units/assign
Body: {
  client_id: string,
  unit_details: {
    model: 'Vagoneta H6C',
    color?: string,
    extras?: string[],
    estimated_delivery: string
  }
}
Response: { assignment: UnitAssignment }

GET /api/units/inventory
Response: { 
  available_units: number,
  in_transit: number,
  assigned: number,
  delivered: number
}
```

---

## L) 💳 PAGOS Y FINANZAS

### **L1. Links de Pago**
```typescript
POST /api/payments/create-link
Body: {
  client_id: string,
  amount: number,
  payment_concept: string,
  provider: 'Conekta' | 'SPEI'
}
Response: { 
  payment_link: PaymentLinkDetails,
  expires_at: string
}

GET /api/payments/{clientId}/history
Response: { payments: PaymentHistory[] }
```

### **L2. SPEI y Transferencias**
```typescript
GET /api/payments/spei-details
Response: {
  clabe: string,
  bank_name: string,
  reference_format: string,
  instructions: string[]
}

POST /api/payments/spei-received
Body: {
  reference: string,
  amount: number,
  sender_account: string,
  transaction_date: string
}
Response: { payment_processed: PaymentResult }
```

---

## M) 📈 REPORTES AVANZADOS

### **M1. Reportes Ejecutivos**
```typescript
GET /api/reports/executive-dashboard
Query: { 
  date_from?: string,
  date_to?: string,
  market?: 'aguascalientes' | 'edomex' | 'ambos',
  asesor_id?: string
}
Response: { 
  dashboard: ExecutiveDashboard,
  kpis: ExecutiveKPIs,
  trends: TrendsData
}

GET /api/reports/sales-performance
Response: {
  sales_by_advisor: AdvisorPerformance[],
  sales_by_market: MarketPerformance[],
  sales_by_ecosystem: EcosystemPerformance[]
}
```

### **M2. Reportes Operativos**
```typescript
GET /api/reports/document-status
Response: {
  completion_rates: Array<{ecosystem: string, rate: number}>,
  pending_reviews: number,
  rejected_documents: Array<{type: string, count: number}>
}

GET /api/reports/collection-efficiency
Response: {
  collection_rates: Array<{route: string, efficiency: number}>,
  fuel_prices: Array<{date: string, price: number}>,
  revenue_per_liter: number
}
```

---

## N) 🤖 INTELIGENCIA ARTIFICIAL

### **N1. Predicciones de Ventas**
```typescript
POST /api/ai/sales-prediction
Body: {
  prediction_period: 'week' | 'month' | 'quarter',
  market?: string,
  ecosystem_id?: string,
  model_type: 'prophet' | 'arima' | 'ensemble'
}
Response: {
  predictions: SalesPrediction,
  confidence_intervals: ConfidenceInterval[],
  model_accuracy: number
}

GET /api/ai/market-trends
Response: {
  trends: MarketTrend[],
  external_factors: ExternalFactor[],
  recommendations: string[]
}
```

### **N2. Análisis de Sentimiento**
```typescript
POST /api/ai/analyze-client-communication
Body: { client_id: string, communication_history: Message[] }
Response: {
  sentiment_score: number,
  satisfaction_level: 'high' | 'medium' | 'low',
  risk_indicators: string[],
  recommended_actions: string[]
}
```

---

## O) 📱 NOTIFICACIONES PUSH Y SMS

### **O1. Push Notifications**
```typescript
POST /api/notifications/push/subscribe
Body: { subscription: PushSubscription, user_id: string }
Response: { subscription_id: string }

POST /api/notifications/push/send
Body: {
  user_ids: string[],
  title: string,
  body: string,
  data?: any,
  actions?: NotificationAction[]
}
Response: { sent_count: number }
```

### **O2. SMS y WhatsApp**
```typescript
POST /api/notifications/sms
Body: {
  phone: string,
  message: string,
  template_id?: string,
  variables?: Record<string, string>
}
Response: { message_id: string, status: 'sent' | 'failed' }

POST /api/notifications/whatsapp
Body: {
  phone: string,
  template: string,
  language: 'es_MX',
  components: WhatsAppComponent[]
}
Response: { message_id: string }
```

---

## P) 🔧 CONFIGURACIÓN Y ADMINISTRACIÓN

### **P1. Configuración del Sistema**
```typescript
GET /api/admin/config
Response: { 
  business_rules: BusinessRule[],
  system_settings: SystemSettings,
  feature_flags: FeatureFlag[]
}

PUT /api/admin/config/{configKey}
Body: { value: any }
Response: { updated_config: ConfigItem }
```

### **P2. Gestión de Usuarios**
```typescript
GET /api/admin/users
Response: { users: User[] }

POST /api/admin/users
Body: {
  name: string,
  email: string,
  role: UserRole,
  ecosystem_assignments?: string[]
}
Response: { user: User, temporary_password: string }

PUT /api/admin/users/{userId}/role
Body: { role: UserRole, permissions?: string[] }
Response: { user: User }
```

---

## Q) 📊 BUSINESS INTELLIGENCE

### **Q1. Dashboards Ejecutivos**
```typescript
GET /api/bi/dashboard/executive
Query: {
  fecha_inicio: string,
  fecha_fin: string,
  mercado?: 'aguascalientes' | 'edomex' | 'ambos',
  asesor?: string,
  ecosistema?: string
}
Response: {
  kpis: {
    totalVentas: number,
    unidadesVendidas: number,
    clientesActivos: number,
    tasaConversion: number,
    ventasChange: number,
    unidadesChange: number,
    clientesChange: number,
    conversionChange: number
  },
  salesTrend: Array<{
    fecha: string,
    ingresos: number,
    unidades: number,
    clientes: number
  }>,
  pipelineData: Array<{
    name: string,
    count: number
  }>
}
```

### **Q2. Predicciones de Ventas ML**
```typescript
POST /api/bi/predictions/sales
Body: {
  periodo: {
    fechaInicio: string,
    fechaFin: string
  },
  filtros?: {
    mercado?: string,
    asesor?: string,
    ecosistema?: string
  },
  modelo: 'prophet' | 'arima' | 'ensemble'
}
Response: {
  nextWeek: number,
  nextMonth: number,
  nextQuarter: number,
  confidence: number,
  factorsInfluencing: {
    seasonal: number,
    trend: number,
    external: number
  },
  modelAccuracy: number
}
```

### **Q3. Reportes Automatizados**
```typescript
POST /api/bi/reports/schedule
Body: {
  tipoReporte: 'financiero' | 'ejecutivo' | 'ventas' | 'operativo',
  frecuencia: 'diario' | 'semanal' | 'mensual' | 'trimestral',
  formato: 'pdf' | 'excel' | 'powerbi',
  destinatarios: Array<{
    email: string,
    rol: 'gerente' | 'supervisor' | 'asesor'
  }>,
  filtros: {
    mercado?: 'aguascalientes' | 'edomex' | 'ambos',
    asesor?: string[],
    ecosistema?: string[]
  },
  kpis: string[],
  graficos: Array<{
    tipo: 'barras' | 'lineas' | 'pastel' | 'area',
    metrica: string,
    titulo: string
  }>,
  enviarAutomaticamente: boolean,
  horaEnvio?: string,
  diaEnvio?: 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado' | 'domingo'
}
Response: {
  reporteId: string,
  proximaEjecucion: string,
  configuracion: ReportConfiguration
}
```

### **Q4. Alertas Inteligentes**
```typescript
GET /api/bi/alerts/intelligent
Response: {
  alerts: Array<{
    id: string,
    title: string,
    message: string,
    type: 'performance' | 'system' | 'client' | 'financial',
    severity: 'low' | 'medium' | 'high',
    timestamp: string,
    actionable: boolean,
    suggestedActions?: string[]
  }>
}

POST /api/bi/alerts/configure
Body: {
  nombre: string,
  tipo: 'threshold' | 'trend' | 'anomaly' | 'pattern',
  condiciones: Array<{
    metrica: string,
    operador: 'gt' | 'lt' | 'eq' | 'change',
    valor: number,
    periodo?: string
  }>,
  severidad: 'low' | 'medium' | 'high',
  canalesNotificacion: string[],
  activo: boolean
}
Response: { alertaId: string, configuracion: AlertConfiguration }

POST /api/bi/alerts/{alertId}/dismiss
Response: { dismissed: boolean, timestamp: string }
```

### **Q5. Análisis Predictivo Avanzado**
```typescript
POST /api/bi/analytics/client-lifetime-value
Body: { client_ids: string[] }
Response: {
  predictions: Array<{
    clientId: string,
    clv: number,
    confidence: number,
    timeframe: string,
    factors: {
      paymentHistory: number,
      engagement: number,
      referrals: number
    }
  }>
}

POST /api/bi/analytics/churn-prediction
Body: { 
  lookback_months: number,
  prediction_horizon: number 
}
Response: {
  churnProbabilities: Array<{
    clientId: string,
    churnProbability: number,
    riskFactors: string[],
    recommendedActions: string[]
  }>,
  modelMetrics: {
    accuracy: number,
    precision: number,
    recall: number
  }
}
```

### **Q6. Exportación de Datos**
```typescript
POST /api/bi/export/business-data
Body: {
  fechaInicio: string,
  fechaFin: string,
  incluir: {
    ventas: boolean,
    clientes: boolean,
    documentos: boolean,
    financiero: boolean,
    crm: boolean
  },
  formato: 'excel' | 'csv' | 'json',
  mercado?: string,
  asesor?: string
}
Response: Blob (Excel/CSV file download)

GET /api/bi/export/{exportId}/status
Response: {
  status: 'processing' | 'completed' | 'failed',
  progress: number,
  downloadUrl?: string,
  error?: string
}
```

---

## 🔧 Códigos de Estado HTTP

### **Respuestas Exitosas**
- `200 OK` - Solicitud exitosa
- `201 Created` - Recurso creado exitosamente
- `202 Accepted` - Solicitud aceptada para procesamiento

### **Errores del Cliente**
- `400 Bad Request` - Datos de entrada inválidos
- `401 Unauthorized` - Token de autenticación inválido
- `403 Forbidden` - Permisos insuficientes
- `404 Not Found` - Recurso no encontrado
- `409 Conflict` - Conflicto con el estado actual
- `422 Unprocessable Entity` - Validación fallida

### **Errores del Servidor**
- `500 Internal Server Error` - Error interno del servidor
- `502 Bad Gateway` - Error de conectividad con Odoo
- `503 Service Unavailable` - Servicio temporalmente no disponible

---

## 🚀 Rate Limiting

### **Límites por Endpoint**
```typescript
// Límites estándar
GET requests: 100 requests/minute
POST requests: 50 requests/minute  
PUT/PATCH requests: 30 requests/minute
DELETE requests: 10 requests/minute

// Headers de respuesta
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1640995200
```

---

**© 2024 Conductores del Mundo - API Documentation v1.0** 🚛📊