import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid integer`);
  }
  return parsed;
}

export const config = {
  port: getEnvInt('PORT', 3001),
  databaseUrl: getEnv('DATABASE_URL', 'postgresql://localhost:5432/arca'),
  jwtSecret: getEnv('JWT_SECRET', 'change-me-in-production'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
  afip: {
    cuit: getEnv('AFIP_CUIT', ''),
    certPath: getEnv('AFIP_CERT_PATH', path.resolve(__dirname, '../../certs/cert.crt')),
    keyPath: getEnv('AFIP_KEY_PATH', path.resolve(__dirname, '../../certs/key.key')),
    puntoVenta: getEnvInt('AFIP_PUNTO_VENTA', 1),
    production: getEnvBool('AFIP_PRODUCTION', false),
  },
};

export default config;
