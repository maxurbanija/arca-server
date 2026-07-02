import { Prisma } from '../generated/prisma/client';
import { Arca, IVA_RATES, Concepto, DocTipo } from '@ramiidv/arca-facturacion';
import type { FacturarOpts, LineItem, FacturaResult } from '@ramiidv/arca-facturacion';
import { prisma } from '../lib/prisma';
import { arca } from './arca.service';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  ivaId: number;
}

interface CreateInvoiceInput {
  cbteTipo: number;
  clientId?: number;
  docTipo: number;
  docNro: string;
  condicionIva?: number;
  concepto?: number;
  puntoVenta: number;
  items: InvoiceItemInput[];
  fchServDesde?: string;
  fchServHasta?: string;
  fchVtoPago?: string;
  observations?: string;
}

interface CreateNotaCreditoInput {
  originalInvoiceId: number;
  puntoVenta: number;
  concepto?: number;
  condicionIva?: number;
  items: InvoiceItemInput[];
  fchServDesde?: string;
  fchServHasta?: string;
  fchVtoPago?: string;
  observations?: string;
}

interface CreateNotaDebitoInput {
  originalInvoiceId: number;
  puntoVenta: number;
  concepto?: number;
  condicionIva?: number;
  items: InvoiceItemInput[];
  fchServDesde?: string;
  fchServHasta?: string;
  fchVtoPago?: string;
  observations?: string;
}

interface InvoiceFilters {
  page?: number;
  limit?: number;
  cbteTipo?: number;
  clientId?: number;
  from?: string;
  to?: string;
}

function roundTwo(n: number): number {
  return Math.round(n * 100) / 100;
}

function processItemsForDB(items: InvoiceItemInput[]) {
  return items.map((item) => {
    const ivaRate = IVA_RATES[item.ivaId as keyof typeof IVA_RATES];
    if (ivaRate === undefined) {
      throw new AppError(
        400,
        `Invalid IVA ID: ${item.ivaId}. Valid IDs: ${Object.keys(IVA_RATES).join(', ')}`,
      );
    }
    const subtotal = roundTwo(item.quantity * item.unitPrice);
    const ivaAmount = roundTwo(subtotal * (ivaRate / 100));

    return {
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      ivaId: item.ivaId,
      ivaRate,
      subtotal,
      ivaAmount,
    };
  });
}

// @ramiidv/arca-facturacion descarta silenciosamente el `iva` de un LineItem que
// también trae `exento: true` (gana `exento` por el orden del if/else if del SDK).
// Todo LineItem que se manda al SDK debe armarse acá, sin `exento`, para que ese
// conflicto no pueda ocurrir.
function toLineItems(items: ReturnType<typeof processItemsForDB>): LineItem[] {
  return items.map((item) => ({
    neto: item.subtotal,
    iva: item.ivaId,
  }));
}

// La condición de IVA del receptor es obligatoria para AFIP desde abril 2026,
// salvo consumidor final sin identificar (docTipo 99). Se resuelve: valor
// explícito del body → ivaCondition del cliente asociado → error claro.
async function resolveCondicionIva(
  explicit: number | undefined,
  clientId: number | null | undefined,
  docTipo: number,
): Promise<number | undefined> {
  if (explicit != null) return explicit;
  if (clientId != null) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { ivaCondition: true },
    });
    if (client) return client.ivaCondition;
  }
  if (docTipo === DocTipo.CONSUMIDOR_FINAL) return undefined;
  throw new AppError(
    400,
    'condicionIva es requerida para receptores identificados (obligatoria para AFIP desde abril 2026): enviala en el body o asociá un clientId con condición de IVA cargada.',
  );
}

