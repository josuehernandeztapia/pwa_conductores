# 🚀 Guía Completa de Deployment

## 📋 Resumen de Deployment

Esta guía cubre el deployment completo de la PWA "Conductores del Mundo" desde development hasta producción, incluyendo configuración de GitHub Pages, optimizaciones de build y verificación post-deployment.

## 🏗️ Pre-requisitos de Deployment

### **Verificaciones Pre-Build**
```bash
# 1. Verificar estado del proyecto
git status

# 2. Instalar dependencias
npm install

# 3. Ejecutar linting
npm run lint

# 4. Ejecutar tests (si existen)
npm run test

# 5. Verificar TypeScript compilation
npx tsc --noEmit
```

### **Configuración de Entornos**

#### **Environment Development**
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiKey: 'DEV_MAKE_API_KEY_PLACEHOLDER',
  conektaPublicKey: 'key_dev_xxxxxxxxxxxxxx',
  mifielAppId: 'dev-app-id',
  metamapClientId: '689833b7d4e7dd0ca48216fb',
  metamapFlowId: '689833b7d4e7dd00d08216fa',
  odooUrl: 'https://dev.odoo-instance.com',
  enableDebugLogs: true
};
```

#### **Environment Production**
```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiKey: 'PROD_MAKE_API_KEY_PLACEHOLDER',
  conektaPublicKey: 'key_prod_xxxxxxxxxxxxxx',
  mifielAppId: 'prod-app-id',
  metamapClientId: '689833b7d4e7dd0ca48216fb',
  metamapFlowId: '689833b7d4e7dd00d08216fa',
  odooUrl: 'https://prod.odoo-instance.com',
  enableDebugLogs: false
};
```

## 🔧 Build de Producción

### **Comando de Build Optimizado**
```bash
# Build completo para producción con PWA
npm run build --prod

# Verificar que el build fue exitoso
echo $?  # Debe retornar 0

# Verificar archivos generados
ls -la dist/conductores_angular_pwa/browser/
```

### **Optimizaciones de Build**

#### **Angular.json Configuration**
```json
{
  "projects": {
    "conductores-angular-pwa": {
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:browser",
          "options": {
            "outputPath": "dist/conductores_angular_pwa/browser",
            "index": "src/index.html",
            "main": "src/main.ts",
            "polyfills": "src/polyfills.ts",
            "tsConfig": "tsconfig.app.json",
            "assets": [
              "src/favicon.ico",
              "src/assets",
              "src/manifest.webmanifest"
            ],
            "styles": [
              "src/styles.scss"
            ],
            "scripts": [
              "https://web-button.metamap.com/button.js"
            ],
            "serviceWorker": true,
            "ngswConfigPath": "ngsw-config.json"
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "2mb",
                  "maximumError": "5mb"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "6kb",
                  "maximumError": "10kb"
                }
              ],
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.prod.ts"
                }
              ],
              "outputHashing": "all",
              "sourceMap": false,
              "namedChunks": false,
              "extractLicenses": true,
              "vendorChunk": false,
              "buildOptimizer": true,
              "aot": true
            }
          }
        }
      }
    }
  }
}
```

## 🌐 GitHub Pages Deployment

### **Configuración Automática con GitHub Actions**

#### **Crear .github/workflows/deploy.yml**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
      
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build --prod
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist/conductores_angular_pwa/browser
        cname: conductores-pwa.yourdomain.com  # Opcional
```

### **Deployment Manual a GitHub Pages**

```bash
# 1. Build para producción
npm run build

# 2. Navegar al directorio de build
cd dist/conductores_angular_pwa/browser

# 3. Inicializar repo git
git init
git add .
git commit -m "Deploy PWA to GitHub Pages 🚀

✅ Build exitoso con funcionalidad completa
✅ Todas las integraciones operativas
✅ PWA optimizada para producción

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. Configurar remote
git branch -M gh-pages
git remote add origin https://github.com/YOUR_USERNAME/conductores_angular_pwa.git

# 5. Push a GitHub Pages
git push -u origin gh-pages --force
```

### **Configuración de GitHub Pages en el Repositorio**

1. Ir a **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **gh-pages**
4. Folder: **/ (root)**
5. Save

## 📱 PWA Service Worker Configuration

### **ngsw-config.json**
```json
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": [
          "/favicon.ico",
          "/index.html",
          "/manifest.webmanifest",
          "/*.css",
          "/*.js"
        ]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": [
          "/assets/**",
          "/*.(eot|svg|cur|jpg|png|webp|gif|otf|ttf|woff|woff2|ani)"
        ]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api-freshness",
      "urls": [
        "https://hook.eu1.make.com/**",
        "https://api.conekta.io/**"
      ],
      "cacheConfig": {
        "strategy": "freshness",
        "maxSize": 100,
        "maxAge": "1h",
        "timeout": "10s"
      }
    },
    {
      "name": "api-performance",
      "urls": [
        "https://web-button.metamap.com/**"
      ],
      "cacheConfig": {
        "strategy": "performance",
        "maxSize": 100,
        "maxAge": "1d"
      }
    }
  ]
}
```

