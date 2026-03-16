import { Router } from 'express';
import { z } from 'zod';
import { BookingModel } from '../models/Booking';
import { CakeModel } from '../models/Cake';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

const router = Router();

const createBookingSchema = z.object({
  cakeId: z.string(),
  paymentType: z.literal('COD'),
});

router.post('/', authMiddleware, requireRole('User'), async (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request body. COD is the only payment type.' });
  }

  const cake = await CakeModel.findById(parsed.data.cakeId);
  if (!cake) {
    return res.status(404).json({ message: 'Cake not found' });
  }

  if (cake.stock <= 0) {
    return res.status(400).json({ message: 'Cake out of stock' });
  }

  cake.stock -= 1;
  cake.available = cake.stock > 0;
  await cake.save();

  const booking = await BookingModel.create({
    userId: req.user!.userId,
    cakeId: cake._id,
    status: 'Booked',
    paymentType: 'COD',
  });

  return res.status(201).json(booking);
});

router.get('/mine', authMiddleware, requireRole('User'), async (req, res) => {
  const bookings = await BookingModel.find({ userId: req.user!.userId })
    .populate('cakeId', 'name price imageURL')
    .sort({ createdAt: -1 });

  return res.json(bookings);
});

router.get('/', authMiddleware, requireRole('Manager', 'Admin'), async (_req, res) => {
  const bookings = await BookingModel.find()
    .populate('userId', 'email role')
    .populate('cakeId', 'name price imageURL')
    .sort({ createdAt: -1 });

  return res.json(bookings);
});

router.patch('/:id/status', authMiddleware, requireRole('Manager', 'Admin'), async (req, res) => {
  const statusSchema = z.object({ status: z.enum(['Approved', 'Cancelled']) });
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const booking = await BookingModel.findByIdAndUpdate(
    req.params.id,
    { status: parsed.data.status },
    { new: true }
  );

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found' });
  }

  return res.json(booking);
});

router.get('/top-cakes', authMiddleware, requireRole('Manager', 'Admin'), async (_req, res) => {
  const topCakes = await BookingModel.aggregate([
    { $group: { _id: '$cakeId', totalBookings: { $sum: 1 } } },
    { $sort: { totalBookings: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'cakes',
        localField: '_id',
        foreignField: '_id',
        as: 'cake',
      },
    },
    { $unwind: '$cake' },
    {
      $project: {
        _id: 0,
        cakeId: '$cake._id',
        name: '$cake.name',
        imageURL: '$cake.imageURL',
        totalBookings: 1,
      },
    },
  ]);

  return res.json(topCakes);
});

router.get('/top-buyers', authMiddleware, requireRole('Manager', 'Admin'), async (_req, res) => {
  const topBuyers = await BookingModel.aggregate([
    {
      $lookup: {
        from: 'cakes',
        localField: 'cakeId',
        foreignField: '_id',
        as: 'cake',
      },
    },
    { $unwind: '$cake' },
    {
      $group: {
        _id: '$userId',
        totalBookings: { $sum: 1 },
        totalSpend: { $sum: '$cake.price' },
      },
    },
    { $sort: { totalBookings: -1, totalSpend: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        userId: '$user._id',
        email: '$user.email',
        totalBookings: 1,
        totalSpend: 1,
      },
    },
  ]);

  return res.json(topBuyers);
});

export default router;
