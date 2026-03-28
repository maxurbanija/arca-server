import fs from 'fs';
import forge from 'node-forge';
import soap from 'soap';
import { config } from '../config';

interface Ticket {
  token: string;
  sign: string;
  expirationTime: Date;
}

function signTRA(traXml: string, certPem: string, keyPem: string): string {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(traXml, 'utf8');

  const cert = forge.pki.certificateFromPem(certPem);
  const key = forge.pki.privateKeyFromPem(keyPem);

  p7.addCertificate(cert);
  p7.addSigner({
    key: key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.messageDigest,
      },
      {
        type: forge.pki.oids.signingTime,
        value: new Date() as any,
      },
    ],
  });

  p7.sign();

  const asn1 = p7.toAsn1();
  const der = forge.asn1.toDer(asn1);
  return forge.util.encode64(der.getBytes());
}

function buildTRA(): string {
  const now = new Date();
  const uniqueId = Math.floor(now.getTime() / 1000);

  const generationTime = new Date(now.getTime() - 10 * 60 * 1000);
  const expirationTime = new Date(now.getTime() + 10 * 60 * 1000);

  const formatDate = (d: Date): string => {
    return d.toISOString().replace(/\.\d{3}Z$/, '-03:00');
  };

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<loginTicketRequest version="1.0">',
    '  <header>',
    `    <uniqueId>${uniqueId}</uniqueId>`,
    `    <generationTime>${formatDate(generationTime)}</generationTime>`,
    `    <expirationTime>${formatDate(expirationTime)}</expirationTime>`,
    '  </header>',
    '  <service>wsfe</service>',
    '</loginTicketRequest>',
  ].join('\n');
}

function parseLoginResponse(xml: string): { token: string; sign: string; expirationTime: string } {
  const tokenMatch = xml.match(/<token>([\s\S]*?)<\/token>/);
  const signMatch = xml.match(/<sign>([\s\S]*?)<\/sign>/);
  const expirationMatch = xml.match(/<expirationTime>([\s\S]*?)<\/expirationTime>/);

  if (!tokenMatch || !signMatch) {
    throw new Error('Failed to parse WSAA login response: token or sign not found');
  }

  return {
    token: tokenMatch[1].trim(),
    sign: signMatch[1].trim(),
    expirationTime: expirationMatch ? expirationMatch[1].trim() : '',
  };
}

class WsaaService {
  private ticket: Ticket | null = null;
  private loginPromise: Promise<Ticket> | null = null;

  async getTicket(): Promise<{ token: string; sign: string }> {
    if (this.ticket && this.isTicketValid()) {
      return { token: this.ticket.token, sign: this.ticket.sign };
    }

    // Prevent concurrent login attempts
    if (this.loginPromise) {
      const ticket = await this.loginPromise;
      return { token: ticket.token, sign: ticket.sign };
    }

    try {
      this.loginPromise = this.login();
      const ticket = await this.loginPromise;
      return { token: ticket.token, sign: ticket.sign };
    } finally {
      this.loginPromise = null;
    }
  }

  private isTicketValid(): boolean {
    if (!this.ticket) return false;
    // Consider ticket invalid 2 minutes before actual expiration
    const safetyMargin = 2 * 60 * 1000;
    return this.ticket.expirationTime.getTime() - safetyMargin > Date.now();
  }

  private async login(): Promise<Ticket> {
    console.log('[WSAA] Initiating login...');

    const certPem = fs.readFileSync(config.afip.certPath, 'utf8');
    const keyPem = fs.readFileSync(config.afip.keyPath, 'utf8');

    const traXml = buildTRA();
    console.log('[WSAA] TRA XML generated');

    const cms = signTRA(traXml, certPem, keyPem);
    console.log('[WSAA] CMS signature created');

    try {
      const client = await soap.createClientAsync(config.afip.wsaaUrl + '?WSDL', {
        namespaceArrayElements: false,
      });

      const [result] = await client.loginCmsAsync({ in0: cms });

      if (!result || !result.loginCmsReturn) {
        throw new Error('Empty response from WSAA');
      }

      const parsed = parseLoginResponse(result.loginCmsReturn);

      const expirationTime = parsed.expirationTime
        ? new Date(parsed.expirationTime)
        : new Date(Date.now() + 10 * 60 * 1000);

      this.ticket = {
        token: parsed.token,
        sign: parsed.sign,
        expirationTime,
      };

      console.log(`[WSAA] Login successful. Token expires at: ${expirationTime.toISOString()}`);

      return this.ticket;
    } catch (error: any) {
      const message = error?.root?.Envelope?.Body?.Fault?.faultstring
        || error?.message
        || 'Unknown WSAA error';
      console.error(`[WSAA] Login failed: ${message}`);
      throw new Error(`WSAA login failed: ${message}`);
    }
  }
}

export const wsaaService = new WsaaService();
