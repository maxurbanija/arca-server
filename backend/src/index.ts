import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import invoiceRoutes from './routes/invoices';
import clientRoutes from './routes/clients';
import afipRoutes from './routes/afip';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});
app.use(limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many auth attempts, please try again later' },
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check (public)
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'ARCA Server is running', timestamp: new Date().toISOString() });
});

// Auth routes (public — login/register have own rate limiter)
app.use('/api/auth', authLimiter, authRoutes);

// Protected routes — require JWT or API key
app.use('/api/invoices', authMiddleware, invoiceRoutes);
app.use('/api/clients', authMiddleware, clientRoutes);
app.use('/api/afip', authMiddleware, afipRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`[Server] ARCA Server running on port ${config.port}`);
  console.log(`[Server] Environment: ${config.afip.production ? 'PRODUCTION' : 'HOMOLOGATION'}`);
});

export default app;
