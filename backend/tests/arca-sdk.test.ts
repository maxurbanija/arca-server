import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  Arca,
  IVA_RATES,
  IvaTipo,
  CbteTipo,
  Concepto,
  DocTipo,
  Moneda,
  ArcaError,
  ArcaAuthError,
  ArcaWSFEError,
  ArcaSoapError,
  CondicionIva,
  NOTA_CREDITO_MAP,
  NOTA_DEBITO_MAP,
} from '@ramiidv/arca-facturacion';

// ============================================================
// Tests unitarios (sin certificados ni conexión a AFIP)
// ============================================================

describe('arca-facturacion: constantes y enums', () => {
  it('IVA_RATES mapea todos los IvaTipo a porcentajes correctos', () => {
    expect(IVA_RATES[IvaTipo.IVA_0]).toBe(0);
    expect(IVA_RATES[IvaTipo.IVA_2_5]).toBe(2.5);
    expect(IVA_RATES[IvaTipo.IVA_5]).toBe(5);
    expect(IVA_RATES[IvaTipo.IVA_10_5]).toBe(10.5);
    expect(IVA_RATES[IvaTipo.IVA_21]).toBe(21);
    expect(IVA_RATES[IvaTipo.IVA_27]).toBe(27);
  });

  it('CbteTipo tiene los tipos principales', () => {
    expect(CbteTipo.FACTURA_A).toBe(1);
    expect(CbteTipo.FACTURA_B).toBe(6);
    expect(CbteTipo.FACTURA_C).toBe(11);
    expect(CbteTipo.NOTA_CREDITO_A).toBe(3);
    expect(CbteTipo.NOTA_DEBITO_B).toBe(7);
    expect(CbteTipo.FACTURA_E).toBe(19);
  });

  it('Concepto tiene los 3 valores', () => {
    expect(Concepto.PRODUCTOS).toBe(1);
    expect(Concepto.SERVICIOS).toBe(2);
    expect(Concepto.PRODUCTOS_Y_SERVICIOS).toBe(3);
  });

  it('DocTipo tiene los tipos comunes', () => {
    expect(DocTipo.CUIT).toBe(80);
    expect(DocTipo.DNI).toBe(96);
    expect(DocTipo.CONSUMIDOR_FINAL).toBe(99);
  });

  it('Moneda tiene PES para pesos', () => {
    expect(Moneda.PESOS).toBe('PES');
    expect(Moneda.DOLARES).toBe('DOL');
  });

  it('NOTA_CREDITO_MAP mapea facturas a sus NC correspondientes', () => {
    expect(NOTA_CREDITO_MAP[CbteTipo.FACTURA_A]).toBe(CbteTipo.NOTA_CREDITO_A);
    expect(NOTA_CREDITO_MAP[CbteTipo.FACTURA_B]).toBe(CbteTipo.NOTA_CREDITO_B);
    expect(NOTA_CREDITO_MAP[CbteTipo.FACTURA_C]).toBe(CbteTipo.NOTA_CREDITO_C);
  });

  it('CondicionIva tiene las condiciones principales', () => {
    expect(CondicionIva.RESPONSABLE_INSCRIPTO).toBe(1);
    expect(CondicionIva.EXENTO).toBe(4);
    expect(CondicionIva.CONSUMIDOR_FINAL).toBe(5);
    expect(CondicionIva.MONOTRIBUTISTA).toBe(6);
    expect(CondicionIva.CLIENTE_EXTERIOR).toBe(9);
    expect(CondicionIva.MONOTRIBUTO_SOCIAL).toBe(13);
  });

  it('NOTA_DEBITO_MAP mapea facturas a sus ND correspondientes', () => {
    expect(NOTA_DEBITO_MAP[CbteTipo.FACTURA_A]).toBe(CbteTipo.NOTA_DEBITO_A);
    expect(NOTA_DEBITO_MAP[CbteTipo.FACTURA_B]).toBe(CbteTipo.NOTA_DEBITO_B);
    expect(NOTA_DEBITO_MAP[CbteTipo.FACTURA_C]).toBe(CbteTipo.NOTA_DEBITO_C);
  });
});