class InvoiceService {
  async createInvoice(data: CreateInvoiceInput) {
    const processedItems = processItemsForDB(data.items);

    const lineItems = toLineItems(processedItems);

    const condicionIva = await resolveCondicionIva(data.condicionIva, data.clientId, data.docTipo);
    const concepto = data.concepto ?? Concepto.SERVICIOS;
    const esServicio = concepto === Concepto.SERVICIOS || concepto === Concepto.PRODUCTOS_Y_SERVICIOS;
    const today = Arca.formatDate(new Date());

    const opts: FacturarOpts = {
      ptoVta: data.puntoVenta,
      cbteTipo: data.cbteTipo,
      items: lineItems,
      concepto,
      docTipo: data.docTipo,
      docNro: Number(data.docNro),
      condicionIva,
      ...(esServicio && {
        servicio: {
          desde: data.fchServDesde || today,
          hasta: data.fchServHasta || today,
          vtoPago: data.fchVtoPago || today,
        },
      }),
    };

    const result = await arca.facturar(opts);

    if (!result.aprobada) {
      const obsMsg =
        result.observaciones.length > 0
          ? result.observaciones.map((o) => `${o.code}: ${o.msg}`).join('; ')
          : 'Unknown reason';
      throw new AppError(400, `AFIP rejected invoice: ${obsMsg}`);
    }

    let qrUrl: string | undefined;
    if (result.cae) {
      const cbteFchFormatted = `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`;
      qrUrl = Arca.generateQRUrl({
        fecha: cbteFchFormatted,
        cuit: Number(config.afip.cuit),
        ptoVta: result.ptoVta,
        tipoCmp: result.cbteTipo,
        nroCmp: result.cbteNro,
        importe: result.importes.total,
        moneda: 'PES',
        ctz: 1,
        tipoDocRec: data.docTipo,
        nroDocRec: Number(data.docNro),
        codAut: Number(result.cae),
      });
    }

    const invoice = await prisma.invoice.create({
      data: {
        cbteTipo: result.cbteTipo,
        puntoVenta: result.ptoVta,
        cbteNro: result.cbteNro,
        cbteDesde: result.cbteNro,
        cbteHasta: result.cbteNro,
        cbteFch: today,
        concepto,
        docTipo: data.docTipo,
        docNro: data.docNro,
        impTotal: new Prisma.Decimal(result.importes.total),
        impTotConc: new Prisma.Decimal(result.importes.noGravado),
        impNeto: new Prisma.Decimal(result.importes.neto),
        impOpEx: new Prisma.Decimal(result.importes.exento),
        impIVA: new Prisma.Decimal(result.importes.iva),
        impTrib: new Prisma.Decimal(result.importes.tributos),
        cae: result.cae || '',
        caeFchVto: result.caeVencimiento || '',
        resultado: result.aprobada ? 'A' : 'R',
        monId: 'PES',
        monCotiz: new Prisma.Decimal(1),
        fchServDesde: data.fchServDesde || (esServicio ? today : undefined),
        fchServHasta: data.fchServHasta || (esServicio ? today : undefined),
        fchVtoPago: data.fchVtoPago || (esServicio ? today : undefined),
        qrUrl: qrUrl || null,
        clientId: data.clientId || null,
        observations: data.observations || null,
        items: {
          create: processedItems.map((item) => ({
            description: item.description,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            ivaId: item.ivaId,
            ivaRate: new Prisma.Decimal(item.ivaRate),
            subtotal: new Prisma.Decimal(item.subtotal),
            ivaAmount: new Prisma.Decimal(item.ivaAmount),
          })),
        },
      },
      include: {
        items: true,
        client: true,
      },
    });

    return {
      invoice,
      afipResponse: {
        cae: result.cae,
        caeFchVto: result.caeVencimiento,
        resultado: result.aprobada ? 'A' : 'R',
        observaciones: result.observaciones,
        qrUrl,
      },
    };
  }

