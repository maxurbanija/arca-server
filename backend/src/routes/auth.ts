import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { config } from '../config';
import { authMiddleware, AuthPayload } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const registerSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const apiKeySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
});

function generateToken(user: { id: number; email: string; role: string }): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role } as AuthPayload,
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: 'El email ya esta registrado' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // First user gets admin role
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'admin' : 'user';

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    res.status(201).json({ success: true, token, user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, error: 'Credenciales invalidas' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Credenciales invalidas' });
      return;
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' });
      return;
    }
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// --- API Keys ---

// GET /api/auth/api-keys
router.get('/api-keys', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user!.userId },
      select: { id: true, name: true, key: true, lastUsed: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    // Mask keys — only show first 8 and last 4 chars
    const masked = keys.map((k) => ({
      ...k,
      key: k.key.slice(0, 8) + '...' + k.key.slice(-4),
    }));
    res.json({ success: true, apiKeys: masked });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/api-keys
router.post('/api-keys', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = apiKeySchema.parse(req.body);

    const keyCount = await prisma.apiKey.count({ where: { userId: req.user!.userId } });
    if (keyCount >= 5) {
      res.status(400).json({ success: false, error: 'Maximo 5 API keys por usuario' });
      return;
    }

    const rawKey = `arca_${crypto.randomBytes(32).toString('hex')}`;

    const apiKey = await prisma.apiKey.create({
      data: { name, key: rawKey, userId: req.user!.userId },
      select: { id: true, name: true, key: true, createdAt: true },
    });

    // Return the full key only on creation
    res.status(201).json({ success: true, apiKey });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/api-keys/:id
router.delete('/api-keys/:id', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!apiKey) {
      res.status(404).json({ success: false, error: 'API key no encontrada' });
      return;
    }
    await prisma.apiKey.delete({ where: { id } });
    res.json({ success: true, message: 'API key eliminada' });
  } catch (err) {
    next(err);
  }
});

export default router;
