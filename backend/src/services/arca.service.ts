import fs from 'fs';
import { Arca } from '@ramiidv/arca-facturacion';
import type { ArcaEvent } from '@ramiidv/arca-facturacion';
import { ArcaPadron } from '@ramiidv/arca-padron';
import { ArcaCdc } from '@ramiidv/arca-cdc';
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

function createArca(production?: boolean): Arca {
  const { cert, key } = readCerts();
  return new Arca({
    cuit: Number(config.afip.cuit),
    cert,
    key,
    production: production ?? config.afip.production,
    onEvent,
  });
}

function createPadron(production?: boolean): ArcaPadron {
  const { cert, key } = readCerts();
  return new ArcaPadron({
    cuit: config.afip.cuit,
    cert,
    key,
    production: production ?? config.afip.production,
  });
}

function createCdc(production?: boolean): ArcaCdc {
  const { cert, key } = readCerts();
  return new ArcaCdc({
    cuit: Number(config.afip.cuit),
    cert,
    key,
    production: production ?? config.afip.production,
  });
}

let _arca = createArca();
let _padron = createPadron();
let _cdc = createCdc();

export function reloadArca(production?: boolean) {
  _arca = createArca(production);
  _padron = createPadron(production);
  _cdc = createCdc(production);
  const env = production ? 'PRODUCTION' : 'HOMOLOGATION';
  console.log(`[ARCA] All services reloaded with new certificates (${env})`);
}

export const arca = new Proxy({} as Arca, {
  get(_target, prop) { return (_arca as any)[prop]; },
});

export const padron = new Proxy({} as ArcaPadron, {
  get(_target, prop) { return (_padron as any)[prop]; },
});

export const cdc = new Proxy({} as ArcaCdc, {
  get(_target, prop) { return (_cdc as any)[prop]; },
});