  async createNotaCredito(data: CreateNotaCreditoInput) {
    const originalInvoice = await prisma.invoice.findUnique({
      where: { id: data.originalInvoiceId },
      include: { items: true },
    });

    if (!originalInvoice) {
      throw new AppError(404, `Original invoice with ID ${data.originalInvoiceId} not found`);
    }

    if (!originalInvoice.cae) {
      throw new AppError(400, 'Original invoice has no CAE, cannot create credit note');
    }

    const processedItems = processItemsForDB(data.items);
    const lineItems = toLineItems(processedItems);

    const condicionIva = await resolveCondicionIva(
      data.condicionIva,
      originalInvoice.clientId,
      originalInvoice.docTipo,
    );
    const concepto = data.concepto ?? originalInvoice.concepto;
    const esServicio = concepto === Concepto.SERVICIOS || concepto === Concepto.PRODUCTOS_Y_SERVICIOS;
    const today = Arca.formatDate(new Date());

    const result = await arca.notaCredito({
      ptoVta: data.puntoVenta,
      comprobanteOriginal: {
        tipo: originalInvoice.cbteTipo,
        ptoVta: originalInvoice.puntoVenta,
        nro: originalInvoice.cbteNro,
      },
      items: lineItems,
      concepto,
      docTipo: originalInvoice.docTipo,
      docNro: Number(originalInvoice.docNro),
      condicionIva,
      ...(esServicio && {
        servicio: {
          desde: data.fchServDesde || today,
          hasta: data.fchServHasta || today,
          vtoPago: data.fchVtoPago || today,
        },
      }),
    });

    return this.saveComprobante(result, processedItems, {
      docTipo: originalInvoice.docTipo,
      docNro: originalInvoice.docNro,
      concepto,
      esServicio,
      today,
      clientId: originalInvoice.clientId,
      observations: data.observations,
      fchServDesde: data.fchServDesde,
      fchServHasta: data.fchServHasta,
      fchVtoPago: data.fchVtoPago,
    });
  }

  async createNotaDebito(data: CreateNotaDebitoInput) {
    const originalInvoice = await prisma.invoice.findUnique({
      where: { id: data.originalInvoiceId },
      include: { items: true },
    });

    if (!originalInvoice) {
      throw new AppError(404, `Original invoice with ID ${data.originalInvoiceId} not found`);
    }

    if (!originalInvoice.cae) {
      throw new AppError(400, 'Original invoice has no CAE, cannot create debit note');
    }

    const processedItems = processItemsForDB(data.items);
    const lineItems = toLineItems(processedItems);

    const condicionIva = await resolveCondicionIva(
      data.condicionIva,
      originalInvoice.clientId,
      originalInvoice.docTipo,
    );
    const concepto = data.concepto ?? originalInvoice.concepto;
    const esServicio = concepto === Concepto.SERVICIOS || concepto === Concepto.PRODUCTOS_Y_SERVICIOS;
    const today = Arca.formatDate(new Date());

    const result = await arca.notaDebito({
      ptoVta: data.puntoVenta,
      comprobanteOriginal: {
        tipo: originalInvoice.cbteTipo,
        ptoVta: originalInvoice.puntoVenta,
        nro: originalInvoice.cbteNro,
      },
      items: lineItems,
      concepto,
      docTipo: originalInvoice.docTipo,
      docNro: Number(originalInvoice.docNro),
      condicionIva,
      ...(esServicio && {
        servicio: {
          desde: data.fchServDesde || today,
          hasta: data.fchServHasta || today,
          vtoPago: data.fchVtoPago || today,
        },
      }),
    });

    return this.saveComprobante(result, processedItems, {
      docTipo: originalInvoice.docTipo,
      docNro: originalInvoice.docNro,
      concepto,
      esServicio,
      today,
      clientId: originalInvoice.clientId,
      observations: data.observations,
      fchServDesde: data.fchServDesde,
      fchServHasta: data.fchServHasta,
      fchVtoPago: data.fchVtoPago,
    });
  }

