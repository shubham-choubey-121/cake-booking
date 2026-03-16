import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { CakeModel } from '../models/Cake';
import { FileMetadataModel } from '../models/FileMetadata';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { uploadBufferToCloudinary } from '../utils/cloudinary';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const createCakeSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  category: z.string().min(2).default('General'),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
});

const updateCakeSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(5).optional(),
  category: z.string().min(2).optional(),
  price: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0).optional(),
});

router.get('/', async (_req, res) => {
  const cakes = await CakeModel.find().sort({ createdAt: -1 });
  return res.json(cakes);
});

router.post('/', authMiddleware, requireRole('Admin'), upload.single('image'), async (req, res) => {
  const parsed = createCakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request body', errors: parsed.error.issues });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Cake image is required' });
  }

  try {
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype);
    const cake = await CakeModel.create({
      ...parsed.data,
      imageURL: uploadResult.url,
      available: parsed.data.stock > 0,
    });

    await FileMetadataModel.create({
      userId: req.user!.userId,
      filename: req.file.originalname,
      url: uploadResult.url,
    });

    return res.status(201).json(cake);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cake upload failed';
    const statusCode = message.includes('Cloudinary upload unavailable') ? 503 : 502;
    return res.status(statusCode).json({ message });
  }
});

router.put('/:id', authMiddleware, requireRole('Admin'), async (req, res) => {
  const parsed = updateCakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request body', errors: parsed.error.issues });
  }

  const updates = parsed.data;
  if (typeof updates.stock === 'number') {
    Object.assign(updates, { available: updates.stock > 0 });
  }

  const cake = await CakeModel.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!cake) {
    return res.status(404).json({ message: 'Cake not found' });
  }

  return res.json(cake);
});

router.delete('/:id', authMiddleware, requireRole('Admin'), async (req, res) => {
  const deleted = await CakeModel.findByIdAndDelete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: 'Cake not found' });
  }

  return res.json({ message: 'Cake deleted' });
});

export default router;
