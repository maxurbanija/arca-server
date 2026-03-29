/**
 * Extrae el mensaje de error más útil de un error de axios/API.
 * Prioriza el mensaje del backend (err.response.data.error) sobre
 * el mensaje genérico de axios (err.message).
 * Si hay soapFault, lo incluye para debugging.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as {
    response?: {
      data?: {
        error?: string;
        code?: string;
        details?: unknown;
        soapFault?: { faultcode?: string; faultstring?: string };
      };
    };
  };

  const data = axiosErr?.response?.data;

  if (!data?.error) return fallback;

  let msg = data.error;

  if (data.soapFault?.faultstring) {
    msg += ` (${data.soapFault.faultcode}: ${data.soapFault.faultstring})`;
  }

  return msg;
}
