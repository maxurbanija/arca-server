# AGENTS.md

Bitácora viva de lo que vamos aprendiendo sobre este repo mientras trabajamos en él. No duplica lo que ya está en [README.md](README.md) o [llms.txt](llms.txt) (arquitectura, stack, features) — esto es para gotchas, decisiones de setup local, y cosas que no son obvias leyendo el código.

> **Instrucción para agentes:** cada vez que descubras algo no trivial sobre este repo (un bug, una convención rara, una decisión de arquitectura sin documentar, un paso de setup que no está en el README, un comportamiento inesperado de una dependencia) agregalo acá en la sección correspondiente. Mantené las entradas cortas y fechadas. No copies acá información que ya se puede derivar leyendo el código o el README.

## Setup local (dev)

Enfoque usado: **Postgres vía Docker, backend y frontend nativos con npm** (hot-reload real, en vez de buildear imágenes de `docker-compose.yml` para backend/frontend).

```bash
# 1. Postgres (única pieza que corre en Docker)
docker compose up -d postgres

# 2. Backend
cd backend
npm install
npx prisma migrate dev
npm run dev          # nodemon + tsx, puerto 3001

# 3. Frontend (otra terminal)
cd frontend
npm install
npm run dev           # vite, puerto 5173
```

- `backend/.env` no está trackeado (ver `.gitignore`) y no existe por default — hay que crearlo a partir de las variables documentadas en `.env.example` (raíz del repo) o el bloque del README. Usa el puerto **5433** para Postgres (no 5432), porque así está mapeado en `docker-compose.yml`.
- `docker-compose.yml` completo (postgres + backend + frontend + nginx) es el modo "producción-like" (build de imágenes, sin hot reload). Para desarrollo día a día no lo usamos completo.

## Gotchas encontrados

- **2026-07-01**: `.env.example` (raíz) tiene una línea suelta al final que no es una variable de entorno: una nota sobre `facturacion.js:73` diciendo que si un `LineItem` tiene `iva` y `exento: true` a la vez, gana `exento` por el orden del if/else if, y que quizás debería ser un warning/error en vez de ignorar el IVA silenciosamente. **Investigado (2026-07-01)**: confirmado en `@ramiidv/arca-facturacion` (`dist/facturacion.js`, el `if (item.exento) / else if (item.iva !== undefined)` en el loop de items) — el IVA se descarta en silencio y el neto va a `impOpEx`. Pero **este repo no puede dispararlo**: el backend nunca setea `exento`; los items entran por zod solo con `ivaId` (validado contra `VALID_IVA_IDS`) y se mapean a `{ neto, iva: ivaId }` en `invoice.service.ts` (`createInvoice`/`createNotaCredito`/`createNotaDebito`). **Mitigado en local (2026-07-01)**: se decidió no depender del SDK — el armado de `LineItem`s quedó centralizado en el helper `toLineItems()` de `invoice.service.ts` (antes estaba duplicado idéntico en `createInvoice`/`createNotaCredito`/`createNotaDebito`), que por construcción nunca emite `exento` y documenta la restricción en un comentario. Si algún día se agrega soporte para items exentos, hacerlo ahí y validar que `iva` y `exento` no convivan en el mismo item. La línea suelta se removió de `.env.example`.
- **2026-07-01**: El backend **crashea al arrancar** si no existen `backend/certs/cert.crt` y `backend/certs/key.key` (los lee de forma síncrona en `arca.service.ts:34`, sin try/catch). Esto no está en el README como paso obligatorio. Para desarrollo local sin certificado AFIP real, alcanza con generar un par dummy self-signed para que el server bootee (los servicios de AFIP en sí no van a funcionar, pero el resto de la app — auth, clientes, UI — sí):
  ```bash
  cd backend
  mkdir -p certs
  openssl req -x509 -newkey rsa:2048 -keyout certs/key.key -out certs/cert.crt -days 365 -nodes -subj "/CN=arca-local-dev"
  ```
  En Git Bash en Windows, el `/CN=...` necesita `MSYS_NO_PATHCONV=1` antes del comando porque MSYS reinterpreta el leading slash como un path de Windows.
