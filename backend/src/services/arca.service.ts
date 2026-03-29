import fs from 'fs';
import { Arca } from '@ramiidv/arca-sdk';
import type { ArcaEvent } from '@ramiidv/arca-sdk';
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
      console.warn(`[ARCA] Retry #${event.attempt} for ${event.method}: ${event.error} (waiting ${event.delayMs}ms)`);
      break;
    case 'request:error':
      console.error(`[ARCA] Error in ${event.method}: ${event.error}`);
      break;
  }
}

function createArca(production?: boolean): Arca {
  const cert = fs.readFileSync(config.afip.certPath, 'utf8');
  const key = fs.readFileSync(config.afip.keyPath, 'utf8');

  return new Arca({
    cuit: Number(config.afip.cuit),
    cert,
    key,
    production: production ?? config.afip.production,
    onEvent,
  });
}

let _instance = createArca();

export function getArca(): Arca {
  return _instance;
}

export function reloadArca(production?: boolean) {
  _instance = createArca(production);
  const env = production ? 'PRODUCTION' : 'HOMOLOGATION';
  console.log(`[ARCA] SDK reloaded with new certificates (${env})`);
}

export const arca = new Proxy({} as Arca, {
  get(_target, prop) {
    return (getArca() as any)[prop];
  },
});
