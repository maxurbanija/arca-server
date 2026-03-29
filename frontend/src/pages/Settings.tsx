import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { getAfipStatus, generateCert } from '../api/client';

export default function Settings() {
  const [afipStatus, setAfipStatus] = useState<Record<string, string> | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Cert generation
  const [certCuit, setCertCuit] = useState('');
  const [certPassword, setCertPassword] = useState('');
  const [certAlias, setCertAlias] = useState('arca-server');
  const [certEnv, setCertEnv] = useState<'testing' | 'production'>('testing');
  const [generatingCert, setGeneratingCert] = useState(false);
  const [certResult, setCertResult] = useState<{ alias: string; certPath: string; message: string } | null>(null);

  const checkStatus = async () => {
    try {
      setCheckingStatus(true);
      const status = await getAfipStatus();
      setAfipStatus(status);
      toast.success('Estado de AFIP obtenido');
    } catch {
      toast.error('No se pudo conectar con AFIP');
      setAfipStatus(null);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleGenerateCert = async () => {
    if (!certCuit || !certPassword || !certAlias) {
      toast.error('Completá CUIT, clave fiscal y alias');
      return;
    }

    try {
      setGeneratingCert(true);
      setCertResult(null);
      const result = await generateCert({
        cuit: certCuit,
        password: certPassword,
        alias: certAlias,
        environment: certEnv,
      });
      setCertResult(result);
      setCertPassword('');
      toast.success('Certificado generado exitosamente');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Error al generar el certificado';
      toast.error(msg);
    } finally {
      setGeneratingCert(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Generate Certificate */}
      <div className="card">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <ShieldCheckIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Generar Certificado AFIP</h3>
            <p className="text-xs text-gray-500">Generá el certificado digital automáticamente con tu clave fiscal</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">CUIT</label>
              <input
                type="text"
                value={certCuit}
                onChange={(e) => setCertCuit(e.target.value)}
                className="input"
                placeholder="20123456789"
              />
            </div>
            <div>
              <label className="label">Clave Fiscal</label>
              <input
                type="password"
                value={certPassword}
                onChange={(e) => setCertPassword(e.target.value)}
                className="input"
                placeholder="Tu clave fiscal de AFIP"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Alias del Certificado</label>
              <input
                type="text"
                value={certAlias}
                onChange={(e) => setCertAlias(e.target.value)}
                className="input"
                placeholder="mi-sistema"
              />
            </div>
            <div>
              <label className="label">Entorno</label>
              <select
                value={certEnv}
                onChange={(e) => setCertEnv(e.target.value as 'testing' | 'production')}
                className="select"
              >
                <option value="testing">Homologación (Testing)</option>
                <option value="production">Producción</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateCert}
              disabled={generatingCert}
              className="btn-primary"
            >
              {generatingCert ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generando...
                </>
              ) : (
                'Generar Certificado'
              )}
            </button>
            <p className="text-[11px] text-gray-400">
              Se loguea al portal de AFIP, genera la clave y obtiene el certificado firmado
            </p>
          </div>

          {certResult && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                <p className="text-sm font-semibold text-emerald-800">Certificado generado</p>
              </div>
              <p className="mt-1 text-xs text-emerald-700">{certResult.message}</p>
              <p className="mt-1 font-mono text-[11px] text-emerald-600">
                Alias: {certResult.alias} — {certResult.certPath}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* AFIP Status */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Estado de AFIP</h3>
          <button
            onClick={checkStatus}
            disabled={checkingStatus}
            className="btn-secondary text-xs"
          >
            {checkingStatus ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <ArrowPathIcon className="h-4 w-4" />
                Verificar
              </>
            )}
          </button>
        </div>

        {afipStatus ? (
          <div className="space-y-2">
            {['AppServer', 'DbServer', 'AuthServer'].map((server) => (
              <div
                key={server}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5"
              >
                <span className="text-sm font-medium text-gray-700">{server}</span>
                <span className="flex items-center gap-1.5">
                  {afipStatus[server] === 'OK' ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-xs font-medium text-emerald-700">OK</span>
                    </>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                      <span className="text-xs font-medium text-red-700">
                        {afipStatus[server] || 'Error'}
                      </span>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-gray-400">
            Hacé clic en "Verificar" para comprobar la conexión con AFIP
          </p>
        )}
      </div>

      {/* App Info */}
      <div className="card">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Información</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Versión</span>
            <span className="font-medium">2.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Backend API</span>
            <span className="font-mono text-xs">/api</span>
          </div>
          <div className="flex justify-between">
            <span>Stack</span>
            <span className="font-medium text-xs">React 19 + Vite 8 + Express 5 + Prisma 7</span>
          </div>
          <div className="flex justify-between">
            <span>SDK</span>
            <span className="font-medium text-xs">@ramiidv/arca-sdk + arca-cert</span>
          </div>
        </div>
      </div>
    </div>
  );
}