- **2026-07-01**: Este proyecto requiere **Node 22.12+** (Prisma 7 y Vite 8 no arrancan con versiones anteriores, tiran error claro). Si tenés nvm-windows con una versión más vieja activa, `nvm install 22.14.0 && nvm use 22.14.0` antes de `npm install`.
- **2026-07-01**: `nodemon` (backend) solo vigila extensiones `ts`/`json` — si agregás/cambiás archivos en `certs/` (u otro no-ts/json) no reinicia solo, hay que matar el proceso y correr `npm run dev` de nuevo a mano.
- **2026-07-01**: En Windows, `nodemon --exec tsx src/index.ts` imprime `[nodemon] clean exit - waiting for changes before restart` inmediatamente después de "ARCA Server running on port 3001", como si el proceso hubiera muerto. Es cosmético: nodemon lanza `tsx` a través de un `cmd.exe` intermedio en Windows y pierde el tracking del hijo real, pero el server sigue vivo y respondiendo (confirmado con `curl` y el puerto en LISTEN). No matar el proceso pensando que crasheó — verificar con `curl http://localhost:3001/api/health` antes de asumir que hay que reiniciar.
- **2026-07-01**: Al bajar los dev servers (`npm run dev` en background), matar solo el proceso "wrapper" de la tarea en background **no mata los hijos reales** en Windows — `nodemon`/`vite` quedan corriendo (visible como `cmd.exe /d /s /c nodemon ...` + el `node .../nodemon.js` real, o `cmd.exe /d /s /c vite` + `node .../vite.js`). Si necesitás bajar y volver a levantar todo, hay que matar esos PIDs reales explícitamente (`Get-CimInstance Win32_Process | Where-Object CommandLine -like '*nodemon*'/'*vite*'` y `Stop-Process -Force`), si no el siguiente `npm run dev` pisa el puerto (frontend salta a 5174, etc.) o queda duplicado.

- **2026-07-01**: Al retomar el repo desde otra sesión de Claude Code (VSCode → standalone), los dev servers huérfanos de la sesión anterior todavía respondían health checks al principio, pero **murieron solos unos minutos después**, y el contenedor `arca-postgres` apareció removido (no solo detenido — `docker ps -a` vacío). El volumen `arcaserver_pgdata` conservó todos los datos (users/clients intactos). Moraleja: al retomar, relanzar postgres y ambos `npm run dev` bajo la sesión nueva aunque los puertos respondan — los procesos viejos no son confiables. Un 500 repentino en `/api/auth/login` con el health check OK es señal de que la DB se cayó por debajo del backend.

- **2026-07-01**: `npm audit fix` aplicado en backend y frontend (sin `--force`). Frontend quedó en 0 vulnerabilidades (se actualizaron `vite` 8.0→8.1, `react-router` 7.15+, `form-data`, `postcss`). Backend quedó con 4 dev-only que **no conviene forzar**: 3 son la cadena `prisma` (CLI) → `@prisma/dev` → `@hono/node-server`, cuyo "fix" es downgradear Prisma a 6.x (breaking, dirección equivocada); la otra es `esbuild@0.27.4` pineado por `tsx` y `vite`, con una vulnerabilidad del dev server propio de esbuild que ni tsx ni vitest usan. Revisitar cuando Prisma/tsx/vite publiquen updates.

## Flujo de trabajo (branching)

Desde 2026-07-01 este fork (`maxurbanija/arca-server`, remote `fork`) usa un flujo tipo git-flow simplificado:

- **`main`**: estable. Refleja lo último publicable y es la base para sincronizar con el upstream (`origin` = `ramiidv/arca-server`, solo lectura).
- **`develop`**: rama de integración. Todo el trabajo diario aterriza acá.
- **Ramas de feature/fix**: salen de `develop` con nombre `feature/<descripcion-corta>` o `fix/<descripcion-corta>`, y vuelven a `develop` (idealmente vía PR en el fork, aunque sea self-review).
- `develop` → `main` se mergea cuando hay un corte estable.
- Los commits al upstream de ramiidv (si algún día se proponen) salen como PR desde el fork.

### Convenciones y tooling (desde 2026-07-01)

- **Commits**: [conventional commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `ci:`, `docs:`, `refactor:`, `test:`), validados por commitlint en el hook `commit-msg`. Los commits anteriores a esta fecha no siguen el formato.
- **Hooks** (husky, se instalan con `npm install` en la raíz): `pre-commit` corre lint-staged (eslint --fix + prettier sobre lo staged, con config por paquete); `commit-msg` corre commitlint.
- **Lint**: `npm run lint` en `backend/` y `frontend/` (flat config, typescript-eslint). Las reglas del React Compiler (`react-hooks/set-state-in-effect`, `immutability`) están en `warn` porque el código legacy hace fetch-en-useEffect; la deuda es llevarlas a cero y subirlas a `error`.
- **Formato**: Prettier con config compartida en la raíz (`.prettierrc.json`), calibrada al estilo preexistente (single quotes, 110 cols). **No se hizo reformat masivo** a propósito, para no complicar merges con el upstream — el formato se aplica solo a archivos tocados, vía lint-staged.
- **CI**: `.github/workflows/ci.yml` corre lint + tests + build de ambos paquetes en push/PR a `main`/`develop`. Nada se mergea en rojo. Ojo: en un fork nuevo GitHub deja Actions deshabilitado hasta habilitarlo a mano en la pestaña Actions.

## Decisiones de setup

- **2026-07-01**: Se optó por no levantar backend/frontend vía Docker en desarrollo local (solo Postgres) para tener hot-reload de verdad con `nodemon`/`vite`, siguiendo el flujo que ya describe el README en la sección "Instalación".
