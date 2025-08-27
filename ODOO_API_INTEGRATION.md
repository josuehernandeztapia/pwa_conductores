# 🔗 Odoo API Integration Guide

## 📋 **Endpoints Requeridos para Backend/Middleware**

La PWA está lista para integrarse con Odoo a través de los siguientes endpoints. **IMPORTANTE**: Estos endpoints deben ser implementados en tu backend/middleware, NO exponer directamente la API de Odoo.

---

## **🎯 A) CLIENTES Y EXPEDIENTES**

### **GET `/api/clientes`**
Lista clientes activos para el asesor
```json
Response: Client[]
```

### **GET `/api/clientes/:id`**  
Datos completos de un cliente específico
```json
Response: {
  "id": "CLI_001",
  "name": "Juan Pérez",
  "flow": "Venta a Plazo",
  "status": "Expediente Pendiente",
  "expedienteId": "EXP_001"
}
```

### **GET `/api/expedientes/:id`**
Estado completo del expediente
```json
Response: {
  "id": "EXP_001",
  "clienteId": "CLI_001", 
  "estado": "proceso|aprobado|pagado|firmado",
  "montoTotal": 853000,
  "enganche": 511800
}
```

---

## **🔧 B) CREACIÓN Y ACTUALIZACIÓN**

### **POST `/api/expedientes`**
Crear nuevo expediente desde cotizador
```json
Request: {
  "clienteNombre": "Juan Pérez",
  "mercado": "aguascalientes",
  "producto": "venta-plazo",
  "montoTotal": 853000
}

Response: {
  "expedienteId": "EXP_001",
  "numeroExpediente": "AGS-2025-001"
}
```

### **PUT `/api/expedientes/:id`**
Actualizar estado del expediente
```json
Request: {
  "estado": "pagado",
  "fechaActualizacion": "2025-01-15T10:30:00Z"
}
```

---

## **📊 C) COTIZADOR → OPORTUNIDAD**

### **POST `/api/cotizador/oportunidad`**
Formalizar cotización en Odoo
```json
Request: {
  "clienteNombre": "Juan Pérez",
  "mercado": "aguascalientes|edomex",
  "tipoCliente": "individual|colectivo", 
  "producto": "venta-directa|venta-plazo|ahorro-programado",
  "montoTotal": 853000,
  "enganche": 511800,
  "plazo": 24,
  "pagoMensual": 25720.52,
  "configuracion": {
    "incluyeGNV": true,
    "incluyePaqueteTec": false
  }
}

Response: {
  "oportunidadId": "OPP_001",
  "expedienteId": "EXP_001", 
  "numeroOportunidad": "AGS-OPP-001"
}
```

### **GET `/api/cotizador/paquete/:mercado`**
Cargar configuración de paquetes de producto
```json
Response: {
  "mercado": "aguascalientes",
  "componentes": {
    "vagoneta": { "precio": 799000, "obligatorio": true },
    "gnv": { "precio": 54000, "obligatorio": false }
  },
  "configuracion": {
    "engancheMinimo": 60,
    "plazosDisponibles": [12, 24],
    "tasaInteres": 25.5
  }
}
```

---

## **📄 D) DOCUMENTOS**

### **POST `/api/clientes/:expedienteId/documentos`**
Subir documento desde PWA
```json
Request: {
  "nombre": "INE Vigente",
  "tipo": "identificacion",
  "archivo": "data:image/jpeg;base64,/9j/4AAQ..."
}

Response: {
  "documentoId": "DOC_001",
  "url": "https://storage.odoo.com/doc_001.pdf"
}
```

### **GET `/api/clientes/:expedienteId/documentos`**
Lista documentos del expediente
```json
Response: [
  {
    "id": "DOC_001",
    "nombre": "INE Vigente", 
    "estado": "aprobado|pendiente|rechazado",
    "fechaSubida": "2025-01-15T10:30:00Z"
  }
]
```

### **POST `/api/documentos`**
Generar contrato PDF
```json  
Request: {
  "expedienteId": "EXP_001",
  "tipo": "venta-plazo",
  "generar": true
}

Response: {
  "documentoId": "CONTRACT_001",
  "url": "https://storage.odoo.com/contract_001.pdf"
}
```

---

## **💳 E) EVENTOS DE SINCRONIZACIÓN**

