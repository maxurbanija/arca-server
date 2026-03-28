import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  docType: z.number().int().min(0),
  docNumber: z.string().min(1, 'Document number is required').max(20),
  ivaCondition: z.number().int().min(1),
  address: z.string().max(500).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
});

const updateClientSchema = createClientSchema.partial();

// POST / - Create client
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createClientSchema.parse(req.body);

    const client = await prisma.client.create({ data });

    res.status(201).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
});

// GET / - List clients
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { docNumber: { contains: search } },
          ],
        }
      : {};

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          _count: { select: { invoices: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.client.count({ where }),
    ]);

    res.json({
      success: true,
      data: clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /:id - Get client with invoice count
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid client ID' });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        _count: { select: { invoices: true } },
      },
    });

    if (!client) {
      throw new AppError(404, `Client with ID ${id} not found`);
    }

    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
});

// PUT /:id - Update client
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid client ID' });
      return;
    }

    const data = updateClientSchema.parse(req.body);

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, `Client with ID ${id} not found`);
    }

    const client = await prisma.client.update({
      where: { id },
      data,
    });

    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
});

// DELETE /:id - Delete client (only if no invoices)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid client ID' });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { invoices: true } } },
    });

    if (!client) {
      throw new AppError(404, `Client with ID ${id} not found`);
    }

    if (client._count.invoices > 0) {
      throw new AppError(
        409,
        `Cannot delete client "${client.name}" because they have ${client._count.invoices} associated invoice(s). Remove the invoices first.`
      );
    }

    await prisma.client.delete({ where: { id } });

    res.json({ success: true, message: `Client "${client.name}" deleted successfully` });
  } catch (error) {
    next(error);
  }
});

export default router;
