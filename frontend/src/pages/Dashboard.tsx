import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  PlusCircleIcon,
  UserPlusIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { getInvoiceStats, getInvoices, getAfipStatus } from '../api/client';
import type { Invoice, InvoiceStats } from '../types';
import { formatCurrency, formatDate, formatCbteTipo, formatFullInvoiceNumber } from '../utils/formatters';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';

export default function Dashboard() {
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [afipStatus, setAfipStatus] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [statsData, invoicesData] = await Promise.all([
          getInvoiceStats().catch(() => null),
          getInvoices({ page: 1, limit: 10 }).catch(() => ({ invoices: [] })),
        ]);

        if (statsData) setStats(statsData);
        setRecentInvoices(invoicesData.invoices || []);

        // Load AFIP status separately (might fail)
        try {
          const status = await getAfipStatus();
          setAfipStatus(status);
        } catch {
          setAfipStatus(null);
        }
      } catch (err) {
        setError('Error al cargar los datos del dashboard');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <p className="text-red-700">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary mt-4">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AFIP Status */}
      {afipStatus && (
        <div className="card flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Estado AFIP:</span>
          {['AppServer', 'DbServer', 'AuthServer'].map((server) => (
            <span key={server} className="inline-flex items-center gap-1 text-xs">
              {afipStatus[server] === 'OK' ? (
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
              ) : (
                <XCircleIcon className="h-4 w-4 text-red-500" />
              )}
              {server}: {afipStatus[server] || 'N/A'}
            </span>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
            <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Facturas</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats?.totalInvoices ?? 0}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
            <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Monto Total</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats?.totalAmount ?? 0)}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
            <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Facturas del Mes</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats?.monthlyInvoices ?? 0}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
            <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Monto del Mes</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats?.monthlyAmount ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/facturas/nueva" className="btn-primary">
          <PlusCircleIcon className="mr-2 h-5 w-5" />
          Nueva Factura
        </Link>
        <Link to="/clientes/nuevo" className="btn-secondary">
          <UserPlusIcon className="mr-2 h-5 w-5" />
          Nuevo Cliente
        </Link>
      </div>

      {/* Recent Invoices */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Facturas Recientes</h2>
          <Link to="/facturas" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Ver todas
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            No hay facturas registradas. Crea tu primera factura.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header px-4 py-3">Tipo</th>
                  <th className="table-header px-4 py-3">Numero</th>
                  <th className="table-header px-4 py-3">Fecha</th>
                  <th className="table-header px-4 py-3">Cliente</th>
                  <th className="table-header px-4 py-3">Total</th>
                  <th className="table-header px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="table-cell">
                      <Link to={`/facturas/${inv.id}`} className="text-indigo-600 hover:underline">
                        {formatCbteTipo(inv.cbteTipo)}
                      </Link>
                    </td>
                    <td className="table-cell font-mono text-xs">
                      {formatFullInvoiceNumber(inv.puntoVenta, inv.cbteNro)}
                    </td>
                    <td className="table-cell">{formatDate(inv.cbteFch)}</td>
                    <td className="table-cell">{inv.client?.name || inv.docNro}</td>
                    <td className="table-cell font-semibold">
                      {formatCurrency(inv.impTotal)}
                    </td>
                    <td className="table-cell">
                      <InvoiceStatusBadge resultado={inv.resultado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats by type */}
      {stats?.byType && stats.byType.length > 0 && (
        <div className="card">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Resumen por Tipo</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.byType.map((item) => (
              <div
                key={item.cbteTipo}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCbteTipo(item.cbteTipo)}
                  </p>
                  <p className="text-xs text-gray-500">{item.count} comprobantes</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(item.total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
