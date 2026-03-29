import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { createCertificate } from 'arca-cert';
import { arca, reloadArca } from '../services/arca.service';
import { config } from '../config';

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

// GET /contribuyente/:cuit - Taxpayer info from padrón
router.get('/contribuyente/:cuit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cuit = parseInt(req.params.cuit as string, 10);
    if (isNaN(cuit)) {
      res.status(400).json({ success: false, error: 'CUIT must be a number' });
      return;
    }

    const contribuyente = await arca.consultarCuit(cuit);
    res.json({ success: true, data: contribuyente });
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
      environment: environment || 'testing',
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

export default router;
