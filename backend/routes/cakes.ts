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

const cakeSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
});

router.get('/', authMiddleware, async (_req, res) => {
  const cakes = await CakeModel.find().sort({ createdAt: -1 });
  return res.json(cakes);
});

router.post('/', authMiddleware, requireRole('Admin'), upload.single('image'), async (req, res) => {
  const parsed = cakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request body', errors: parsed.error.issues });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'Cake image is required' });
  }

  const uploadResult = await uploadBufferToCloudinary(req.file.buffer);
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
});

router.put('/:id', authMiddleware, requireRole('Admin'), async (req, res) => {
  const parsed = cakeSchema.partial().safeParse(req.body);
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