### **POST `/api/evento-pago`**
Webhook desde Conekta → actualizar Odoo
```json
Request: {
  "expedienteId": "EXP_001",
  "conektaOrderId": "ord_2T8zGxC5mN7QnSAM3",
  "monto": 511800,
  "metodoPago": "oxxo",
  "estado": "paid", 
  "fechaPago": "2025-01-15T10:30:00Z"
}

Response: {
  "success": true,
  "expedienteEstado": "pagado",
  "proximoPaso": "generar_contrato"
}
```

### **POST `/api/evento-firma`**
Webhook desde Mifiel → actualizar Odoo
```json
Request: {
  "expedienteId": "EXP_001", 
  "mifielDocumentId": "doc_signature_123",
  "contratoTipo": "venta-plazo",
  "firmantes": [
    {
      "email": "juan@email.com",
      "fechaFirma": "2025-01-15T12:00:00Z"
    }
  ]
}

Response: {
  "success": true,
  "expedienteEstado": "firmado",
  "contratoUrl": "https://storage.odoo.com/signed_contract.pdf"
}
```

---

## **📈 F) DASHBOARD Y MÉTRICAS**

### **GET `/api/dashboard`**
Datos para dashboard del asesor
```json
Response: {
  "oportunidadesActivas": 15,
  "expedientesPendientes": 8,
  "pagosHoy": 3,
  "firmasHoy": 2,
  "pipeline": {
    "nuevas": 12,
    "proceso": 8,
    "aprobadas": 5,
    "pagadas": 3,
    "firmadas": 2
  }
}
```

### **GET `/api/oportunidades`**
Lista oportunidades con filtros
```json
Query Params: ?estado=proceso&mercado=aguascalientes

Response: [
  {
    "id": "EXP_001",
    "clienteNombre": "Juan Pérez",
    "mercado": "aguascalientes", 
    "producto": "venta-plazo",
    "estado": "proceso",
    "montoTotal": 853000
  }
]
```

---

## **🔄 G) TANDAS COLECTIVAS**

### **POST `/api/tandas`**
Crear nueva tanda colectiva
```json
Request: {
  "nombre": "Tanda Ruta 25",
  "mercado": "edomex",
  "capacidad": 5,
  "metaEnganche": 153075,
  "pagoMensual": 25720.52
}

Response: {
  "tandaId": "TANDA_001",
  "codigoInvitacion": "RT25-001"
}
```

### **PUT `/api/tandas/:id/ciclo`**
Avanzar ciclo de tanda (entrega de unidad)
```json
Request: {
  "unidadEntregada": true,
  "nuevoCiclo": 2,
  "ahorroAcumulado": 153075
}

Response: {
  "success": true,
  "cicloActual": 2,
  "siguienteMeta": 153075
}
```

---

## **🔍 H) HEALTH CHECK**

### **GET `/api/health`**
Verificar estado del sistema
```json
Response: {
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-01-15T10:30:00Z", 
  "odooConnection": true
}
```

---

## **⚙️ CONFIGURACIÓN DE ENTORNO**

### **Development (.env.development)**
```env
ODOO_API_KEY=DEV_ODOO_API_KEY_HERE
ODOO_BASE_URL=https://conductores-del-mundo-sapi-de-cv.odoo.com
ODOO_DATABASE=conductores-test
API_URL=http://localhost:3000/api
```

### **Production (.env.production)**
```env
ODOO_API_KEY=PROD_ODOO_API_KEY_HERE  
ODOO_BASE_URL=https://conductores-del-mundo-sapi-de-cv.odoo.com
ODOO_DATABASE=conductores-production
API_URL=https://api.conductores-mundo.com/api
```

---

## **🔒 SEGURIDAD**

1. **NUNCA exponer directamente la API de Odoo** al frontend
2. **Usar middleware/backend** para filtrar y validar datos
3. **API Keys** solo en backend, nunca en frontend
4. **Validación de permisos** por asesor/cliente
5. **Rate limiting** en todos los endpoints
6. **HTTPS only** en producción

---

## **🚀 IMPLEMENTACIÓN**

1. **Crear middleware Express/FastAPI** con estos endpoints
2. **Conectar middleware → Odoo** usando RPC o REST API
3. **Configurar webhooks** Conekta/Mifiel → middleware
4. **Testing** con datos de desarrollo
5. **Deploy** y cambio a credenciales producción

La PWA está **100% lista** para conectarse. Solo faltan los endpoints del backend! 🎯