describe('arca-facturacion: Arca.formatDate()', () => {
  it('formatea Date a YYYYMMDD', () => {
    const date = new Date('2026-06-15T12:00:00-03:00');
    expect(Arca.formatDate(date)).toBe('20260615');
  });

  it('formatea primer día del año', () => {
    const date = new Date('2026-01-01T12:00:00-03:00');
    expect(Arca.formatDate(date)).toBe('20260101');
  });

  it('formatea último día del año', () => {
    const date = new Date('2026-12-31T12:00:00-03:00');
    expect(Arca.formatDate(date)).toBe('20261231');
  });

  it('acepta string YYYYMMDD y lo devuelve sin cambios', () => {
    expect(Arca.formatDate('20260315')).toBe('20260315');
  });
});

describe('arca-facturacion: Arca.generateQRUrl()', () => {
  it('genera URL válida del QR de AFIP', () => {
    const url = Arca.generateQRUrl({
      fecha: '2026-03-28',
      cuit: 20123456789,
      ptoVta: 1,
      tipoCmp: CbteTipo.FACTURA_B,
      nroCmp: 150,
      importe: 1210,
      moneda: 'PES',
      ctz: 1,
      tipoDocRec: DocTipo.CONSUMIDOR_FINAL,
      nroDocRec: 0,
      codAut: 73429843294823,
    });

    expect(url).toContain('https://www.afip.gob.ar/fe/qr/');
    expect(typeof url).toBe('string');
  });

  it('genera URLs distintas para datos distintos', () => {
    const base = {
      fecha: '2026-03-28',
      cuit: 20123456789,
      ptoVta: 1,
      tipoCmp: CbteTipo.FACTURA_B,
      nroCmp: 150,
      importe: 1210,
      moneda: 'PES',
      ctz: 1,
      tipoDocRec: DocTipo.CONSUMIDOR_FINAL,
      nroDocRec: 0,
      codAut: 73429843294823,
    };

    const url1 = Arca.generateQRUrl(base);
    const url2 = Arca.generateQRUrl({ ...base, nroCmp: 151 });
    expect(url1).not.toBe(url2);
  });
});

