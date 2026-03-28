export interface Client {
  id: number;
  name: string;
  docType: number;
  docNumber: string;
  ivaCondition: number;
  address?: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { invoices: number };
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  ivaId: number;
  ivaRate?: number;
  subtotal?: number;
  ivaAmount?: number;
}

export interface Invoice {
  id: number;
  cbteTipo: number;
  puntoVenta: number;
  cbteNro: number;
  cbteDesde: number;
  cbteHasta: number;
  cbteFch: string;
  concepto: number;
  docTipo: number;
  docNro: string;
  impTotal: number;
  impTotConc: number;
  impNeto: number;
  impOpEx: number;
  impIVA: number;
  impTrib: number;
  cae?: string;
  caeFchVto?: string;
  resultado?: string;
  fchServDesde?: string;
  fchServHasta?: string;
  fchVtoPago?: string;
  clientId?: number;
  client?: Client;
  items: InvoiceItem[];
  qrUrl?: string;
  observations?: string;
  createdAt: string;
}

export interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  monthlyInvoices: number;
  monthlyAmount: number;
  byType: { cbteTipo: number; count: number; total: number }[];
}

// Constants
export const CBTE_TIPOS: Record<number, string> = {
  1: 'Factura A',
  2: 'Nota de Debito A',
  3: 'Nota de Credito A',
  6: 'Factura B',
  7: 'Nota de Debito B',
  8: 'Nota de Credito B',
  11: 'Factura C',
  12: 'Nota de Debito C',
  13: 'Nota de Credito C',
};

export const DOC_TIPOS: Record<number, string> = {
  80: 'CUIT',
  86: 'CUIL',
  96: 'DNI',
  99: 'Consumidor Final',
};

export const IVA_ALICUOTAS: Record<number, { name: string; rate: number }> = {
  3: { name: '0%', rate: 0 },
  4: { name: '10.5%', rate: 10.5 },
  5: { name: '21%', rate: 21 },
  6: { name: '27%', rate: 27 },
  8: { name: '5%', rate: 5 },
  9: { name: '2.5%', rate: 2.5 },
};

export const IVA_CONDITIONS: Record<number, string> = {
  1: 'Responsable Inscripto',
  4: 'Exento',
  5: 'Consumidor Final',
  6: 'Monotributista',
};
