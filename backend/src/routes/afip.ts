import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { createCertificate, renewCertificate, getCertExpiry, authenticate } from 'arca-cert';
import { arca, padron, cdc, fecred, mtxca, sire, agro, reloadArca } from '../services/arca.service';
import { ArcaEmpleados } from '@ramiidv/arca-empleados';

const router = Router();

// GET /status - WSFE server status
router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await arca.serverStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

// GET /invoice-types - Available invoice types
router.get('/invoice-types', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await arca.getTiposComprobante();
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
});

// GET /doc-types - Document types
router.get('/doc-types', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await arca.getTiposDocumento();
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
});

// GET /iva-types - IVA aliquot types
router.get('/iva-types', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await arca.getTiposIva();
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
});

// GET /concept-types - Concept types
router.get('/concept-types', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await arca.getTiposConcepto();
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
});

// GET /optional-types - Optional types
router.get('/optional-types', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await arca.getTiposOpcional();
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
});

// GET /currency-types - Currency types
router.get('/currency-types', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await arca.getMonedas();
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
});

// GET /puntos-venta - Available sales points
router.get('/puntos-venta', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const puntosVenta = await arca.getPuntosVenta();
    res.json({ success: true, data: puntosVenta });
  } catch (error) {
    next(error);
  }
});

// GET /contribuyente/:cuit - Taxpayer info from padrón A4 (full)
router.get('/contribuyente/:cuit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cuit = req.params.cuit as string;
    if (!cuit || cuit.length < 11) {
      res.status(400).json({ success: false, error: 'CUIT must be 11 digits' });
      return;
    }

    const persona = await padron.getPersona(cuit);
    res.json({ success: true, data: persona });
  } catch (error) {
    next(error);
  }
});

// GET /contribuyente-basic/:cuit - Taxpayer basic info from padrón A10
router.get('/contribuyente-basic/:cuit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cuit = req.params.cuit as string;
    if (!cuit || cuit.length < 11) {
      res.status(400).json({ success: false, error: 'CUIT must be 11 digits' });
      return;
    }

    const persona = await padron.getPersonaBasic(cuit);
    res.json({ success: true, data: persona });
  } catch (error) {
    next(error);
  }
});

// GET /padron-status - Padrón services health check
router.get('/padron-status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await padron.status();
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

// POST /constatar - Verify a comprobante via WSCDC
router.post('/constatar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await cdc.constatar(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /cdc-status - WSCDC health check
router.get('/cdc-status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await cdc.status();
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

// GET /cdc-tipos-cbte - WSCDC voucher types
router.get('/cdc-tipos-cbte', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tipos = await cdc.getTiposCbte();
    res.json({ success: true, data: tipos });
  } catch (error) {
    next(error);
  }
});

// GET /last-voucher - Last authorized voucher
router.get('/last-voucher', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const puntoVenta = parseInt(req.query.puntoVenta as string, 10);
    const cbteTipo = parseInt(req.query.cbteTipo as string, 10);

    if (isNaN(puntoVenta) || isNaN(cbteTipo)) {
      res.status(400).json({
        success: false,
        error: 'puntoVenta and cbteTipo query parameters are required and must be numbers',
      });
      return;
    }

    const cbteNro = await arca.ultimoComprobante(puntoVenta, cbteTipo);
    res.json({
      success: true,
      data: { CbteNro: cbteNro, PtoVta: puntoVenta, CbteTipo: cbteTipo },
    });
  } catch (error) {
    next(error);
  }
});

// GET /comprobante - Query invoice from AFIP
router.get('/comprobante', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const puntoVenta = parseInt(req.query.puntoVenta as string, 10);
    const cbteTipo = parseInt(req.query.cbteTipo as string, 10);
    const cbteNro = parseInt(req.query.cbteNro as string, 10);

    if (isNaN(puntoVenta) || isNaN(cbteTipo) || isNaN(cbteNro)) {
      res.status(400).json({
        success: false,
        error: 'puntoVenta, cbteTipo and cbteNro query parameters are required and must be numbers',
      });
      return;
    }

    const comprobante = await arca.consultarComprobante(cbteTipo, puntoVenta, cbteNro);
    res.json({ success: true, data: comprobante.ResultGet });
  } catch (error) {
    next(error);
  }
});