describe('arca-facturacion: Arca.calcularTotales()', () => {
  it('calcula totales para items con IVA 21%', () => {
    const { importes, iva } = Arca.calcularTotales([
      { neto: 1000, iva: IvaTipo.IVA_21 },
    ]);

    expect(importes.neto).toBe(1000);
    expect(importes.iva).toBe(210);
    expect(importes.total).toBe(1210);
    expect(importes.exento).toBe(0);
    expect(importes.noGravado).toBe(0);
    expect(importes.tributos).toBe(0);

    expect(iva).toHaveLength(1);
    expect(iva[0]).toEqual({ Id: IvaTipo.IVA_21, BaseImp: 1000, Importe: 210 });
  });

  it('calcula totales con múltiples alícuotas', () => {
    const { importes, iva } = Arca.calcularTotales([
      { neto: 1000, iva: IvaTipo.IVA_21 },
      { neto: 500, iva: IvaTipo.IVA_10_5 },
    ]);

    expect(importes.neto).toBe(1500);
    expect(importes.iva).toBe(262.5);
    expect(importes.total).toBe(1762.5);

    expect(iva).toHaveLength(2);
    const iva21 = iva.find((a) => a.Id === IvaTipo.IVA_21);
    const iva105 = iva.find((a) => a.Id === IvaTipo.IVA_10_5);
    expect(iva21).toEqual({ Id: IvaTipo.IVA_21, BaseImp: 1000, Importe: 210 });
    expect(iva105).toEqual({ Id: IvaTipo.IVA_10_5, BaseImp: 500, Importe: 52.5 });
  });

  it('agrupa items con la misma alícuota', () => {
    const { importes, iva } = Arca.calcularTotales([
      { neto: 300, iva: IvaTipo.IVA_21 },
      { neto: 700, iva: IvaTipo.IVA_21 },
    ]);

    expect(importes.neto).toBe(1000);
    expect(importes.iva).toBe(210);
    expect(iva).toHaveLength(1);
    expect(iva[0].BaseImp).toBe(1000);
    expect(iva[0].Importe).toBe(210);
  });

  it('maneja items exentos', () => {
    const { importes, iva } = Arca.calcularTotales([
      { neto: 500, exento: true },
    ]);

    expect(importes.exento).toBe(500);
    expect(importes.neto).toBe(0);
    expect(importes.iva).toBe(0);
    expect(importes.total).toBe(500);
    expect(iva).toHaveLength(0);
  });

  it('maneja items no gravados (sin iva ni exento)', () => {
    const { importes } = Arca.calcularTotales([
      { neto: 300 },
    ]);

    expect(importes.noGravado).toBe(300);
    expect(importes.neto).toBe(0);
    expect(importes.total).toBe(300);
  });

  it('mezcla gravados, exentos y no gravados', () => {
    const { importes } = Arca.calcularTotales([
      { neto: 1000, iva: IvaTipo.IVA_21 },
      { neto: 500, exento: true },
      { neto: 200 },
    ]);

    expect(importes.neto).toBe(1000);
    expect(importes.iva).toBe(210);
    expect(importes.exento).toBe(500);
    expect(importes.noGravado).toBe(200);
    expect(importes.total).toBe(1910);
  });

  it('tipo C no discrimina IVA', () => {
    const { importes, iva } = Arca.calcularTotales(
      [{ neto: 1000, iva: IvaTipo.IVA_21 }],
      { tipoC: true },
    );

    expect(importes.neto).toBe(1000);
    expect(importes.iva).toBe(0);
    expect(importes.total).toBe(1000);
    expect(iva).toHaveLength(0);
  });

  it('item con iva y exento: exento tiene prioridad', () => {
    const { importes } = Arca.calcularTotales([{ neto: 500, iva: IvaTipo.IVA_21, exento: true }]);
    expect(importes.exento).toBe(500);
    expect(importes.iva).toBe(0);
  });

  it('lanza error para IvaTipo desconocido', () => {
    expect(() => {
      Arca.calcularTotales([{ neto: 100, iva: 999 }]);
    }).toThrow();
  });

  it('IVA 0% genera alícuota con importe 0', () => {
    const { importes, iva } = Arca.calcularTotales([
      { neto: 1000, iva: IvaTipo.IVA_0 },
    ]);

    expect(importes.neto).toBe(1000);
    expect(importes.iva).toBe(0);
    expect(importes.total).toBe(1000);
    expect(iva).toHaveLength(1);
    expect(iva[0]).toEqual({ Id: IvaTipo.IVA_0, BaseImp: 1000, Importe: 0 });
  });

  it('incluye tributos en el total', () => {
    const { importes } = Arca.calcularTotales(
      [{ neto: 1000, iva: IvaTipo.IVA_21 }],
      { tributos: [{ Importe: 50 }, { Importe: 30 }] },
    );

    expect(importes.tributos).toBe(80);
    expect(importes.total).toBe(1290); // 1000 + 210 + 80
  });
});

