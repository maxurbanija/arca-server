# ARCA Server

Sistema de facturación electrónica integrado con AFIP/ARCA (Argentina). Backend + Frontend full-stack para emitir facturas, notas de crédito/débito, y consultar comprobantes contra los web services de AFIP.

## Stack

- **Backend:** Node.js 22+, Express 5.2, TypeScript 6, Prisma 7 (driver adapter), PostgreSQL, Zod 4
- **Frontend:** React 19.2, Vite 8, Tailwind CSS 4 (@tailwindcss/vite), React Hook Form 7
- **SDK:** [@ramiidv/arca-sdk](https://github.com/ramiidv/arca-sdk) v1.1+ — SDK propio para WSFE, WSFEX, WSAA, Padrón
- **Infra:** Docker Compose, Nginx

## Features

### Facturación

- Factura A, B, C con validación por tipo (A requiere CUIT, C no discrimina IVA)
- Notas de crédito y débito asociadas a facturas existentes
- Cálculo automático de IVA, totales, y numeración (via SDK)
- QR oficial de AFIP generado y persistido por factura
- Fechas de servicio condicionales según concepto

### Clientes

- CRUD de clientes con búsqueda
- Auto-completar datos desde CUIT via padrón AFIP (A13)
- Inferencia de condición IVA desde impuestos del padrón

### AFIP

- Consulta de comprobantes en AFIP
- Parámetros de referencia (tipos de comprobante, IVA, documentos, monedas, tributos)
- Cotización oficial de monedas
- Puntos de venta dinámicos desde AFIP
- Estado de servidores AFIP en dashboard

### Seguridad

- Helmet con CSP, HSTS, referrer-policy
- API keys hasheadas con SHA-256 (solo se muestran una vez al crearlas)
- JWT con secreto obligatorio (sin defaults inseguros)
- Rate limiting global (200 req/15min) y auth (20 req/15min)
- CORS restrictivo
- Manejo de errores del SDK (ArcaAuthError, ArcaWSFEError, ArcaSoapError)

### Accesibilidad

- Skip-to-content link
- Focus visible global
- Respeto de prefers-reduced-motion
- ARIA labels y roles semánticos

## Setup

### Requisitos

- Node.js 22+
- PostgreSQL 17+
- Certificado y clave de AFIP (homologación o producción)

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

### Docker

```bash
docker compose up -d
```

## API Endpoints

### Autenticación

- `POST /api/auth/register` — Registro (primer usuario = admin)
- `POST /api/auth/login` — Login, retorna JWT
- `GET /api/auth/me` — Usuario autenticado
- `GET/POST/DELETE /api/auth/api-keys` — Gestión de API keys

### Facturas

- `POST /api/invoices` — Crear factura (A/B/C)
- `POST /api/invoices/nota-credito` — Crear nota de crédito
- `POST /api/invoices/nota-debito` — Crear nota de débito
- `GET /api/invoices` — Listar con filtros y paginación
- `GET /api/invoices/stats` — Estadísticas del dashboard
- `GET /api/invoices/:id` — Detalle de factura

### Clientes

- `GET/POST /api/clients` — Listar/crear clientes
- `GET/PUT/DELETE /api/clients/:id` — CRUD individual

### AFIP

- `GET /api/afip/status` — Estado servidores WSFE
- `GET /api/afip/contribuyente/:cuit` — Consulta padrón A13
- `GET /api/afip/comprobante` — Consultar comprobante en AFIP
- `GET /api/afip/cotizacion` — Cotización de moneda
- `GET /api/afip/puntos-venta` — Puntos de venta habilitados
- `GET /api/afip/last-voucher` — Último comprobante autorizado
- `GET /api/afip/invoice-types` — Tipos de comprobante
- `GET /api/afip/doc-types` — Tipos de documento
- `GET /api/afip/iva-types` — Alícuotas IVA
- `GET /api/afip/concept-types` — Tipos de concepto
- `GET /api/afip/currency-types` — Monedas
- `GET /api/afip/tributo-types` — Tipos de tributo
- `GET /api/afip/optional-types` — Datos opcionales

## Tests

```bash
cd backend
npm test                           # 48 tests unitarios
AFIP_CUIT=20XXXXX npm test         # + tests de integración con AFIP
```

## Licencia

MIT
