# 📚 API Reference - Servicios y Componentes

## 🏗️ Arquitectura de Servicios

La PWA implementa **15 servicios core** que manejan toda la lógica de negocio, integraciones externas y gestión de estado.

## 🔐 Servicios de Autenticación y Seguridad

### **AuthService**
Manejo de autenticación y sesiones de usuario.

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  // Estado de autenticación
  readonly isAuthenticated = signal<boolean>(false);
  readonly currentUser = signal<User | null>(null);
  
  // Métodos principales
  login(credentials: LoginCredentials): Observable<AuthResponse>
  logout(): Observable<void>
  refreshToken(): Observable<string>
  checkAuthStatus(): Observable<boolean>
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}
```

## 💾 Servicios de Almacenamiento

### **LocalStorageService**
Gestión de datos locales con IndexedDB.

```typescript
@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  // Signals reactivos
  readonly isDemoMode = signal<boolean>(false);
  readonly dataStats = signal<{clients: number; quotes: number; documents: number}>({
    clients: 0, quotes: 0, documents: 0
  });
  
  // CRUD Operations
  saveClient(client: Client): Observable<Client>
  getClients(): Observable<Client[]>
  updateClient(client: Client): Observable<Client>
  deleteClient(clientId: string): Observable<boolean>
  
  // Utilidades
  exportData(): Observable<string>
  importData(jsonData: string): Observable<boolean>
  clearAllData(): Observable<void>
}
```

### **IndexedDbService**
Interfaz de bajo nivel con IndexedDB.

```typescript
@Injectable({ providedIn: 'root' })
export class IndexedDbService {
  private readonly DB_NAME = 'ConductoresDB';
  private readonly DB_VERSION = 1;
  
  // Documentos
  storeDocument(document: StoredDocument): Observable<string>
  getDocumentsByClient(clientId: string): Observable<StoredDocument[]>
  getDocumentBlob(id: string): Observable<Blob | null>
  deleteDocument(id: string): Observable<boolean>
  
  // Metadata
  updateDocumentMetadata(id: string, metadata: any): Observable<boolean>
  getStorageUsage(): Observable<{used: number; available: number}>
}

interface StoredDocument {
  id: string;
  clientId: string;
  name: string;
  blob: Blob;
  uploadDate: Date;
  metadata?: any;
}
```

## 🔄 Servicios de Sincronización

### **DataSyncService**
Sincronización bidireccional con backend.

```typescript
@Injectable({ providedIn: 'root' })
export class DataSyncService {
  readonly syncStatus = signal<SyncStatus>({
    isOnline: navigator.onLine,
    lastSync: null,
    pendingSync: false,
    unsyncedChanges: 0
  });
  
  // Sincronización
  syncNow(): Observable<SyncResult>
  scheduleAutoSync(intervalMs: number): void
  cancelAutoSync(): void
  
  // Estado
  getSyncStatus(): Observable<SyncStatus>
  getPendingChanges(): Observable<PendingChange[]>
  forcePush(): Observable<SyncResult>
}

interface SyncResult {
  success: boolean;
  operations: number;
  errors: string[];
  duration: number;
}

interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingSync: boolean;
  unsyncedChanges: number;
}
```

## 🎨 Servicios de UI/UX

### **ResponsiveLayoutService**
Detección y manejo de breakpoints responsive.

```typescript
@Injectable({ providedIn: 'root' })
export class ResponsiveLayoutService {
  // Breakpoints
  readonly isMobile = computed(() => this.screenWidth() < 768);
  readonly isTablet = computed(() => this.screenWidth() >= 768 && this.screenWidth() < 1024);
  readonly isDesktop = computed(() => this.screenWidth() >= 1024);
  
  // Estado
  readonly screenWidth = signal<number>(window.innerWidth);
  readonly deviceType = computed<'mobile' | 'tablet' | 'desktop'>(() => {
    if (this.isMobile()) return 'mobile';
    if (this.isTablet()) return 'tablet';
    return 'desktop';
  });
  