describe('arca-facturacion: Arca.extractCAE()', () => {
  it('extrae CAE de resultado aprobado', () => {
    const mockResult = {
      FeCabResp: {
        Cuit: 20000000000,
        PtoVta: 1,
        CbteTipo: 6,
        FchProceso: '20260328',
        CantReg: 1,
        Resultado: 'A' as const,
        Reproceso: 'N',
      },
      FeDetResp: {
        FECAEDetResponse: {
          Concepto: 1,
          DocTipo: 99,
          DocNro: 0,
          CbteDesde: 1,
          CbteHasta: 1,
          CbteFch: '20260328',
          Resultado: 'A' as const,
          CAE: '12345678901234',
          CAEFchVto: '20260407',
        },
      },
    };

    const extracted = Arca.extractCAE(mockResult);
    expect(extracted.approved).toBe(true);
    expect(extracted.cae).toBe('12345678901234');
    expect(extracted.caeFchVto).toBe('20260407');
    expect(extracted.details).toHaveLength(1);
  });

  it('maneja resultado rechazado', () => {
    const mockResult = {
      FeCabResp: {
        Cuit: 20000000000,
        PtoVta: 1,
        CbteTipo: 6,
        FchProceso: '20260328',
        CantReg: 1,
        Resultado: 'R' as const,
        Reproceso: 'N',
      },
      FeDetResp: {
        FECAEDetResponse: {
          Concepto: 1,
          DocTipo: 99,
          DocNro: 0,
          CbteDesde: 1,
          CbteHasta: 1,
          CbteFch: '20260328',
          Resultado: 'R' as const,
          CAE: '',
          CAEFchVto: '',
          Observaciones: {
            Obs: { Code: 10016, Msg: 'Error en datos' },
          },
        },
      },
    };

    const extracted = Arca.extractCAE(mockResult);
    expect(extracted.approved).toBe(false);
    expect(extracted.cae).toBeUndefined();
    expect(extracted.details[0].Observaciones?.Obs).toBeDefined();
  });

  it('maneja array de FECAEDetResponse', () => {
    const mockResult = {
      FeCabResp: {
        Cuit: 20000000000,
        PtoVta: 1,
        CbteTipo: 6,
        FchProceso: '20260328',
        CantReg: 2,
        Resultado: 'A' as const,
        Reproceso: 'N',
      },
      FeDetResp: {
        FECAEDetResponse: [
          {
            Concepto: 1, DocTipo: 99, DocNro: 0,
            CbteDesde: 1, CbteHasta: 1, CbteFch: '20260328',
            Resultado: 'A' as const, CAE: '11111111111111', CAEFchVto: '20260407',
          },
          {
            Concepto: 1, DocTipo: 99, DocNro: 0,
            CbteDesde: 2, CbteHasta: 2, CbteFch: '20260328',
            Resultado: 'A' as const, CAE: '22222222222222', CAEFchVto: '20260407',
          },
        ],
      },
    };

    const extracted = Arca.extractCAE(mockResult);
    expect(extracted.approved).toBe(true);
    expect(extracted.details).toHaveLength(2);
    expect(extracted.cae).toBe('11111111111111');
  });
});

describe('arca-facturacion: error classes', () => {
  it('ArcaError es instancia de Error', () => {
    const err = new ArcaError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ArcaError);
    expect(err.name).toBe('ArcaError');
  });

  it('ArcaAuthError extiende ArcaError', () => {
    const err = new ArcaAuthError('auth failed');
    expect(err).toBeInstanceOf(ArcaError);
    expect(err).toBeInstanceOf(ArcaAuthError);
    expect(err.name).toBe('ArcaAuthError');
  });

  it('ArcaWSFEError tiene array de errors estructurado', () => {
    const err = new ArcaWSFEError([
      { code: 10016, msg: 'DocNro invalido' },
      { code: 10017, msg: 'Fecha invalida' },
    ]);
    expect(err).toBeInstanceOf(ArcaError);
    expect(err.errors).toHaveLength(2);
    expect(err.errors[0].code).toBe(10016);
    expect(err.message).toContain('[10016]');
    expect(err.message).toContain('[10017]');
  });

  it('ArcaSoapError tiene statusCode', () => {
    const err = new ArcaSoapError('timeout', 408);
    expect(err).toBeInstanceOf(ArcaError);
    expect(err.statusCode).toBe(408);
  });

  it('ArcaSoapError sin statusCode', () => {
    const err = new ArcaSoapError('network error');
    expect(err.statusCode).toBeUndefined();
    expect(err.message).toBe('network error');
  });
});

// ============================================================
// Tests de integración (requieren certificados y conexión a AFIP)
// ============================================================