// GET /cotizacion - Currency exchange rate
router.get('/cotizacion', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const monedaId = req.query.monedaId as string;

    if (!monedaId) {
      res.status(400).json({
        success: false,
        error: 'monedaId query parameter is required',
      });
      return;
    }

    const cotizacion = await arca.getCotizacion(monedaId);
    res.json({ success: true, data: cotizacion });
  } catch (error) {
    next(error);
  }
});

// GET /iva-conditions - IVA conditions (Responsable Inscripto, Monotributista, etc.)
router.get('/iva-conditions', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await arca.getCondicionesIva();
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
});

// GET /tributo-types - Tributo types
router.get('/tributo-types', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await arca.getTiposTributo();
    res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
});

// POST /generate-cert - Generate AFIP certificate using arca-cert
router.post('/generate-cert', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cuit, password, alias, environment } = req.body;

    if (!cuit || !password || !alias) {
      res.status(400).json({
        success: false,
        error: 'cuit, password, and alias are required',
      });
      return;
    }

    const result = await createCertificate({
      cuit: String(cuit),
      password: String(password),
      alias: String(alias),
      environment: environment || 'production',
    });

    // Save cert and key to disk
    const certsDir = path.resolve(__dirname, '../../certs');
    fs.mkdirSync(certsDir, { recursive: true });
    fs.writeFileSync(path.join(certsDir, 'cert.crt'), result.cert);
    fs.writeFileSync(path.join(certsDir, 'key.key'), result.key, { mode: 0o600 });

    // Reload SDK with new certs, matching the cert's environment
    reloadArca(result.environment === 'production');

    res.json({
      success: true,
      data: {
        alias: result.alias,
        cuit: result.cuit,
        environment: result.environment,
        certPath: path.join(certsDir, 'cert.crt'),
        keyPath: path.join(certsDir, 'key.key'),
        message: 'Certificado generado y activado.',
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /renew-cert - Renew AFIP certificate
router.post('/renew-cert', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cuit, password, alias, environment } = req.body;

    if (!cuit || !password || !alias) {
      res.status(400).json({ success: false, error: 'cuit, password, and alias are required' });
      return;
    }

    const result = await renewCertificate({
      cuit: String(cuit),
      password: String(password),
      alias: String(alias),
      environment: environment || 'production',
    });

    const certsDir = path.resolve(__dirname, '../../certs');
    fs.mkdirSync(certsDir, { recursive: true });
    fs.writeFileSync(path.join(certsDir, 'cert.crt'), result.cert);
    fs.writeFileSync(path.join(certsDir, 'key.key'), result.key, { mode: 0o600 });

    reloadArca(result.environment === 'production');

    res.json({
      success: true,
      data: {
        alias: result.alias,
        cuit: result.cuit,
        environment: result.environment,
        message: 'Certificado renovado y activado.',
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /cert-info - Get current certificate expiry info
router.get('/cert-info', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const certPath = path.resolve(__dirname, '../../certs/cert.crt');
    if (!fs.existsSync(certPath)) {
      res.json({ success: true, data: null });
      return;
    }

    const certPem = fs.readFileSync(certPath, 'utf8');
    if (!certPem.includes('BEGIN CERTIFICATE')) {
      res.json({ success: true, data: null });
      return;
    }

    const expiry = getCertExpiry(certPem);
    const now = new Date();
    const daysLeft = Math.floor((expiry.notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      data: {
        notBefore: expiry.notBefore.toISOString(),
        notAfter: expiry.notAfter.toISOString(),
        daysLeft,
        expired: daysLeft < 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /test-cert - Test current certificate against WSAA
router.post('/test-cert', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { environment } = req.body;
    const certPath = path.resolve(__dirname, '../../certs/cert.crt');
    const keyPath = path.resolve(__dirname, '../../certs/key.key');

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
      res.status(400).json({ success: false, error: 'No hay certificado instalado' });
      return;
    }

    const cert = fs.readFileSync(certPath, 'utf8');
    const key = fs.readFileSync(keyPath, 'utf8');

    const credentials = await authenticate({
      cert,
      key,
      service: 'wsfe',
      environment: environment || 'production',
    });

    res.json({
      success: true,
      data: {
        valid: true,
        expirationTime: credentials.expirationTime.toISOString(),
        message: 'Certificado válido. Autenticación con WSAA exitosa.',
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// FECRED — Factura de Crédito Electrónica MiPyME
// ============================================================

// GET /fecred-status - WSFECRED health check
router.get('/fecred-status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await fecred.status();
    res.json({ success: true, data: status });
  } catch (error) { next(error); }
});

// GET /fecred-obligado/:cuit - Check if CUIT is obligated to receive FCE
router.get('/fecred-obligado/:cuit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await fecred.consultarMontoObligadoRecepcion(req.params.cuit as string);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// POST /fecred-ctas-ctes - Query FCE current accounts
router.post('/fecred-ctas-ctes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await fecred.consultarCtasCtes(req.body);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// POST /fecred-aceptar - Accept an FCE
router.post('/fecred-aceptar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await fecred.aceptarFECred(req.body.codCtaCte);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// POST /fecred-rechazar - Reject an FCE
router.post('/fecred-rechazar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await fecred.rechazarFECred(req.body.codCtaCte, req.body.codMotivoRechazo);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// ============================================================
// MTXCA — Facturación con detalle de artículos
// ============================================================

// GET /mtxca-status - WSMTXCA health check
router.get('/mtxca-status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await mtxca.status();
    res.json({ success: true, data: status });
  } catch (error) { next(error); }
});

// POST /mtxca-autorizar - Authorize invoice with item detail
router.post('/mtxca-autorizar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await mtxca.autorizar(req.body);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// GET /mtxca-ultimo-comprobante - Last authorized voucher (MTXCA)
router.get('/mtxca-ultimo-comprobante', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ptoVta = parseInt(req.query.puntoVenta as string, 10);
    const cbteTipo = parseInt(req.query.cbteTipo as string, 10);
    if (isNaN(ptoVta) || isNaN(cbteTipo)) {
      res.status(400).json({ success: false, error: 'puntoVenta and cbteTipo required' });
      return;
    }
    const cbteNro = await mtxca.ultimoComprobante(ptoVta, cbteTipo);
    res.json({ success: true, data: { CbteNro: cbteNro } });
  } catch (error) { next(error); }
});

// ============================================================
// SIRE — Retenciones Electrónicas
// ============================================================

// GET /sire-status - SIRE health check
router.get('/sire-status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await sire.status();
    res.json({ success: true, data: status });
  } catch (error) { next(error); }
});

// POST /sire-retencion - Register a retention
router.post('/sire-retencion', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await sire.registrarRetencion(req.body);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// POST /sire-consultar - Query retentions by period
router.post('/sire-consultar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await sire.consultarRetenciones(req.body);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// DELETE /sire-anular/:nroComprobante - Cancel a retention
router.delete('/sire-anular/:nroComprobante', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await sire.anularRetencion(req.params.nroComprobante as string);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// GET /sire-regimenes - Query applicable regimes
router.get('/sire-regimenes', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await sire.consultarRegimenes();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// ============================================================
// AGRO — Servicios Agropecuarios
// ============================================================

// GET /agro-status - All agro services health check
router.get('/agro-status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await agro.serverStatus();
    res.json({ success: true, data: status });
  } catch (error) { next(error); }
});

// POST /agro-cpe-autorizar - Authorize Carta de Porte automotor
router.post('/agro-cpe-autorizar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await agro.cpe.autorizarCPEAutomotor(req.body);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// POST /agro-ctg-solicitar - Request initial CTG
router.post('/agro-ctg-solicitar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await agro.ctg.solicitarCTGInicial(req.body);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// POST /agro-lpg-autorizar - Authorize grain settlement
router.post('/agro-lpg-autorizar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await agro.lpg.liquidacionAutorizar(req.body);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// ============================================================
// EMPLEADOS — Generación de archivos F935
// ============================================================

// POST /empleados-generar - Generate F935 file
router.post('/empleados-generar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cuitEmpleador, registros } = req.body;
    if (!cuitEmpleador || !registros) {
      res.status(400).json({ success: false, error: 'cuitEmpleador and registros required' });
      return;
    }

    const builder = new ArcaEmpleados({ cuitEmpleador });

    for (const reg of registros) {
      switch (reg.tipo) {
        case 'alta': builder.alta(reg.data); break;
        case 'baja': builder.baja(reg.data); break;
        case 'modificacion': builder.modificacion(reg.data); break;
        case 'datosComplementarios': builder.datosComplementarios(reg.data); break;
        case 'cbu': builder.cbu(reg.data); break;
        case 'relacionFamiliar': builder.relacionFamiliar(reg.data); break;
        case 'domicilio': builder.domicilioExplotacion(reg.data); break;
      }
    }

    const output = builder.generar();
    res.json({ success: true, data: output });
  } catch (error) { next(error); }
});

export default router;
