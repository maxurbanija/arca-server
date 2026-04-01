# ARCA Server

Sistema de facturación electrónica integrado con AFIP/ARCA (Argentina). Backend + Frontend full-stack para emitir facturas, notas de crédito/débito, consultar comprobantes, y gestionar certificados digitales — todo contra los web services oficiales de AFIP.

## Stack

- **Backend:** Node.js 22+, Express 5.2, TypeScript 6, Prisma 7 (driver adapter), PostgreSQL, Zod 4
- **Frontend:** React 19.2, Vite 8, Tailwind CSS 4 (@tailwindcss/vite), React Hook Form 7
- **Facturación:** [@ramiidv/arca-facturacion](https://www.npmjs.com/package/@ramiidv/arca-facturacion) v2 — WSFE, WSFEX, CAEA, QR
- **Padrón:** [@ramiidv/arca-padron](https://www.npmjs.com/package/@ramiidv/arca-padron) — A4, A10, A100
- **Constatación:** [@ramiidv/arca-cdc](https://www.npmjs.com/package/@ramiidv/arca-cdc) — WSCDC
- **FECRED:** [@ramiidv/arca-fecred](https://www.npmjs.com/package/@ramiidv/arca-fecred) — Factura de Crédito Electrónica MiPyME
- **MTXCA:** [@ramiidv/arca-mtxca](https://www.npmjs.com/package/@ramiidv/arca-mtxca) — Facturación con detalle de artículos
- **SIRE:** [@ramiidv/arca-sire](https://www.npmjs.com/package/@ramiidv/arca-sire) — Retenciones electrónicas
- **Agro:** [@ramiidv/arca-agro](https://www.npmjs.com/package/@ramiidv/arca-agro) — WSCPE, WSCTG, WSLPG
- **Empleados:** [@ramiidv/arca-empleados](https://www.npmjs.com/package/@ramiidv/arca-empleados) — Generación F935
- **Common:** [@ramiidv/arca-common](https://www.npmjs.com/package/@ramiidv/arca-common) — WSAA, SOAP, validadores
- **Certificados:** [arca-cert](https://www.npmjs.com/package/arca-cert) — Generación automática de certificados AFIP
- **Infra:** Docker Compose, Nginx

## Features

### Facturación

- Factura A, B, C con validación por tipo (A requiere CUIT, C no discrimina IVA)
- Notas de crédito y débito asociadas a facturas existentes
- Cálculo automático de IVA, totales, y numeración (via SDK)
- QR oficial de AFIP generado y persistido por factura
- Fechas de servicio condicionales según concepto (solo para Servicios y Productos y Servicios)
- Puntos de venta dinámicos cargados desde AFIP
- Resultado de comprobante: Aprobado (A) / Rechazado (R)
- Filtros por tipo de comprobante, cliente, y rango de fechas
- Paginación con 20 registros por página

### Certificados

- Generación automática de certificados AFIP desde la UI (via arca-cert)
- Renovación de certificados con alias temporal
- Verificación de certificado contra WSAA
- Visualización de expiración y días restantes (alerta si quedan menos de 30 días)
- Hot-reload del SDK al generar/renovar (sin reiniciar server)
- Producción como entorno default para generación de certificados

### Clientes

- CRUD de clientes con búsqueda (por nombre o número de documento)
- Auto-completar datos desde CUIT via padrón AFIP (A13): nombre, domicilio, condición IVA
- Protección contra eliminación: no se puede borrar un cliente que tiene facturas asociadas

### AFIP

- Consulta de comprobantes en AFIP por punto de venta, tipo y número
- Parámetros de referencia con tabs (comprobantes, IVA, documentos, monedas, tributos, conceptos)
- Cotización oficial de monedas
- Estado de servidores AFIP en dashboard y en configuración

### Observabilidad

- Logging de eventos del SDK: auth login/cache-hit, request start/end/retry/error
- Tiempos de respuesta de cada request a AFIP
- Retries automáticos con backoff exponencial

### Seguridad

- Helmet con CSP, HSTS (1 año), referrer-policy, frame-ancestors: none
- API keys hasheadas con SHA-256 (solo se muestran una vez al crearlas, máximo 5 por usuario)
- JWT con secreto obligatorio (sin defaults inseguros)
- DATABASE_URL obligatorio (sin defaults inseguros)
- Rate limiting: 200 req/15min global, 20 req/15min para endpoints de auth
- CORS restrictivo (default: `http://localhost:5173`)
- Body limit 1MB
- Manejo de errores del SDK con SOAP fault parsing y hints contextuales
- Errores de AFIP parseados con mensajes legibles (ej: "Estás usando el ambiente correcto?")

### Accesibilidad

- Skip-to-content link
- Focus visible global con outline indigo
- Respeto de prefers-reduced-motion
- ARIA labels y roles semánticos
- Touch targets de 44px en mobile (pointer: coarse)
- Touch manipulation (sin 300ms delay)

### Mobile

- UI responsive con Tailwind breakpoints
- Tablas con columnas ocultas en pantallas chicas (Número, Fecha, Cliente)
- Botones compactos (icono solo en mobile, texto en desktop)
- Stat cards en 2 columnas en mobile
- Pagination compacta y centrada
- Toasts dismissibles con botón de cerrar

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

> `JWT_SECRET` y `DATABASE_URL` son obligatorios. El server no arranca sin ellos.

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

Desde la UI: **Configuración** > **Generar Certificado** (necesitás CUIT + clave fiscal nivel 3+).

Via API:

```bash
curl -X POST http://localhost:3001/api/afip/generate-cert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"cuit":"20XXXXXXXXX","password":"clave-fiscal","alias":"mi-sistema","environment":"production"}'
```

El certificado se guarda en `backend/certs/` y el SDK se recarga automáticamente.

### Docker

```bash
docker compose up -d
```

## API Endpoints

### Health

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/health` | Health check (público, sin auth) |

### Autenticación

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| POST | `/api/auth/register` | Registro (primer usuario = admin) |
| POST | `/api/auth/login` | Login, retorna JWT |
| GET | `/api/auth/me` | Usuario autenticado |
| GET | `/api/auth/api-keys` | Listar API keys (máscara, no el key real) |
| POST | `/api/auth/api-keys` | Crear API key (se muestra una sola vez) |
| DELETE | `/api/auth/api-keys/:id` | Eliminar API key |

### Facturas

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| POST | `/api/invoices` | Crear factura (A/B/C) |
| POST | `/api/invoices/nota-credito` | Crear nota de crédito |
| POST | `/api/invoices/nota-debito` | Crear nota de débito |
| GET | `/api/invoices` | Listar (filtros: cbteTipo, clientId, from, to) |
| GET | `/api/invoices/stats` | Estadísticas del dashboard |
| GET | `/api/invoices/:id` | Detalle de factura con items y QR |

### Clientes

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/clients` | Listar (filtro: search por nombre o documento) |
| POST | `/api/clients` | Crear cliente |
| GET | `/api/clients/:id` | Detalle con cantidad de facturas |
| PUT | `/api/clients/:id` | Actualizar cliente |
| DELETE | `/api/clients/:id` | Eliminar (falla si tiene facturas) |

### AFIP — Parámetros, Padrón y Constatación

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/afip/status` | Estado servidores WSFE |
| GET | `/api/afip/contribuyente/:cuit` | Consulta padrón A13 |
| GET | `/api/afip/comprobante` | Consultar comprobante (query: puntoVenta, cbteTipo, cbteNro) |
| GET | `/api/afip/cotizacion` | Cotización de moneda (query: monedaId) |
| GET | `/api/afip/puntos-venta` | Puntos de venta habilitados |
| GET | `/api/afip/last-voucher` | Último comprobante (query: puntoVenta, cbteTipo) |
| GET | `/api/afip/invoice-types` | Tipos de comprobante |
| GET | `/api/afip/doc-types` | Tipos de documento |
| GET | `/api/afip/iva-types` | Alícuotas IVA |
| GET | `/api/afip/iva-conditions` | Condiciones frente al IVA |
| GET | `/api/afip/concept-types` | Tipos de concepto |
| GET | `/api/afip/currency-types` | Monedas |
| GET | `/api/afip/tributo-types` | Tipos de tributo |
| GET | `/api/afip/optional-types` | Datos opcionales |
| GET | `/api/afip/contribuyente-basic/:cuit` | Consulta padrón A10 (básico) |
| GET | `/api/afip/padron-status` | Estado servicios de padrón (A4/A10/A100) |
| POST | `/api/afip/constatar` | Constatar comprobante via WSCDC |
| GET | `/api/afip/cdc-status` | Estado servicio WSCDC |
| GET | `/api/afip/cdc-tipos-cbte` | Tipos de comprobante WSCDC |
| GET | `/api/afip/fecred-status` | Estado WSFECRED |
| GET | `/api/afip/fecred-obligado/:cuit` | Consultar si CUIT está obligado a recibir FCE |
| POST | `/api/afip/fecred-ctas-ctes` | Consultar cuentas corrientes FCE |
| POST | `/api/afip/fecred-aceptar` | Aceptar FCE |
| POST | `/api/afip/fecred-rechazar` | Rechazar FCE |
| GET | `/api/afip/mtxca-status` | Estado WSMTXCA |
| POST | `/api/afip/mtxca-autorizar` | Autorizar factura con detalle de artículos |
| GET | `/api/afip/mtxca-ultimo-comprobante` | Último comprobante MTXCA |
| GET | `/api/afip/sire-status` | Estado SIRE |
| POST | `/api/afip/sire-retencion` | Registrar retención |
| POST | `/api/afip/sire-consultar` | Consultar retenciones por período |
| DELETE | `/api/afip/sire-anular/:nro` | Anular retención |
| GET | `/api/afip/sire-regimenes` | Consultar regímenes |
| GET | `/api/afip/agro-status` | Estado servicios agro (CPE/CTG/LPG) |
| POST | `/api/afip/agro-cpe-autorizar` | Autorizar Carta de Porte |
| POST | `/api/afip/agro-ctg-solicitar` | Solicitar CTG |
| POST | `/api/afip/agro-lpg-autorizar` | Autorizar liquidación de granos |
| POST | `/api/afip/empleados-generar` | Generar archivo F935 |

### AFIP — Certificados

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| POST | `/api/afip/generate-cert` | Generar certificado AFIP (timeout: 2min) |
| POST | `/api/afip/renew-cert` | Renovar certificado (alias nuevo) |
| GET | `/api/afip/cert-info` | Expiración del cert actual (días restantes) |
| POST | `/api/afip/test-cert` | Verificar cert contra WSAA |

## Frontend

### Páginas

| Ruta | Página | Descripción |
| ---- | ------ | ----------- |
| `/` | Dashboard | Stats, facturas recientes, estado AFIP |
| `/facturas` | Facturas | Lista con filtros por tipo y fecha, paginación |
| `/facturas/nueva` | Nueva Factura | Formulario tipo-aware (A/B/C) con cálculo en vivo |
| `/facturas/nota` | NC / ND | Crear nota de crédito o débito desde factura existente |
| `/facturas/:id` | Detalle | Factura completa con items, totales, CAE, QR, botón NC/ND |
| `/clientes` | Clientes | Lista con búsqueda y paginación |
| `/clientes/nuevo` | Nuevo Cliente | Formulario con lookup CUIT desde padrón AFIP |
| `/clientes/:id/editar` | Editar Cliente | Mismo formulario en modo edición |
| `/consulta` | Consultar Cbte. | Buscar comprobante en AFIP por PV + tipo + número |
| `/parametros` | Parámetros AFIP | Tabs: comprobantes, documentos, IVA, conceptos, monedas, tributos + cotización |
| `/configuracion` | Configuración | Generar/renovar cert, verificar cert, estado AFIP, info sistema |
| `/api-keys` | API Keys | Crear, listar y eliminar API keys |
| `/login` | Login | Email + contraseña |
| `/register` | Registro | Nombre, email, contraseña |

### Navegación (Sidebar)

- **General:** Dashboard
- **Facturación:** Facturas, Nueva Factura, NC / ND
- **Gestión:** Clientes, Nuevo Cliente
- **AFIP:** Consultar Cbte., Parámetros
- **Sistema:** API Keys, Configuración

## Base de datos

### Modelos (Prisma)

- **User** — email, password (bcrypt 12 rounds), name, role (admin/user)
- **ApiKey** — key (SHA-256 hash), keyHint (máscara visible), userId, lastUsed (máx 5 por usuario)
- **Client** — name, docType, docNumber, ivaCondition, address, email, phone
- **Invoice** — cbteTipo, puntoVenta, cbteNro, importes (Decimal 15,2), cae, caeFchVto, resultado, qrUrl, monId, monCotiz, observations
- **InvoiceItem** — description, quantity, unitPrice, ivaId, ivaRate, subtotal, ivaAmount

## Tests

```bash
cd backend
npm test                           # 48 tests unitarios
AFIP_CUIT=20XXXXX npm test         # + tests de integración con AFIP
```

Tests cubren: constantes/enums (incluido CondicionIva), formatDate, calcularTotales (IVA, exentos, no gravados, tipo C, tributos), extractCAE, generateQRUrl, error classes (ArcaError, ArcaAuthError, ArcaWSFEError, ArcaSoapError), y tests de integración con AFIP homologación (se auto-skipean sin certs).

## Licencia

MIT