describe('arca-facturacion: integración con AFIP homologación', () => {
  const certPath = path.resolve(__dirname, '../certs/cert.crt');
  const keyPath = path.resolve(__dirname, '../certs/key.key');
  const cuit = process.env.AFIP_CUIT;

  let arca: Arca;
  let canRun = false;

  beforeAll(() => {
    const certExists = fs.existsSync(certPath) && fs.statSync(certPath).size > 0;
    const keyExists = fs.existsSync(keyPath) && fs.statSync(keyPath).size > 0;

    if (!certExists || !keyExists || !cuit) {
      console.warn(
        '\n⚠ Skipping integration tests: missing certs or AFIP_CUIT env var.\n' +
        '  Place valid cert.crt and key.key in backend/certs/\n' +
        '  and set AFIP_CUIT in your environment.\n'
      );
      return;
    }

    canRun = true;
    arca = new Arca({
      cuit: Number(cuit),
      cert: fs.readFileSync(certPath, 'utf8'),
      key: fs.readFileSync(keyPath, 'utf8'),
      production: false,
    });
  });

  it('serverStatus responde OK', async () => {
    if (!canRun) return;

    const status = await arca.serverStatus();
    expect(status.AppServer).toBeDefined();
    expect(status.DbServer).toBeDefined();
    expect(status.AuthServer).toBeDefined();
  });

  it('getTiposComprobante devuelve lista no vacía', async () => {
    if (!canRun) return;

    const tipos = await arca.getTiposComprobante();
    expect(tipos.length).toBeGreaterThan(0);
    expect(tipos[0]).toHaveProperty('Id');
    expect(tipos[0]).toHaveProperty('Desc');
  });

  it('getTiposDocumento devuelve lista no vacía', async () => {
    if (!canRun) return;

    const tipos = await arca.getTiposDocumento();
    expect(tipos.length).toBeGreaterThan(0);
    const cuitType = tipos.find((t) => t.Id === DocTipo.CUIT);
    expect(cuitType).toBeDefined();
  });

  it('getTiposIva devuelve las 6 alícuotas', async () => {
    if (!canRun) return;

    const tipos = await arca.getTiposIva();
    expect(tipos.length).toBeGreaterThanOrEqual(6);
    const iva21 = tipos.find((t) => t.Id === IvaTipo.IVA_21);
    expect(iva21).toBeDefined();
  });

  it('getTiposConcepto devuelve los 3 conceptos', async () => {
    if (!canRun) return;

    const tipos = await arca.getTiposConcepto();
    expect(tipos.length).toBe(3);
  });

  it('getMonedas devuelve lista con PES', async () => {
    if (!canRun) return;

    const monedas = await arca.getMonedas();
    expect(monedas.length).toBeGreaterThan(0);
    const pesos = monedas.find((m) => m.Id === Moneda.PESOS);
    expect(pesos).toBeDefined();
  });

  it('getPuntosVenta devuelve lista', async () => {
    if (!canRun) return;

    const puntos = await arca.getPuntosVenta();
    expect(Array.isArray(puntos)).toBe(true);
  });

  it('ultimoComprobante devuelve un número >= 0', async () => {
    if (!canRun) return;

    const ultimo = await arca.ultimoComprobante(1, CbteTipo.FACTURA_B);
    expect(typeof ultimo).toBe('number');
    expect(ultimo).toBeGreaterThanOrEqual(0);
  });

  it('siguienteComprobante es ultimo + 1', async () => {
    if (!canRun) return;

    const ultimo = await arca.ultimoComprobante(1, CbteTipo.FACTURA_B);
    const siguiente = await arca.siguienteComprobante(1, CbteTipo.FACTURA_B);
    expect(siguiente).toBe(ultimo + 1);
  });

  it('facturar crea una Factura B con CAE', async () => {
    if (!canRun) return;

    const result = await arca.facturar({
      ptoVta: 1,
      cbteTipo: CbteTipo.FACTURA_B,
      concepto: Concepto.PRODUCTOS,
      items: [
        { neto: 1000, iva: IvaTipo.IVA_21 },
      ],
    });

    expect(result.aprobada).toBe(true);
    expect(result.cae).toBeDefined();
    expect(result.cae!.length).toBe(14);
    expect(result.caeVencimiento).toBeDefined();
    expect(result.cbteNro).toBeGreaterThan(0);
    expect(result.importes.neto).toBe(1000);
    expect(result.importes.iva).toBe(210);
    expect(result.importes.total).toBe(1210);

    // Verificar que se puede generar QR con el resultado
    const qrUrl = Arca.generateQRUrl({
      fecha: '2026-03-28',
      cuit: Number(cuit),
      ptoVta: result.ptoVta,
      tipoCmp: result.cbteTipo,
      nroCmp: result.cbteNro,
      importe: result.importes.total,
      moneda: 'PES',
      ctz: 1,
      tipoDocRec: DocTipo.CONSUMIDOR_FINAL,
      nroDocRec: 0,
      codAut: Number(result.cae),
    });
    expect(qrUrl).toContain('https://www.afip.gob.ar/fe/qr/');
  });

  it('consultarComprobante recupera la factura recién creada', async () => {
    if (!canRun) return;

    const ultimo = await arca.ultimoComprobante(1, CbteTipo.FACTURA_B);
    const consulta = await arca.consultarComprobante(CbteTipo.FACTURA_B, 1, ultimo);

    expect(consulta.ResultGet).toBeDefined();
    expect(consulta.ResultGet.CodAutorizacion).toBeDefined();
    expect(consulta.ResultGet.Resultado).toBe('A');
  });

  it('facturar Factura C (monotributista) no discrimina IVA', async () => {
    if (!canRun) return;

    const result = await arca.facturar({
      ptoVta: 1,
      cbteTipo: CbteTipo.FACTURA_C,
      concepto: Concepto.PRODUCTOS,
      items: [
        { neto: 500, iva: IvaTipo.IVA_21 },
      ],
    });

    expect(result.aprobada).toBe(true);
    expect(result.importes.neto).toBe(500);
    expect(result.importes.iva).toBe(0);
    expect(result.importes.total).toBe(500);
  });

  it('facturar con servicios incluye fechas de servicio', async () => {
    if (!canRun) return;

    const today = Arca.formatDate(new Date());
    const result = await arca.facturar({
      ptoVta: 1,
      cbteTipo: CbteTipo.FACTURA_B,
      items: [
        { neto: 2000, iva: IvaTipo.IVA_21 },
      ],
      servicio: {
        desde: today,
        hasta: today,
        vtoPago: today,
      },
    });

    expect(result.aprobada).toBe(true);
    expect(result.cae).toBeDefined();
  });

  it('notaCredito asociada a un comprobante', async () => {
    if (!canRun) return;

    const factura = await arca.facturar({
      ptoVta: 1,
      cbteTipo: CbteTipo.FACTURA_B,
      concepto: Concepto.PRODUCTOS,
      items: [{ neto: 100, iva: IvaTipo.IVA_21 }],
    });
    expect(factura.aprobada).toBe(true);

    const nc = await arca.notaCredito({
      ptoVta: 1,
      comprobanteOriginal: {
        tipo: CbteTipo.FACTURA_B,
        ptoVta: 1,
        nro: factura.cbteNro,
      },
      items: [{ neto: 100, iva: IvaTipo.IVA_21 }],
    });

    expect(nc.aprobada).toBe(true);
    expect(nc.cbteTipo).toBe(CbteTipo.NOTA_CREDITO_B);
    expect(nc.cae).toBeDefined();
  });

  it('consultarCuit devuelve datos del contribuyente', async () => {
    if (!canRun) return;

    const contribuyente = await arca.consultarCuit(Number(cuit));
    expect(contribuyente.cuit).toBe(Number(cuit));
    expect(contribuyente.nombre).toBeDefined();
    expect(contribuyente.tipoPersona).toBeDefined();
    expect(contribuyente.estadoClave).toBeDefined();
  });

  it('serverStatusExpo responde OK', async () => {
    if (!canRun) return;

    const status = await arca.serverStatusExpo();
    expect(status.AppServer).toBeDefined();
    expect(status.DbServer).toBeDefined();
    expect(status.AuthServer).toBeDefined();
  });
});