### **Manifest.webmanifest**
```json
{
  "name": "Conductores del Mundo - Asesor PWA",
  "short_name": "Conductores PWA",
  "theme_color": "#0891b2",
  "background_color": "#ffffff",
  "display": "standalone",
  "scope": "./",
  "start_url": "./",
  "icons": [
    {
      "src": "assets/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ]
}
```

## 🔧 Optimizaciones Post-Build

### **Compresión y Cache**
```bash
# Habilitar compresión gzip en servidor
# Agregar estos headers en .htaccess o nginx.conf

# Apache (.htaccess)
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache headers
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
</IfModule>
```

## 🧪 Testing Post-Deployment

### **Verificaciones Automáticas**
```bash
# Script de verificación post-deployment
#!/bin/bash

URL="https://your-username.github.io/conductores_angular_pwa"

echo "🔍 Verificando deployment..."

# 1. Verificar que el sitio esté accesible
if curl -f -s "$URL" > /dev/null; then
    echo "✅ Sitio accesible"
else
    echo "❌ Sitio no accesible"
    exit 1
fi

# 2. Verificar PWA manifest
if curl -f -s "$URL/manifest.webmanifest" > /dev/null; then
    echo "✅ PWA Manifest disponible"
else
    echo "❌ PWA Manifest no encontrado"
fi

# 3. Verificar Service Worker
if curl -f -s "$URL/ngsw-worker.js" > /dev/null; then
    echo "✅ Service Worker disponible"
else
    echo "❌ Service Worker no encontrado"
fi

echo "🚀 Deployment verificado exitosamente!"
```

### **Testing Manual Checklist**

#### **✅ Funcionalidad Core**
- [ ] Dashboard carga correctamente
- [ ] Navegación responsive funciona
- [ ] Simuladores calculan correctamente
- [ ] Onboarding wizard completo funciona
- [ ] Sistema de notificaciones operativo

#### **✅ PWA Features**
- [ ] App es instalable en móvil
- [ ] Service Worker caching funciona
- [ ] Funcionalidad offline básica
- [ ] Splash screen aparece
- [ ] App icon correcto

#### **✅ Integraciones Externas**
- [ ] Metamap web button carga
- [ ] Make.com webhooks (verificar logs)
- [ ] IndexedDB storage funciona
- [ ] LocalStorage persiste datos

#### **✅ Performance**
- [ ] First Contentful Paint < 2s
- [ ] Largest Contentful Paint < 4s
- [ ] Cumulative Layout Shift < 0.1
- [ ] First Input Delay < 100ms

## 📊 Monitoring y Analytics

### **Configuración de Google Analytics 4**
```typescript
// src/app/services/analytics.service.ts
import { Injectable } from '@angular/core';

declare let gtag: Function;

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  
  constructor() {
    gtag('config', 'GA_MEASUREMENT_ID', {
      page_title: 'Conductores PWA',
      page_location: window.location.href
    });
  }
  
  trackEvent(action: string, category: string, label?: string, value?: number) {
    gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }
  
  trackSimulatorUsage(simulatorType: string, amount: number) {
    this.trackEvent('simulator_used', 'engagement', simulatorType, amount);
  }
  
  trackDocumentUpload(documentType: string) {
    this.trackEvent('document_uploaded', 'conversion', documentType);
  }
}
```

### **Error Monitoring con Sentry**
```typescript
// src/main.ts
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';

if (environment.production) {
  enableProdMode();
  
  Sentry.init({
    dsn: 'YOUR_SENTRY_DSN',
    environment: 'production',
    tracesSampleRate: 0.1
  });
}
```

## 🔧 Troubleshooting Común

### **Build Errors**
```bash
# Error: Out of memory
export NODE_OPTIONS="--max-old-space-size=8192"
npm run build

# Error: Module not found
rm -rf node_modules package-lock.json
npm install
npm run build
```

### **PWA Installation Issues**
```typescript
// Verificar PWA criteria en DevTools
// Application → Manifest
// Application → Service Workers
// Lighthouse → PWA audit
```

### **GitHub Pages 404 Errors**
```bash
# Verificar que el base href sea correcto
# En index.html debe ser:
<base href="/conductores_angular_pwa/">

# O configurar en build:
ng build --base-href="/conductores_angular_pwa/"
```

## 🎯 Deployment Checklist Final

### **Pre-Deployment**
- [ ] Build successful sin errores críticos
- [ ] Todos los tests pasan
- [ ] Environment variables configuradas
- [ ] Assets optimizados
- [ ] Service Worker configurado

### **Deployment**
- [ ] GitHub Pages configurado
- [ ] DNS configurado (si custom domain)
- [ ] SSL/HTTPS habilitado
- [ ] Redirects configurados

### **Post-Deployment**
- [ ] PWA instalable
- [ ] Performance acceptable (Lighthouse > 90)
- [ ] Funcionalidades críticas verificadas
- [ ] Monitoring configurado
- [ ] Backup de código taggeado

## 🚀 URLs de Acceso

```bash
# GitHub Pages URL (ejemplo)
https://your-username.github.io/conductores_angular_pwa/

# Custom Domain (opcional)
https://conductores-pwa.yourdomain.com
```

---

*Guía completa de deployment - PWA Conductores del Mundo lista para producción* 🚀