  // Métodos
  isCompactLayout(): boolean
  getGridColumns(): number
  responsiveClassString(): string
}
```

### **ToastService**
Sistema de notificaciones toast.

```typescript
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toasts = signal<Toast[]>([]);
  readonly activeToasts = this.toasts.asReadonly();
  
  // Métodos principales
  success(message: string, options?: ToastOptions): void
  error(message: string, options?: ToastOptions): void
  warning(message: string, options?: ToastOptions): void
  info(message: string, options?: ToastOptions): void
  
  // Control
  dismiss(id: string): void
  clear(): void
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration: number;
  dismissible: boolean;
  timestamp: Date;
}

interface ToastOptions {
  duration?: number;
  dismissible?: boolean;
  action?: ToastAction;
}
```

## 💳 Servicios de Integración Externa

### **ConektaService**
Procesamiento de pagos con Conekta.

```typescript
@Injectable({ providedIn: 'root' })
export class ConektaService {
  private readonly apiUrl = 'https://api.conekta.io';
  
  // Órdenes de pago
  createPaymentOrder(request: PaymentRequest): Observable<ConektaOrder>
  getOrderStatus(orderId: string): Observable<ConektaOrder>
  cancelOrder(orderId: string): Observable<boolean>
  
  // Métodos de pago
  processCardPayment(paymentInfo: CardPaymentInfo): Observable<ConektaOrder>
  processOXXOPayment(paymentInfo: OXXOPaymentInfo): Observable<ConektaOrder>
  processSPEIPayment(paymentInfo: SPEIPaymentInfo): Observable<ConektaOrder>
  
  // Confirmación
  confirmPayment(orderId: string): Observable<ConektaOrder>
}

interface PaymentRequest {
  amount: number;
  currency: 'MXN';
  description: string;
  clientId: string;
  metadata?: any;
}

interface ConektaOrder {
  id: string;
  status: 'pending' | 'paid' | 'canceled' | 'expired';
  amount: number;
  currency: string;
  payment_method?: PaymentMethod;
  created_at: Date;
  charges?: ConektaCharge[];
}
```

### **MifielService**
Firma digital con Mifiel.

```typescript
@Injectable({ providedIn: 'root' })
export class MifielService {
  private readonly apiUrl = 'https://www.mifiel.com/api/v1';
  
  // Documentos
  createDocument(pdfBlob: Blob, signers: MifielSigner[]): Observable<MifielDocument>
  getDocumentStatus(documentId: string): Observable<MifielDocument>
  downloadSignedDocument(documentId: string): Observable<Blob>
  
  // Widgets
  getSignatureWidget(documentId: string): Observable<MifielWidget>
  initializeWidget(containerId: string, widgetId: string): Promise<void>
}

interface MifielSigner {
  name: string;
  email: string;
  tax_id?: string;
}

interface MifielDocument {
  id: string;
  status: 'draft' | 'pending' | 'signed' | 'completed' | 'rejected';
  signers: MifielSigner[];
  created_at: Date;
  signed_at?: Date;
}
```

### **KinbanScoringService**
Evaluación crediticia KINBAN/HASE.

```typescript
@Injectable({ providedIn: 'root' })
export class KinbanScoringService {
  // Scoring principal
  requestScore(request: KinbanScoreRequest): Observable<KinbanScoreResponse>
  getScoreHistory(clientId: string): Observable<KinbanScoreResponse[]>
  
  // Análisis
  analyzeRiskFactors(clientData: ClientData): Observable<RiskAnalysis>
  getRecommendations(score: number): string[]
}

interface KinbanScoreRequest {
  clientId: string;
  personalInfo: PersonalInfo;
  businessInfo: BusinessInfo;
  documentsInfo: DocumentsInfo;
}

interface KinbanScoreResponse {
  score: number;              // 0-100
  status: 'approved' | 'rejected' | 'review_required';
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  factors: ScoreFactors;
}
```

## 🔄 Servicios de Automatización

### **MakeIntegrationService**
Webhooks para Make.com automation.

```typescript
@Injectable({ providedIn: 'root' })
export class MakeIntegrationService {
  private readonly baseUrl = 'https://hook.eu1.make.com';
  
