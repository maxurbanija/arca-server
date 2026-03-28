import { PrismaClient, Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { config } from '../config';
import { wsfeService, CAERequestData } from './wsfe.service';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// IVA rate mapping: AFIP IVA ID -> percentage
const IVA_RATES: Record<number, number> = {
  3: 0,      // 0%
  4: 10.5,   // 10.5%
  5: 21,     // 21%
  6: 27,     // 27%
  8: 5,      // 5%
  9: 2.5,    // 2.5%
};

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
  concepto?: number;
  puntoVenta: number;
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

function calculateIvaFromItems(items: InvoiceItemInput[]) {
  const ivaGroups: Record<number, { baseImp: number; importe: number }> = {};

  const processedItems = items.map((item) => {
    const ivaRate = IVA_RATES[item.ivaId];
    if (ivaRate === undefined) {
      throw new AppError(400, `Invalid IVA ID: ${item.ivaId}. Valid IDs: ${Object.keys(IVA_RATES).join(', ')}`);
    }

    const subtotal = roundTwo(item.quantity * item.unitPrice);
    const ivaAmount = roundTwo(subtotal * (ivaRate / 100));

    if (!ivaGroups[item.ivaId]) {
      ivaGroups[item.ivaId] = { baseImp: 0, importe: 0 };
    }
    ivaGroups[item.ivaId].baseImp = roundTwo(ivaGroups[item.ivaId].baseImp + subtotal);
    ivaGroups[item.ivaId].importe = roundTwo(ivaGroups[item.ivaId].importe + ivaAmount);

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

  const alicIva = Object.entries(ivaGroups)
    .filter(([_, group]) => group.baseImp > 0)
    .map(([id, group]) => ({
      Id: parseInt(id),
      BaseImp: group.baseImp,
      Importe: group.importe,
    }));

  const impNeto = roundTwo(
    processedItems.reduce((sum, item) => sum + item.subtotal, 0)
  );
  const impIVA = roundTwo(
    processedItems.reduce((sum, item) => sum + item.ivaAmount, 0)
  );
  const impTotal = roundTwo(impNeto + impIVA);

  return {
    processedItems,
    alicIva,
    impNeto,
    impIVA,
    impTotal,
    impTotConc: 0,
    impOpEx: 0,
    impTrib: 0,
  };
}

class InvoiceService {
  async createInvoice(data: CreateInvoiceInput) {
    const concepto = data.concepto ?? 2;
    const puntoVenta = data.puntoVenta;
    const cbteTipo = data.cbteTipo;

    // Get the last authorized voucher number
    const lastVoucher = await wsfeService.getLastVoucher(puntoVenta, cbteTipo);
    const nextCbteNro = lastVoucher.CbteNro + 1;

    // Calculate amounts from items
    const calculated = calculateIvaFromItems(data.items);

    // Format date as YYYYMMDD
    const cbteFch = format(new Date(), 'yyyyMMdd');

    // Build service dates for concepto 2
    const fchServDesde = data.fchServDesde || cbteFch;
    const fchServHasta = data.fchServHasta || cbteFch;
    const fchVtoPago = data.fchVtoPago || cbteFch;

    // Build CAE request
    const caeRequest: CAERequestData = {
      CbteTipo: cbteTipo,
      PtoVta: puntoVenta,
      Concepto: concepto,
      DocTipo: data.docTipo,
      DocNro: data.docNro,
      CbteDesde: nextCbteNro,
      CbteHasta: nextCbteNro,
      CbteFch: cbteFch,
      ImpTotal: calculated.impTotal,
      ImpTotConc: calculated.impTotConc,
      ImpNeto: calculated.impNeto,
      ImpOpEx: calculated.impOpEx,
      ImpIVA: calculated.impIVA,
      ImpTrib: calculated.impTrib,
      FchServDesde: fchServDesde,
      FchServHasta: fchServHasta,
      FchVtoPago: fchVtoPago,
      MonId: 'PES',
      MonCotiz: 1,
      Iva: calculated.alicIva,
    };

    // Request CAE from AFIP
    const caeResponse = await wsfeService.requestCAE(caeRequest);

    // Save invoice to database
    const invoice = await prisma.invoice.create({
      data: {
        cbteTipo,
        puntoVenta,
        cbteNro: nextCbteNro,
        cbteDesde: caeResponse.cbteDesde,
        cbteHasta: caeResponse.cbteHasta,
        cbteFch,
        concepto,
        docTipo: data.docTipo,
        docNro: data.docNro,
        impTotal: new Prisma.Decimal(calculated.impTotal),
        impTotConc: new Prisma.Decimal(calculated.impTotConc),
        impNeto: new Prisma.Decimal(calculated.impNeto),
        impOpEx: new Prisma.Decimal(calculated.impOpEx),
        impIVA: new Prisma.Decimal(calculated.impIVA),
        impTrib: new Prisma.Decimal(calculated.impTrib),
        cae: caeResponse.cae,
        caeFchVto: caeResponse.caeFchVto,
        resultado: caeResponse.resultado,
        monId: 'PES',
        monCotiz: new Prisma.Decimal(1),
        fchServDesde,
        fchServHasta,
        fchVtoPago,
        clientId: data.clientId || null,
        observations: data.observations || null,
        items: {
          create: calculated.processedItems.map((item) => ({
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
        cae: caeResponse.cae,
        caeFchVto: caeResponse.caeFchVto,
        resultado: caeResponse.resultado,
        observaciones: caeResponse.observaciones,
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
