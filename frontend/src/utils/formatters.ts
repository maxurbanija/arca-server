import { CBTE_TIPOS, DOC_TIPOS } from '../types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  // Handle YYYYMMDD format
  if (dateStr.length === 8 && !dateStr.includes('-')) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
  }
  // Handle ISO date format
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatCbteTipo(tipo: number): string {
  return CBTE_TIPOS[tipo] || `Tipo ${tipo}`;
}

export function formatFullInvoiceNumber(
  puntoVenta: number,
  cbteNro: number
): string {
  const pv = String(puntoVenta).padStart(5, '0');
  const nro = String(cbteNro).padStart(8, '0');
  return `${pv}-${nro}`;
}

export function formatDocType(tipo: number): string {
  return DOC_TIPOS[tipo] || `Tipo ${tipo}`;
}

export function todayAsYYYYMMDD(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export function todayAsInputDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function inputDateToYYYYMMDD(inputDate: string): string {
  return inputDate.replace(/-/g, '');
}