  private async saveComprobante(
    result: FacturaResult,
    processedItems: ReturnType<typeof processItemsForDB>,
    meta: {
      docTipo: number;
      docNro: string;
      concepto: number;
      esServicio: boolean;
      today: string;
      clientId: number | null;
      observations?: string;
      fchServDesde?: string;
      fchServHasta?: string;
      fchVtoPago?: string;
    },
  ) {
    if (!result.aprobada) {
      const obsMsg =
        result.observaciones.length > 0
          ? result.observaciones.map((o) => `${o.code}: ${o.msg}`).join('; ')
          : 'Unknown reason';
      throw new AppError(400, `AFIP rejected comprobante: ${obsMsg}`);
    }

    let qrUrl: string | undefined;
    if (result.cae) {
      const cbteFchFormatted = `${meta.today.slice(0, 4)}-${meta.today.slice(4, 6)}-${meta.today.slice(6, 8)}`;
      qrUrl = Arca.generateQRUrl({
        fecha: cbteFchFormatted,
        cuit: Number(config.afip.cuit),
        ptoVta: result.ptoVta,
        tipoCmp: result.cbteTipo,
        nroCmp: result.cbteNro,
        importe: result.importes.total,
        moneda: 'PES',
        ctz: 1,
        tipoDocRec: meta.docTipo,
        nroDocRec: Number(meta.docNro),
        codAut: Number(result.cae),
      });
    }

    const invoice = await prisma.invoice.create({
      data: {
        cbteTipo: result.cbteTipo,
        puntoVenta: result.ptoVta,
        cbteNro: result.cbteNro,
        cbteDesde: result.cbteNro,
        cbteHasta: result.cbteNro,
        cbteFch: meta.today,
        concepto: meta.concepto,
        docTipo: meta.docTipo,
        docNro: meta.docNro,
        impTotal: new Prisma.Decimal(result.importes.total),
        impTotConc: new Prisma.Decimal(result.importes.noGravado),
        impNeto: new Prisma.Decimal(result.importes.neto),
        impOpEx: new Prisma.Decimal(result.importes.exento),
        impIVA: new Prisma.Decimal(result.importes.iva),
        impTrib: new Prisma.Decimal(result.importes.tributos),
        cae: result.cae || '',
        caeFchVto: result.caeVencimiento || '',
        resultado: 'A',
        monId: 'PES',
        monCotiz: new Prisma.Decimal(1),
        fchServDesde: meta.fchServDesde || (meta.esServicio ? meta.today : undefined),
        fchServHasta: meta.fchServHasta || (meta.esServicio ? meta.today : undefined),
        fchVtoPago: meta.fchVtoPago || (meta.esServicio ? meta.today : undefined),
        qrUrl: qrUrl || null,
        clientId: meta.clientId,
        observations: meta.observations || null,
        items: {
          create: processedItems.map((item) => ({
            description: item.description,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            ivaId: item.ivaId,
            ivaRate: new Prisma.Decimal(item.ivaRate),
            subtotal: new Prisma.Decimal(item.subtotal),
            ivaAmount: new Prisma.Decimal(item.ivaAmount),
          })),
        },
      },
      include: { items: true, client: true },
    });

    return {
      invoice,
      afipResponse: {
        cae: result.cae,
        caeFchVto: result.caeVencimiento,
        resultado: 'A',
        observaciones: result.observaciones,
        qrUrl,
      },
    };
  }

  async getInvoices(filters: InvoiceFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};

    if (filters.cbteTipo) {
      where.cbteTipo = filters.cbteTipo;
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters.from || filters.to) {
      where.cbteFch = {};
      if (filters.from) {
        where.cbteFch.gte = filters.from;
      }
      if (filters.to) {
        where.cbteFch.lte = filters.to;
      }
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          client: {
            select: { id: true, name: true, docNumber: true },
          },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInvoiceById(id: number) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        client: true,
      },
    });

    if (!invoice) {
      throw new AppError(404, `Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async getInvoiceStats() {
    const [totalCount, totalsByType, totalAmount, recentInvoices] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.groupBy({
        by: ['cbteTipo'],
        _count: { id: true },
        _sum: { impTotal: true },
      }),
      prisma.invoice.aggregate({
        _sum: { impTotal: true },
      }),
      prisma.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          client: { select: { name: true } },
        },
      }),
    ]);

    const CBTE_TIPO_NAMES: Record<number, string> = {
      1: 'Factura A',
      2: 'Nota de Débito A',
      3: 'Nota de Crédito A',
      6: 'Factura B',
      7: 'Nota de Débito B',
      8: 'Nota de Crédito B',
      11: 'Factura C',
      12: 'Nota de Débito C',
      13: 'Nota de Crédito C',
    };

    return {
      totalCount,
      totalAmount: totalAmount._sum.impTotal || 0,
      byType: totalsByType.map((t) => ({
        cbteTipo: t.cbteTipo,
        name: CBTE_TIPO_NAMES[t.cbteTipo] || `Tipo ${t.cbteTipo}`,
        count: t._count.id,
        total: t._sum.impTotal || 0,
      })),
      recentInvoices,
    };
  }
}

export const invoiceService = new InvoiceService();
