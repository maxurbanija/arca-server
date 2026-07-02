import axios from 'axios';
import type { Invoice, Client, InvoiceStats } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token from localStorage on every request
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token && cfg.headers) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// Todos los endpoints del backend responden { success, data } (los listados
// agregan pagination): los helpers devuelven SIEMPRE el payload ya desenvuelto.
interface Wrapped<T> {
  success: boolean;
  data: T;
}

// Invoices
export async function getInvoices(params?: {
  page?: number;
  limit?: number;
  cbteTipo?: number;
  desde?: string;
  hasta?: string;
  clientId?: number;
}) {
  const { data } = await api.get<{
    data: Invoice[];
    pagination: { page: number; total: number; totalPages: number };
  }>('/invoices', { params });
  return {
    invoices: data.data,
    total: data.pagination.total,
    page: data.pagination.page,
    totalPages: data.pagination.totalPages,
  };
}

export async function createInvoice(invoiceData: Record<string, unknown>) {
  const { data } = await api.post<Wrapped<{ invoice: Invoice; afipResponse: Record<string, unknown> }>>(
    '/invoices',
    invoiceData,
  );
  return data.data;
}

export async function createNotaCredito(notaData: Record<string, unknown>) {
  const { data } = await api.post<Wrapped<{ invoice: Invoice; afipResponse: Record<string, unknown> }>>(
    '/invoices/nota-credito',
    notaData,
  );
  return data.data;
}

export async function createNotaDebito(notaData: Record<string, unknown>) {
  const { data } = await api.post<Wrapped<{ invoice: Invoice; afipResponse: Record<string, unknown> }>>(
    '/invoices/nota-debito',
    notaData,
  );
  return data.data;
}

export async function getInvoice(id: number) {
  const { data } = await api.get<Wrapped<Invoice>>(`/invoices/${id}`);
  return data.data;
}

export async function getInvoiceStats() {
  const { data } = await api.get<Wrapped<InvoiceStats>>('/invoices/stats');
  return data.data;
}

// Clients
export async function getClients(params?: { page?: number; limit?: number; search?: string }) {
  const { data } = await api.get<{
    data: Client[];
    pagination: { page: number; total: number; totalPages: number };
  }>('/clients', { params });
  return {
    clients: data.data,
    total: data.pagination.total,
    page: data.pagination.page,
    totalPages: data.pagination.totalPages,
  };
}

export async function createClient(clientData: Partial<Client>) {
  const { data } = await api.post<Wrapped<Client>>('/clients', clientData);
  return data.data;
}

export async function getClient(id: number) {
  const { data } = await api.get<Wrapped<Client>>(`/clients/${id}`);
  return data.data;
}

export async function updateClient(id: number, clientData: Partial<Client>) {
  const { data } = await api.put<Wrapped<Client>>(`/clients/${id}`, clientData);
  return data.data;
}

export async function deleteClient(id: number) {
  const { data } = await api.delete(`/clients/${id}`);
  return data;
}

// AFIP
export async function getAfipStatus() {
  const { data } = await api.get<Wrapped<Record<string, string>>>('/afip/status');
  return data.data;
}

export async function getLastVoucher(puntoVenta: number, cbteTipo: number) {
  const { data } = await api.get<Wrapped<{ CbteNro: number; PtoVta: number; CbteTipo: number }>>(
    '/afip/last-voucher',
    { params: { puntoVenta, cbteTipo } },
  );
  return data.data;
}

export async function getPuntosVenta() {
  const { data } =
    await api.get<Wrapped<{ Nro: number; EmisionTipo: string; Bloqueado: string; FchBaja: string }[]>>(
      '/afip/puntos-venta',
    );
  return data.data;
}

interface DomicilioPadron {
  direccion?: string;
  calle?: string;
  localidad?: string;
  codPostal?: string;
  codigoPostal?: string;
  provincia?: string;
  descripcionProvincia?: string;
}

// El shape varía entre el SDK viejo y arca-padron; se tipan solo los campos que usa la UI.
export interface PersonaPadron {
  nombre?: string;
  apellido?: string;
  razonSocial?: string;
  domicilios?: DomicilioPadron[];
  domicilioFiscal?: DomicilioPadron;
  impuestos?: { id?: number; idImpuesto?: number }[];
  [key: string]: unknown;
}

export async function consultarCuit(cuit: number | string) {
  const { data } = await api.get<Wrapped<PersonaPadron>>(`/afip/contribuyente/${cuit}`);
  return data.data;
}

export async function consultarComprobante(puntoVenta: number, cbteTipo: number, cbteNro: number) {
  const { data } = await api.get<Wrapped<Record<string, unknown>>>('/afip/comprobante', {
    params: { puntoVenta, cbteTipo, cbteNro },
  });
  return data.data;
}

export async function getCotizacion(monedaId: string) {
  const { data } = await api.get<Wrapped<{ MonCotiz: number; FchCotiz: string }>>('/afip/cotizacion', {
    params: { monedaId },
  });
  return data.data;
}

export async function getAfipInvoiceTypes() {
  const { data } = await api.get('/afip/invoice-types');
  return data.data;
}

