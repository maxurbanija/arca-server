# ARCA Server

Sistema de facturación electrónica integrado con AFIP/ARCA (Argentina). Backend + Frontend full-stack para emitir facturas, notas de crédito/débito, consultar comprobantes, y gestionar certificados digitales — todo contra los web services oficiales de AFIP.

## Stack

- **Backend:** Node.js 22+, Express 5.2, TypeScript 6, Prisma 7 (driver adapter), PostgreSQL, Zod 4
- **Frontend:** React 19.2, Vite 8, Tailwind CSS 4 (@tailwindcss/vite), React Hook Form 7
- **SDK:** [@ramiidv/arca-sdk](https://github.com/ramiidv/arca-sdk) v1.1+ — WSFE, WSFEX, WSAA, Padrón, CAEA, QR
- **Certificados:** [arca-cert](https://www.npmjs.com/package/arca-cert) — Generación automática de certificados AFIP
- **Infra:** Docker Compose, Nginx

## Features

### Facturación

- Factura A, B, C con validación por tipo (A requiere CUIT, C no discrimina IVA)
- Notas de crédito y débito asociadas a facturas existentes
- Cálculo automático de IVA, totales, y numeración (via SDK)
- QR oficial de AFIP generado y persistido por factura
- Fechas de servicio condicionales según concepto
- Puntos de venta dinámicos cargados desde AFIP

### Certificados

- Generación automática de certificados AFIP desde la UI (via arca-cert)
- Renovación de certificados con alias temporal
- Verificación de certificado contra WSAA
- Visualización de expiración y días restantes
- Hot-reload del SDK al generar/renovar (sin reiniciar server)
- Producción como entorno default

### Clientes

- CRUD de clientes con búsqueda
- Auto-completar datos desde CUIT via padrón AFIP (A13)
- Inferencia de condición IVA desde impuestos del padrón

### AFIP

- Consulta de comprobantes en AFIP
- Parámetros de referencia con tabs (comprobantes, IVA, documentos, monedas, tributos, conceptos)
- Cotización oficial de monedas
- Estado de servidores AFIP en dashboard

### Seguridad

- Helmet con CSP, HSTS, referrer-policy, frame-ancestors
- API keys hasheadas con SHA-256 (solo se muestran una vez al crearlas)
- JWT con secreto obligatorio (sin defaults inseguros)
- Rate limiting global (200 req/15min) y auth (20 req/15min)
- CORS restrictivo (default: localhost)
- Body limit 1MB
- Manejo de errores del SDK con SOAP fault parsing (arca-sdk + arca-cert)
- Errores de AFIP parseados con hints contextuales (ej: "Estás usando el ambiente correcto?")

### Accesibilidad

- Skip-to-content link
- Focus visible global
- Respeto de prefers-reduced-motion
- ARIA labels y roles semánticos
- Touch targets de 44px en mobile
- Touch manipulation (sin 300ms delay)

### Mobile

- UI responsive con Tailwind breakpoints
- Tablas con columnas ocultas en pantallas chicas
- Botones compactos (icono solo en mobile)
- Stat cards en 2 columnas en mobile
- Pagination compacta y centrada

## Setup

### Requisitos

- Node.js 22+
- PostgreSQL 17+
- Certificado AFIP (se puede generar desde la UI con clave fiscal)

### Variables de entorno

Crear `backend/.env`:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/arca_facturacion

JWT_SECRET=tu-secreto-seguro-aqui
JWT_EXPIRES_IN=7d

AFIP_CUIT=20XXXXXXXXX
AFIP_CERT_PATH=./certs/cert.crt
AFIP_KEY_PATH=./certs/key.key
AFIP_PUNTO_VENTA=1
AFIP_PRODUCTION=false

PORT=3001
CORS_ORIGIN=http://localhost:5173
```

### Instalación

```bash
# Backend
cd backend
npm install
npx prisma migrate dev
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### Generar certificado AFIP

Se puede generar directamente desde la UI en **Configuración** > **Generar Certificado**, o via API:

```bash
curl -X POST http://localhost:3001/api/afip/generate-cert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"cuit":"20XXXXXXXXX","password":"clave-fiscal","alias":"mi-sistema","environment":"production"}'
```

### Docker

```bash
docker compose up -d
```

## API Endpoints

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro (primer usuario = admin) |
| POST | `/api/auth/login` | Login, retorna JWT |
| GET | `/api/auth/me` | Usuario autenticado |
| GET | `/api/auth/api-keys` | Listar API keys |
| POST | `/api/auth/api-keys` | Crear API key |
| DELETE | `/api/auth/api-keys/:id` | Eliminar API key |

### Facturas

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/invoices` | Crear factura (A/B/C) |
| POST | `/api/invoices/nota-credito` | Crear nota de crédito |
| POST | `/api/invoices/nota-debito` | Crear nota de débito |
| GET | `/api/invoices` | Listar con filtros y paginación |
| GET | `/api/invoices/stats` | Estadísticas del dashboard |
| GET | `/api/invoices/:id` | Detalle de factura |

### Clientes

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/clients` | Listar clientes |
| POST | `/api/clients` | Crear cliente |
| GET | `/api/clients/:id` | Detalle de cliente |
| PUT | `/api/clients/:id` | Actualizar cliente |
| DELETE | `/api/clients/:id` | Eliminar cliente |

### AFIP

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/afip/status` | Estado servidores WSFE |
| GET | `/api/afip/contribuyente/:cuit` | Consulta padrón A13 |
| GET | `/api/afip/comprobante` | Consultar comprobante en AFIP |
| GET | `/api/afip/cotizacion` | Cotización de moneda |
| GET | `/api/afip/puntos-venta` | Puntos de venta habilitados |
| GET | `/api/afip/last-voucher` | Último comprobante autorizado |
| GET | `/api/afip/invoice-types` | Tipos de comprobante |
| GET | `/api/afip/doc-types` | Tipos de documento |
| GET | `/api/afip/iva-types` | Alícuotas IVA |
| GET | `/api/afip/concept-types` | Tipos de concepto |
| GET | `/api/afip/currency-types` | Monedas |
| GET | `/api/afip/tributo-types` | Tipos de tributo |
| GET | `/api/afip/optional-types` | Datos opcionales |

### Certificados

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/afip/generate-cert` | Generar certificado AFIP |
| POST | `/api/afip/renew-cert` | Renovar certificado |
| GET | `/api/afip/cert-info` | Info de expiración del cert actual |
| POST | `/api/afip/test-cert` | Verificar cert contra WSAA |

## Frontend — Páginas

| Ruta | Página |
|------|--------|
| `/` | Dashboard con stats, facturas recientes, estado AFIP |
| `/facturas` | Lista de facturas con filtros y paginación |
| `/facturas/nueva` | Crear factura (tipo-aware: A/B/C) |
| `/facturas/nota` | Crear nota de crédito / débito |
| `/facturas/:id` | Detalle de factura con QR |
| `/clientes` | Lista de clientes con búsqueda |
| `/clientes/nuevo` | Crear cliente (con lookup CUIT) |
| `/clientes/:id/editar` | Editar cliente |
| `/consulta` | Consultar comprobante en AFIP |
| `/parametros` | Parámetros AFIP (tabs) + cotización |
| `/configuracion` | Certificados, estado AFIP, info del sistema |
| `/api-keys` | Gestión de API keys |

## Tests

```bash
cd backend
npm test                           # 48 tests unitarios
AFIP_CUIT=20XXXXX npm test         # + tests de integración con AFIP
```

## Licencia

MIT
