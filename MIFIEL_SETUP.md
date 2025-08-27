# Configuración de Mifiel - Firma Digital

## 🔧 Setup Inicial

### 1. Obtener Credenciales de Mifiel

**Sandbox (Desarrollo):**
- Registrarse en: https://sandbox.mifiel.com/
- Generar API Key y Secret en el panel de desarrollador
- Crear una aplicación para obtener App ID

**Producción:**
- Registrarse en: https://www.mifiel.com/
- Completar verificación empresarial
- Generar credenciales de producción

### 2. Configurar Variables de Entorno

**Archivo: `src/environments/environment.ts` (Desarrollo)**
```typescript
export const environment = {
  production: false,
  mifiel: {
    apiUrl: 'https://sandbox.mifiel.com/api/v1/',
    apiKey: 'REEMPLAZAR_CON_TU_SANDBOX_API_KEY',
    appId: 'REEMPLAZAR_CON_TU_SANDBOX_APP_ID',
    secret: 'REEMPLAZAR_CON_TU_SANDBOX_SECRET'
  }
};
```

**Archivo: `src/environments/environment.prod.ts` (Producción)**
```typescript
export const environment = {
  production: true,
  mifiel: {
    apiUrl: 'https://www.mifiel.com/api/v1/',
    apiKey: 'REEMPLAZAR_CON_TU_PRODUCTION_API_KEY',
    appId: 'REEMPLAZAR_CON_TU_PRODUCTION_APP_ID',
    secret: 'REEMPLAZAR_CON_TU_PRODUCTION_SECRET'
  }
};
```

## 📄 Uso del Componente

### Integración en Client Detail

La firma digital aparece automáticamente para clientes con:
- `flow: 'Venta a Plazo'`
- `flow: 'Plan de Ahorro'`

### Funcionalidades Disponibles

1. **Crear Documento para Firma**
   - Subir PDF (contrato, convenio, etc.)
   - Configurar datos del firmante
   - Generar documento en Mifiel

2. **Widget de Firma**
   - Interfaz visual para firmar
   - Validación biométrica
   - Captura de firma digital

3. **Gestión de Documentos**
   - Lista de documentos creados
   - Estados: Pendiente, Firmado, Completado
   - Descarga de documentos firmados

## 🚀 Desarrollo vs Producción

### Cambio de Entorno
El sistema automáticamente usa:
- **Sandbox** en `ng serve` (development)
- **Producción** en `ng build --configuration=production`

### Testing en Sandbox
- No requiere documentos reales
- Firma de prueba funcional
- API límites más permisivos

### Producción
- Requiere verificación de identidad real
- Documentos con validez legal
- Límites de API según plan contratado

## 🔒 Seguridad

### Variables Sensibles
- **NUNCA** commitear credenciales reales
- Usar variables de entorno del servidor en producción
- Rotar credenciales periódicamente

### Ejemplo para CI/CD
```bash
# Variables de entorno del servidor
export MIFIEL_API_KEY="tu_api_key"
export MIFIEL_APP_ID="tu_app_id"  
export MIFIEL_SECRET="tu_secret"
```

## 📋 Checklist de Deploy

### Desarrollo
- [ ] Credenciales de sandbox configuradas
- [ ] Componente aparece en clientes apropiados
- [ ] Puede crear documentos de prueba
- [ ] Widget de firma funcional

### Producción
- [ ] Credenciales de producción configuradas
- [ ] Variables de entorno del servidor
- [ ] Verificación de identidad configurada
- [ ] Backup de documentos firmados
- [ ] Monitoreo de límites de API

## 🆘 Troubleshooting

### Error: "API Key inválida"
- Verificar credenciales en environment
- Confirmar que coinciden con el entorno (sandbox/prod)

### Error: "Widget no carga"
- Revisar que el App ID sea correcto
- Verificar conectividad a CDN de Mifiel

### Error: "Documento no se crea"
- Validar formato PDF del archivo
- Verificar datos del firmante completos
- Revisar límites de API

## 📞 Soporte

- Documentación Mifiel: https://docs.mifiel.com/
- Soporte técnico: soporte@mifiel.com
- Estatus de servicio: https://status.mifiel.com/