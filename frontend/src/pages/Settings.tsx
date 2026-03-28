import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { getAfipStatus } from '../api/client';

export default function Settings() {
  const [afipStatus, setAfipStatus] = useState<Record<string, string> | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const [cuit, setCuit] = useState('');
  const [puntoVenta, setPuntoVenta] = useState('1');
  const [environment, setEnvironment] = useState<'homologacion' | 'produccion'>('homologacion');

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* AFIP Configuration */}
      <div className="card">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          Configuracion AFIP
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">CUIT</label>
              <input
                type="text"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                className="input"
                placeholder="20123456789"
              />
            </div>
            <div>
              <label className="label">Punto de Venta</label>
              <input
                type="number"
                value={puntoVenta}
                onChange={(e) => setPuntoVenta(e.target.value)}
                className="input"
                min={1}
              />
            </div>
          </div>

          <div>
            <label className="label">Certificado Digital (.crt)</label>
            <input
              type="file"
              accept=".crt,.pem"
              className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          <div>
            <label className="label">Clave Privada (.key)</label>
            <input
              type="file"
              accept=".key,.pem"
              className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          <div>
            <label className="label">Entorno</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="environment"
                  value="homologacion"
                  checked={environment === 'homologacion'}
                  onChange={() => setEnvironment('homologacion')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Homologacion (Testing)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="environment"
                  value="produccion"
                  checked={environment === 'produccion'}
                  onChange={() => setEnvironment('produccion')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Produccion</span>
              </label>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              <strong>Nota:</strong> Para obtener el certificado digital, ingrese a{' '}
              <a
                href="https://auth.afip.gob.ar"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-amber-900 underline"
              >
                https://auth.afip.gob.ar
              </a>{' '}
              con clave fiscal. Estos ajustes son informativos por ahora y se configuran
              en el archivo de entorno del backend.
            </p>
          </div>
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
                <ArrowPathIcon className="mr-1 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <ArrowPathIcon className="mr-1 h-4 w-4" />
                Verificar Estado
              </>
            )}
          </button>
        </div>

        {afipStatus ? (
          <div className="space-y-3">
            {['AppServer', 'DbServer', 'AuthServer'].map((server) => (
              <div
                key={server}
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
              >
                <span className="text-sm font-medium text-gray-700">{server}</span>
                <span className="flex items-center gap-1.5">
                  {afipStatus[server] === 'OK' ? (
                    <>
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium text-green-700">OK</span>
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="h-5 w-5 text-red-500" />
                      <span className="text-sm font-medium text-red-700">
                        {afipStatus[server] || 'Error'}
                      </span>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500">
            Haga clic en "Verificar Estado" para comprobar la conexion con AFIP
          </p>
        )}
      </div>

      {/* App Info */}
      <div className="card">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          Informacion de la Aplicacion
        </h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Version</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Backend API</span>
            <span className="font-mono text-xs">http://localhost:3001/api</span>
          </div>
          <div className="flex justify-between">
            <span>Framework</span>
            <span className="font-medium">React + Vite + TypeScript</span>
          </div>
        </div>
      </div>
    </div>
  );
}