  // Webhooks principales
  sendNewLead(data: NewLeadData): Observable<MakeWebhookResponse>
  sendDocumentUpload(data: DocumentUploadData): Observable<MakeWebhookResponse>
  sendPaymentConfirmation(data: PaymentConfirmationData): Observable<MakeWebhookResponse>
  sendSignatureComplete(data: SignatureCompleteData): Observable<MakeWebhookResponse>
  sendStageUpdate(data: StageUpdateData): Observable<MakeWebhookResponse>
  
  // Dashboard data
  obtenerDashboardDeOdoo(): Observable<DashboardData>
}

interface MakeWebhookResponse {
  success: boolean;
  scenario: string;
  timestamp: string;
  data?: any;
}
```

## 📋 Servicios de Reglas de Negocio

### **DocumentRulesEngineService**
Motor de reglas para validación de documentos.

```typescript
@Injectable({ providedIn: 'root' })
export class DocumentRulesEngineService {
  // Configuración de reglas
  getRequiredDocuments(config: ProductConfiguration): DocumentRequirement[]
  getValidationRules(documentType: string): ValidationRule[]
  
  // Validación
  validateDocument(document: File, requirement: DocumentRequirement): ValidationResult
  validateAllDocuments(documents: File[], requirements: DocumentRequirement[]): ValidationSummary
  
  // Progreso
  calculateCompletionPercentage(submitted: StoredDocument[], required: DocumentRequirement[]): number
  getNextRequiredDocument(submitted: StoredDocument[], required: DocumentRequirement[]): DocumentRequirement | null
}

interface ProductConfiguration {
  market: 'aguascalientes' | 'edomex';
  product: 'venta-directa' | 'venta-plazo' | 'ahorro-programado';
  clientType?: 'individual' | 'colectivo';
}

interface DocumentRequirement {
  name: string;
  required: boolean;
  description: string;
  validFormats: string[];
  maxSizeKB: number;
  validationRules?: ValidationRule[];
}
```

### **SessionStateService**
Gestión de estado de sesión del asesor.

```typescript
@Injectable({ providedIn: 'root' })
export class SessionStateService {
  // Estado de sesión
  readonly sessionState = signal<SessionState>('exploration');
  readonly sessionContext = signal<SessionContext>({});
  
  // Control de sesión
  transitionTo(newState: SessionState, reason: string): void
  updateContext(updates: Partial<SessionContext>): void
  resetSession(): void
  
  // Herramientas disponibles
  isToolAvailable(tool: string): boolean
  getAvailableTools(): string[]
  getCurrentStateConfig(): SessionStateConfig
}

type SessionState = 'exploration' | 'ready_to_formalize' | 'formalizing' | 'completed';

interface SessionContext {
  clientId?: string;
  clientName?: string;
  productName?: string;
  monthlyPayment?: number;
  downPayment?: number;
  simulationComplete?: boolean;
  documentsReady?: boolean;
}
```

## 🎯 Servicios Especializados

### **PdfService**
Generación y manipulación de PDFs.

```typescript
@Injectable({ providedIn: 'root' })
export class PdfService {
  // Generación
  generateContract(contractData: ContractData): Observable<Blob>
  generatePaymentReceipt(paymentData: PaymentData): Observable<Blob>
  generateClientReport(clientId: string): Observable<Blob>
  
  // Manipulación
  mergePDFs(pdfBlobs: Blob[]): Observable<Blob>
  addWatermark(pdfBlob: Blob, watermarkText: string): Observable<Blob>
  
  // Utilidades
  validatePDF(file: File): Observable<ValidationResult>
  extractTextFromPDF(pdfBlob: Blob): Observable<string>
}
```

### **OdooApiService**
Integración con Odoo ERP.

```typescript
@Injectable({ providedIn: 'root' })
export class OdooApiService {
  // Autenticación
  authenticate(): Observable<AuthResponse>
  refreshToken(): Observable<string>
  
  // Datos maestros
  getClientes(): Observable<Client[]>
  getEcosistemas(): Observable<Ecosystem[]>
  getProductos(): Observable<Product[]>
  
