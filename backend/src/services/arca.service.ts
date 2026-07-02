import fs from 'fs';
import path from 'path';
import { Arca } from '@ramiidv/arca-facturacion';
import type { ArcaEvent } from '@ramiidv/arca-facturacion';
import { ArcaPadron } from '@ramiidv/arca-padron';
import { ArcaCdc } from '@ramiidv/arca-cdc';
import { ArcaFecred } from '@ramiidv/arca-fecred';
import { ArcaMtxca } from '@ramiidv/arca-mtxca';
import { ArcaSire } from '@ramiidv/arca-sire';
import { ArcaAgro } from '@ramiidv/arca-agro';
import { config } from '../config';

function onEvent(event: ArcaEvent) {
  switch (event.type) {
    case 'auth:login':
      console.log(`[ARCA] Auth login for ${event.service} (${event.durationMs}ms)`);
      break;
    case 'auth:cache-hit':
      console.log(`[ARCA] Auth cache hit for ${event.service}`);
      break;
    case 'request:end':
      console.log(`[ARCA] ${event.method} completed (${event.durationMs}ms)`);
      break;
    case 'request:retry':
      console.warn(`[ARCA] Retry #${event.attempt} for ${event.method}: ${event.error}`);
      break;
    case 'request:error':
      console.error(`[ARCA] Error in ${event.method}: ${event.error}`);
      break;
  }
}

function readCerts() {
  return {
    cert: fs.readFileSync(config.afip.certPath, 'utf8'),
    key: fs.readFileSync(config.afip.keyPath, 'utf8'),
  };
}

const cuit = config.afip.cuit;

// El SDK cachea los tickets de WSAA solo en memoria y AFIP rechaza emitir otro
// mientras el anterior siga vigente: cada reinicio del backend podía dejar wsfe
// bloqueado hasta la expiración (~12h). Si existe certs/ta-<servicio>.json (no
// versionado), se siembra el cache del SDK con ese ticket al bootear.
function seedAccessTickets(arca: Arca) {
  const services = ['wsfe'];
  for (const service of services) {
    const file = path.resolve(path.dirname(config.afip.certPath), `ta-${service}.json`);
    if (!fs.existsSync(file)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as {
        token?: string;
        sign?: string;
        expirationTime?: string;
      };
      const expirationTime = new Date(raw.expirationTime ?? 0);
      if (!raw.token || !raw.sign || expirationTime.getTime() - Date.now() < 5 * 60_000) continue;
      const wsaa = (arca as unknown as { wsaa: { ticketCache: Map<string, unknown> } }).wsaa;
      wsaa.ticketCache.set(service, { token: raw.token, sign: raw.sign, expirationTime });
      console.log(`[ARCA] TA de ${service} sembrado desde ${file} (expira ${expirationTime.toISOString()})`);
    } catch {
      console.warn(`[ARCA] No se pudo sembrar el TA desde ${file} (archivo inválido)`);
    }
  }
}

function createAll(production?: boolean) {
  const { cert, key } = readCerts();
  const prod = production ?? config.afip.production;

  const arca = new Arca({ cuit: Number(cuit), cert, key, production: prod, onEvent });
  seedAccessTickets(arca);

  return {
    arca,
    padron: new ArcaPadron({ cuit, cert, key, production: prod }),
    cdc: new ArcaCdc({ cuit: Number(cuit), cert, key, production: prod }),
    fecred: new ArcaFecred({ cuit, cert, key, production: prod }),
    mtxca: new ArcaMtxca({ cuit: Number(cuit), cert, key, production: prod }),
    sire: new ArcaSire({ cuit, cert, key, production: prod }),
    agro: new ArcaAgro({ cuit: Number(cuit), cert, key, production: prod }),
  };
}

let _instances = createAll();

export function reloadArca(production?: boolean) {
  _instances = createAll(production);
  const env = production ? 'PRODUCTION' : 'HOMOLOGATION';
  console.log(`[ARCA] All services reloaded with new certificates (${env})`);
}

function proxy<T extends object>(getter: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      return (getter() as Record<PropertyKey, unknown>)[prop];
    },
  });
}

export const arca = proxy(() => _instances.arca);
export const padron = proxy(() => _instances.padron);
export const cdc = proxy(() => _instances.cdc);
export const fecred = proxy(() => _instances.fecred);
export const mtxca = proxy(() => _instances.mtxca);
export const sire = proxy(() => _instances.sire);
export const agro = proxy(() => _instances.agro);
