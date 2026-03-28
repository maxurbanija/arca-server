import axios from 'axios';
import type { Invoice, Client, InvoiceStats } from '../types';

const api = axios.create({
  baseURL: '/api',
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
  }
);

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
    invoices: Invoice[];
    total: number;
    page: number;
    totalPages: number;
  }>('/invoices', { params });
  return data;
}

export async function createInvoice(invoiceData: Record<string, unknown>) {
  const { data } = await api.post<{
    invoice: Invoice;
    afipResponse: Record<string, unknown>;
  }>('/invoices', invoiceData);
  return data;
}

export async function getInvoice(id: number) {
  const { data } = await api.get<Invoice>(`/invoices/${id}`);
  return data;
}

export async function getInvoiceStats() {
  const { data } = await api.get<InvoiceStats>('/invoices/stats');
  return data;
}

// Clients
export async function getClients(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const { data } = await api.get<{
    clients: Client[];
    total: number;
    page: number;
    totalPages: number;
  }>('/clients', { params });
  return data;
}

export async function createClient(clientData: Partial<Client>) {
  const { data } = await api.post<Client>('/clients', clientData);
  return data;
}

export async function getClient(id: number) {
  const { data } = await api.get<Client>(`/clients/${id}`);
  return data;
}

export async function updateClient(id: number, clientData: Partial<Client>) {
  const { data } = await api.put<Client>(`/clients/${id}`, clientData);
  return data;
}

export async function deleteClient(id: number) {
  const { data } = await api.delete(`/clients/${id}`);
  return data;
}

// AFIP
export async function getAfipStatus() {
  const { data } = await api.get<{
    AppServer: string;
    DbServer: string;
    AuthServer: string;
  }>('/afip/status');
  return data;
}

export async function getLastVoucher(puntoVenta: number, cbteTipo: number) {
  const { data } = await api.get<{ cbteNro: number }>(
    `/afip/last-voucher/${puntoVenta}/${cbteTipo}`
  );
  return data;
}

export default api;