  // Actualizaciones
  updateClientStatus(clientId: string, status: string): Observable<boolean>
  syncDocumentStatus(clientId: string, documents: Document[]): Observable<boolean>
  createLead(leadData: LeadData): Observable<Lead>
}
```

## 🧩 Componentes de Alto Nivel

### **OnboardingWizardComponent**
Wizard de 5 pasos para onboarding de clientes.

```typescript
@Component({
  selector: 'app-onboarding-wizard'
})
export class OnboardingWizardComponent {
  // Estado del wizard
  readonly currentStep = signal<number>(1);
  readonly wizardData = signal<WizardData>({});
  readonly isLoading = signal<boolean>(false);
  
  // Navegación
  nextStep(): void
  previousStep(): void
  goToStep(step: number): void
  
  // Validación
  validateCurrentStep(): boolean
  canProceed(): boolean
  
  // Finalización
  completeWizard(): Observable<Client>
}

interface WizardData {
  flowSelection?: BusinessFlow;
  market?: Market;
  clientType?: ClientType;
  ecosystem?: Ecosystem;
  clientDetails?: ClientDetails;
}
```

### **SimulatorComponent**
Simulador financiero base (clase padre).

```typescript
@Component({
  selector: 'app-simulator'
})
export abstract class SimulatorComponent {
  // Parámetros de entrada
  @Input() initialAmount = signal<number>(0);
  @Input() market = signal<Market>('aguascalientes');
  @Input() product = signal<Product>('venta-directa');
  
  // Resultados
  readonly calculationResults = signal<SimulationResult>({});
  readonly isCalculating = signal<boolean>(false);
  
  // Métodos abstractos
  abstract calculateProjection(): Observable<SimulationResult>
  abstract validateInputs(): ValidationResult
  abstract exportResults(): Observable<Blob>
}

interface SimulationResult {
  totalAmount: number;
  monthlyPayment: number;
  downPayment: number;
  projectedTimeline: TimelineItem[];
  riskFactors: RiskFactor[];
}
```

## 🔍 Utilidades y Helpers

### **Validation Utilities**
```typescript
export class ValidationUtils {
  static validateRFC(rfc: string): boolean
  static validateCURP(curp: string): boolean
  static validateEmail(email: string): boolean
  static validatePhone(phone: string): boolean
  static validateAmount(amount: number, min: number, max: number): boolean
}
```

### **Format Utilities**
```typescript
export class FormatUtils {
  static formatCurrency(amount: number): string
  static formatDate(date: Date): string
  static formatPhone(phone: string): string
  static formatRFC(rfc: string): string
}
```

### **File Utilities**
```typescript
export class FileUtils {
  static validateFileType(file: File, allowedTypes: string[]): boolean
  static validateFileSize(file: File, maxSizeKB: number): boolean
  static getFileExtension(filename: string): string
  static generateUniqueFilename(originalName: string): string
}
```

## 🏷️ Interfaces Principales

### **Modelos de Datos**
```typescript
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: ClientStatus;
  flow: BusinessFlow;
  market: Market;
  documents: Document[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  name: string;
  status: DocumentStatus;
  uploadedAt?: Date;
  approvedAt?: Date;
}

export interface Ecosystem {
  id: string;
  name: string;
  location: string;
  market: Market;
  capacity: number;
  currentClients: number;
}
```

## 📊 Tipos y Enums

```typescript
export enum BusinessFlow {
  VentaDirecta = 'Venta Directa',
  VentaPlazo = 'Venta a Plazo', 
  AhorroProgramado = 'Plan de Ahorro'
}

export enum Market {
  Aguascalientes = 'aguascalientes',
  Edomex = 'edomex'
}

export enum ClientStatus {
  Prospecto = 'Prospecto',
  ExpedientePendiente = 'Expediente Pendiente',
  EnProceso = 'En Proceso',
  Aprobado = 'Aprobado',
  Activo = 'Activo'
}

export enum DocumentStatus {
  Pendiente = 'Pendiente',
  EnRevision = 'En Revisión',
  Aprobado = 'Aprobado',
  Rechazado = 'Rechazado'
}
```

---

*API Reference completo para todos los servicios y componentes de la PWA Conductores del Mundo*