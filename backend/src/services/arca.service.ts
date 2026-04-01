import fs from 'fs';
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

function createAll(production?: boolean) {
  const { cert, key } = readCerts();
  const prod = production ?? config.afip.production;

  return {
    arca: new Arca({ cuit: Number(cuit), cert, key, production: prod, onEvent }),
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
    get(_target, prop) { return (getter() as any)[prop]; },
  });
}

export const arca = proxy(() => _instances.arca);
export const padron = proxy(() => _instances.padron);
export const cdc = proxy(() => _instances.cdc);
export const fecred = proxy(() => _instances.fecred);
export const mtxca = proxy(() => _instances.mtxca);
export const sire = proxy(() => _instances.sire);
export const agro = proxy(() => _instances.agro);
