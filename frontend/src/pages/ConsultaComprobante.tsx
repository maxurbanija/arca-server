import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { consultarComprobante, getPuntosVenta } from '../api/client';
import { CBTE_TIPOS } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function ConsultaComprobante() {
  const [puntosVenta, setPuntosVenta] = useState<{ Nro: number }[]>([]);
  const [puntoVenta, setPuntoVenta] = useState(1);
  const [cbteTipo, setCbteTipo] = useState(11);
  const [cbteNro, setCbteNro] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    getPuntosVenta()
      .then((data) => {
        const activos = (Array.isArray(data) ? data : []).filter((p: { Bloqueado: string }) => p.Bloqueado === 'N');
        setPuntosVenta(activos);
        if (activos.length > 0) setPuntoVenta(activos[0].Nro);
      })
      .catch(() => {});
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const nro = parseInt(cbteNro, 10);
    if (isNaN(nro) || nro <= 0) {
      toast.error('Ingresá un número de comprobante válido');
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      const data = await consultarComprobante(puntoVenta, cbteTipo, nro);
      setResult(data);
    } catch {
      toast.error('No se encontró el comprobante en AFIP');
    } finally {
      setLoading(false);
    }
  };

  const r = result as Record<string, number | string> | null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Search form */}
      <div className="card">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          Consultar Comprobante en AFIP
        </h3>
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Punto de Venta</label>
              {puntosVenta.length > 0 ? (
                <select
                  value={puntoVenta}
                  onChange={(e) => setPuntoVenta(Number(e.target.value))}
                  className="select"
                >
                  {puntosVenta.map((pv) => (
                    <option key={pv.Nro} value={pv.Nro}>
                      {String(pv.Nro).padStart(5, '0')}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={puntoVenta}
                  onChange={(e) => setPuntoVenta(Number(e.target.value))}
                  className="input"
                  min={1}
                />
              )}
            </div>
            <div>
              <label className="label">Tipo de Comprobante</label>
              <select
                value={cbteTipo}
                onChange={(e) => setCbteTipo(Number(e.target.value))}
                className="select"
              >
                {Object.entries(CBTE_TIPOS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Número</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={cbteNro}
                  onChange={(e) => setCbteNro(e.target.value)}
                  className="input flex-1"
                  placeholder="1"
                  min={1}
                />
                <button type="submit" disabled={loading} className="btn-primary flex-shrink-0">
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <MagnifyingGlassIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Result */}
      {r && (
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <DocumentTextIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {CBTE_TIPOS[Number(r.CbteTipo)] || `Tipo ${r.CbteTipo}`}
              </p>
              <p className="font-mono text-xs text-gray-500">
                {String(r.PtoVta).padStart(5, '0')}-{String(r.CbteDesde).padStart(8, '0')}
              </p>
            </div>
            <div className="ml-auto">
              {r.Resultado === 'A' ? (
                <span className="badge-green">Aprobado</span>
              ) : (
                <span className="badge-red">Rechazado</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">Fecha</p>
              <p className="text-sm font-medium">{formatDate(String(r.CbteFch))}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Doc. Receptor</p>
              <p className="text-sm font-medium">{r.DocTipo === 99 ? 'Cons. Final' : `Tipo ${r.DocTipo}: ${r.DocNro}`}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Concepto</p>
              <p className="text-sm font-medium">
                {r.Concepto === 1 ? 'Productos' : r.Concepto === 2 ? 'Servicios' : 'Prod. y Serv.'}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Neto Gravado</span>
                <span className="font-medium">{formatCurrency(Number(r.ImpNeto))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IVA</span>
                <span className="font-medium">{formatCurrency(Number(r.ImpIVA))}</span>
              </div>
              {Number(r.ImpTotConc) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">No Gravado</span>
                  <span className="font-medium">{formatCurrency(Number(r.ImpTotConc))}</span>
                </div>
              )}
              {Number(r.ImpOpEx) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Exento</span>
                  <span className="font-medium">{formatCurrency(Number(r.ImpOpEx))}</span>
                </div>
              )}
              {Number(r.ImpTrib) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tributos</span>
                  <span className="font-medium">{formatCurrency(Number(r.ImpTrib))}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-indigo-600">{formatCurrency(Number(r.ImpTotal))}</span>
                </div>
              </div>
            </div>
          </div>

          {r.CodAutorizacion && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-emerald-600">CAE</p>
                  <p className="font-mono text-sm font-bold text-emerald-900">{r.CodAutorizacion}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600">Vencimiento</p>
                  <p className="text-sm font-semibold text-emerald-900">{formatDate(String(r.FchVto))}</p>
                </div>
              </div>
            </div>
          )}

          {(r.FchServDesde || r.FchServHasta) && (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Servicio Desde</p>
                <p className="font-medium">{formatDate(String(r.FchServDesde))}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Servicio Hasta</p>
                <p className="font-medium">{formatDate(String(r.FchServHasta))}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Vto. Pago</p>
                <p className="font-medium">{formatDate(String(r.FchVtoPago))}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">Moneda</p>
              <p className="font-medium">{r.MonId} (ctz: {r.MonCotiz})</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Procesado</p>
              <p className="font-medium">{formatDate(String(r.FchProceso))}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
