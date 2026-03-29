import { Request, Response, NextFunction } from 'express';
import { ArcaAuthError, ArcaWSFEError, ArcaSoapError, ArcaError } from '@ramiidv/arca-sdk';
import { ArcaCertError, parseSoapFault } from 'arca-cert';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error]', err.message);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Prisma known errors
  if (err.constructor?.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    if (prismaErr.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'A record with the same unique fields already exists',
      });
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Record not found',
      });
      return;
    }
  }

  // ARCA SDK errors
  if (err instanceof ArcaAuthError) {
    res.status(503).json({
      success: false,
      error: 'AFIP authentication failed',
      details: err.message,
    });
    return;
  }

  if (err instanceof ArcaWSFEError) {
    res.status(400).json({
      success: false,
      error: 'AFIP rejected the request',
      details: err.errors,
    });
    return;
  }

  if (err instanceof ArcaSoapError) {
    const status = err.statusCode || 502;
    // Try to parse SOAP fault from the error message for a cleaner response
    const fault = parseSoapFault(err.message);
    if (fault?.soapFault) {
      res.status(status).json({
        success: false,
        error: fault.message,
        soapFault: {
          faultcode: fault.soapFault.faultcode,
          faultstring: fault.soapFault.faultstring,
        },
      });
      return;
    }
    res.status(status).json({
      success: false,
      error: 'AFIP service unavailable',
      details: err.message,
    });
    return;
  }

  if (err instanceof ArcaError) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // arca-cert errors
  if (err instanceof ArcaCertError) {
    const statusMap: Record<string, number> = {
      INVALID_CUIT: 400,
      INVALID_ALIAS: 400,
      INVALID_SERVICE: 400,
      LOGIN_FAILED: 401,
      SESSION_EXPIRED: 401,
      PORTAL_ERROR: 502,
      WSAA_ERROR: 502,
      WSASS_ERROR: 502,
      CERTIFICATE_ERROR: 422,
      CRYPTO_ERROR: 500,
      NETWORK_ERROR: 502,
      UNSAFE_URL: 400,
    };
    const status = statusMap[err.code] || 400;

    const response: Record<string, unknown> = {
      success: false,
      error: err.message,
      code: err.code,
    };

    if (err.soapFault) {
      response.soapFault = {
        faultcode: err.soapFault.faultcode,
        faultstring: err.soapFault.faultstring,
      };
    }

    res.status(status).json(response);
    return;
  }

  // Zod validation errors
  if (err.constructor?.name === 'ZodError') {
    const zodErr = err as any;
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: zodErr.errors,
    });
    return;
  }

  // Default server error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