export async function getAfipDocTypes() {
  const { data } = await api.get('/afip/doc-types');
  return data.data;
}

export async function getAfipIvaTypes() {
  const { data } = await api.get('/afip/iva-types');
  return data.data;
}

export async function getAfipConceptTypes() {
  const { data } = await api.get('/afip/concept-types');
  return data.data;
}

export async function getAfipCurrencyTypes() {
  const { data } = await api.get('/afip/currency-types');
  return data.data;
}

export async function getAfipTributoTypes() {
  const { data } = await api.get('/afip/tributo-types');
  return data.data;
}

export async function getAfipIvaConditions() {
  const { data } = await api.get('/afip/iva-conditions');
  return data.data;
}

export async function consultarCuitBasic(cuit: number | string) {
  const { data } = await api.get(`/afip/contribuyente-basic/${cuit}`);
  return data.data;
}

export async function getPadronStatus() {
  const { data } = await api.get('/afip/padron-status');
  return data.data;
}

export async function constatarComprobante(input: Record<string, unknown>) {
  const { data } = await api.post('/afip/constatar', input, { timeout: 60000 });
  return data.data;
}

export async function getCdcStatus() {
  const { data } = await api.get('/afip/cdc-status');
  return data.data;
}

export async function getCdcTiposCbte() {
  const { data } = await api.get('/afip/cdc-tipos-cbte');
  return data.data;
}

export async function getAfipOptionalTypes() {
  const { data } = await api.get('/afip/optional-types');
  return data.data;
}

export async function generateCert(certData: {
  cuit: string;
  password: string;
  alias: string;
  environment?: string;
}) {
  const { data } = await api.post<Wrapped<{ alias: string; message: string }>>(
    '/afip/generate-cert',
    certData,
    { timeout: 120000 },
  );
  return data.data;
}

export async function renewCert(certData: {
  cuit: string;
  password: string;
  alias: string;
  environment?: string;
}) {
  const { data } = await api.post<Wrapped<{ alias: string; message: string }>>('/afip/renew-cert', certData, {
    timeout: 120000,
  });
  return data.data;
}

export async function getCertInfo() {
  const { data } =
    await api.get<
      Wrapped<{ notBefore: string; notAfter: string; daysLeft: number; expired: boolean } | null>
    >('/afip/cert-info');
  return data.data;
}

export async function testCert(environment?: string) {
  const { data } = await api.post<Wrapped<{ valid: boolean; message: string }>>(
    '/afip/test-cert',
    { environment },
    { timeout: 60000 },
  );
  return data.data;
}

// FECRED
export async function getFecredStatus() {
  const { data } = await api.get('/afip/fecred-status');
  return data.data;
}

export async function consultarFecredObligado(cuit: string) {
  const { data } = await api.get(`/afip/fecred-obligado/${cuit}`);
  return data.data;
}

export async function consultarFecredCtasCtes(params: Record<string, unknown>) {
  const { data } = await api.post('/afip/fecred-ctas-ctes', params);
  return data.data;
}

export async function aceptarFecred(codCtaCte: number) {
  const { data } = await api.post('/afip/fecred-aceptar', { codCtaCte });
  return data.data;
}

export async function rechazarFecred(codCtaCte: number, codMotivoRechazo: number) {
  const { data } = await api.post('/afip/fecred-rechazar', { codCtaCte, codMotivoRechazo });
  return data.data;
}

// MTXCA
export async function getMtxcaStatus() {
  const { data } = await api.get('/afip/mtxca-status');
  return data.data;
}

export async function autorizarMtxca(request: Record<string, unknown>) {
  const { data } = await api.post('/afip/mtxca-autorizar', request);
  return data.data;
}

// SIRE
export async function getSireStatus() {
  const { data } = await api.get('/afip/sire-status');
  return data.data;
}

export async function registrarRetencion(retencion: Record<string, unknown>) {
  const { data } = await api.post('/afip/sire-retencion', retencion);
  return data.data;
}

export async function consultarRetenciones(params: Record<string, unknown>) {
  const { data } = await api.post('/afip/sire-consultar', params);
  return data.data;
}

export async function getSireRegimenes() {
  const { data } = await api.get('/afip/sire-regimenes');
  return data.data;
}

// AGRO
export async function getAgroStatus() {
  const { data } = await api.get('/afip/agro-status');
  return data.data;
}

export async function autorizarCPE(cpe: Record<string, unknown>) {
  const { data } = await api.post('/afip/agro-cpe-autorizar', cpe);
  return data.data;
}

export async function solicitarCTG(solicitud: Record<string, unknown>) {
  const { data } = await api.post('/afip/agro-ctg-solicitar', solicitud);
  return data.data;
}

export async function autorizarLiquidacion(liquidacion: Record<string, unknown>) {
  const { data } = await api.post('/afip/agro-lpg-autorizar', liquidacion);
  return data.data;
}

// EMPLEADOS
export async function generarF935(params: { cuitEmpleador: string; registros: Record<string, unknown>[] }) {
  const { data } = await api.post('/afip/empleados-generar', params);
  return data.data;
}

export default api;
