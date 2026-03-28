import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { getInvoice } from '../api/client';
import type { Invoice } from '../types';
import { IVA_ALICUOTAS } from '../types';
import {
  formatCurrency,
  formatDate,
  formatCbteTipo,
  formatFullInvoiceNumber,
  formatDocType,
} from '../utils/formatters';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        setLoading(true);
        const data = await getInvoice(Number(id));
        setInvoice(data);
      } catch {
        setError('Error al cargar la factura');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <p className="text-red-700">{error || 'Factura no encontrada'}</p>
        <button onClick={() => navigate('/facturas')} className="btn-primary mt-4">
          Volver a Facturas
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Actions */}
      <div className="no-print flex items-center justify-between">
        <button onClick={() => navigate('/facturas')} className="btn-secondary">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Volver
        </button>
        <button onClick={() => window.print()} className="btn-secondary">
          <PrinterIcon className="mr-2 h-4 w-4" />
          Imprimir
        </button>
      </div>

      {/* Invoice Header */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {formatCbteTipo(invoice.cbteTipo)}
            </h2>
            <p className="mt-1 font-mono text-2xl font-bold text-indigo-600">
              {formatFullInvoiceNumber(invoice.puntoVenta, invoice.cbteNro)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Fecha de Emision</p>
            <p className="text-lg font-semibold">{formatDate(invoice.cbteFch)}</p>
            <div className="mt-2">
              <InvoiceStatusBadge resultado={invoice.resultado} />
            </div>
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div className="card">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Datos del Cliente
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Nombre / Razon Social</p>
            <p className="font-medium">{invoice.client?.name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Documento</p>
            <p className="font-medium">
              {formatDocType(invoice.docTipo)}: {invoice.docNro}
            </p>
          </div>
          {invoice.client?.address && (
            <div>
              <p className="text-sm text-gray-500">Domicilio</p>
              <p className="font-medium">{invoice.client.address}</p>
            </div>
          )}
          {invoice.client?.email && (
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{invoice.client.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Service Dates */}
      {(invoice.fchServDesde || invoice.fchServHasta) && (
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Periodo de Servicio
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500">Desde</p>
              <p className="font-medium">{formatDate(invoice.fchServDesde || '')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Hasta</p>
              <p className="font-medium">{formatDate(invoice.fchServHasta || '')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Vto. Pago</p>
              <p className="font-medium">{formatDate(invoice.fchVtoPago || '')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="card overflow-hidden p-0">
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Detalle
          </h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-y border-gray-200">
              <th className="table-header px-6 py-3">Descripcion</th>
              <th className="table-header px-6 py-3 text-right">Cantidad</th>
              <th className="table-header px-6 py-3 text-right">Precio Unit.</th>
              <th className="table-header px-6 py-3 text-right">IVA</th>
              <th className="table-header px-6 py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.items?.map((item, i) => {
              const subtotal = item.subtotal ?? item.quantity * item.unitPrice;
              const ivaInfo = IVA_ALICUOTAS[item.ivaId];
              return (
                <tr key={i}>
                  <td className="table-cell">{item.description}</td>
                  <td className="table-cell text-right">{item.quantity}</td>
                  <td className="table-cell text-right">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="table-cell text-right">
                    {ivaInfo?.name || `${item.ivaRate || 0}%`}
                  </td>
                  <td className="table-cell text-right font-semibold">
                    {formatCurrency(subtotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="card">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Totales
        </h3>
        <div className="ml-auto max-w-xs space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Neto Gravado</span>
            <span className="font-medium">{formatCurrency(invoice.impNeto)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">IVA</span>
            <span className="font-medium">{formatCurrency(invoice.impIVA)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">No Gravado</span>
            <span className="font-medium">{formatCurrency(invoice.impTotConc)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Exento</span>
            <span className="font-medium">{formatCurrency(invoice.impOpEx)}</span>
          </div>
          {invoice.impTrib > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tributos</span>
              <span className="font-medium">{formatCurrency(invoice.impTrib)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2">
            <div className="flex justify-between">
              <span className="text-lg font-bold">TOTAL</span>
              <span className="text-lg font-bold text-indigo-600">
                {formatCurrency(invoice.impTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CAE Info */}
      {invoice.cae && (
        <div className="card bg-green-50">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-green-800">
            Autorizacion Electronica (CAE)
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-green-700">Numero de CAE</p>
              <p className="font-mono text-xl font-bold text-green-900">
                {invoice.cae}
              </p>
            </div>
            <div>
              <p className="text-sm text-green-700">Vencimiento CAE</p>
              <p className="text-lg font-semibold text-green-900">
                {formatDate(invoice.caeFchVto || '')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Observations */}
      {invoice.observations && (
        <div className="card">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Observaciones
          </h3>
          <p className="text-sm text-gray-700">{invoice.observations}</p>
        </div>
      )}
    </div>
  );
}
