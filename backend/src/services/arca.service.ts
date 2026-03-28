import fs from 'fs';
import { Arca } from '@ramiidv/arca-sdk';
import type { ArcaEvent } from '@ramiidv/arca-sdk';
import { config } from '../config';

const cert = fs.readFileSync(config.afip.certPath, 'utf8');
const key = fs.readFileSync(config.afip.keyPath, 'utf8');

export const arca = new Arca({
  cuit: Number(config.afip.cuit),
  cert,
  key,
  production: config.afip.production,
  onEvent: (event: ArcaEvent) => {
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
  },
});
