import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { CakeModel } from '../models/Cake';
import { OrderModel } from '../models/Order';
import { BookingModel } from '../models/Booking';

const router = Router();

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        cakeId: z.string(),
        quantity: z.coerce.number().int().min(1).max(50),
      })
    )
    .min(1)
    .max(20),
});

router.post('/', authMiddleware, requireRole('User'), async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid order request', errors: parsed.error.issues });
  }

  const uniqueCakeIds = [...new Set(parsed.data.items.map((item) => item.cakeId))];
  const cakes = await CakeModel.find({ _id: { $in: uniqueCakeIds } });
  const cakeMap = new Map(cakes.map((cake) => [String(cake._id), cake]));

  const orderItems: Array<{ cakeId: string; quantity: number; unitPrice: number; category: string }> = [];
  let totalValue = 0;

  for (const item of parsed.data.items) {
    const cake = cakeMap.get(item.cakeId);
    if (!cake) {
      return res.status(404).json({ message: `Cake not found for id ${item.cakeId}` });
    }

    if (!cake.available || cake.stock < item.quantity) {
      return res.status(400).json({ message: `Insufficient stock for ${cake.name}` });
    }

    cake.stock -= item.quantity;
    cake.available = cake.stock > 0;
    await cake.save();

    orderItems.push({
      cakeId: String(cake._id),
      quantity: item.quantity,
      unitPrice: cake.price,
      category: cake.category || 'General',
    });

    totalValue += cake.price * item.quantity;
  }

  const order = await OrderModel.create({
    userId: req.user!.userId,
    items: orderItems,
    totalValue,
    status: 'Placed',
  });

  return res.status(201).json(order);
});

router.get('/mine', authMiddleware, requireRole('User'), async (req, res) => {
  const orders = await OrderModel.find({ userId: req.user!.userId })
    .populate('items.cakeId', 'name imageURL category')
    .sort({ createdAt: -1 });

  return res.json(orders);
});

router.get('/top-users', authMiddleware, requireRole('Manager', 'Admin'), async (_req, res) => {
  const orderCount = await OrderModel.estimatedDocumentCount();

  if (orderCount === 0) {
    const fallback = await BookingModel.aggregate([
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
          totalOrderValue: { $sum: '$cake.price' },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { totalOrderValue: -1 } },
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
          totalOrderValue: 1,
          totalOrders: 1,
        },
      },
    ]);

    return res.json(fallback);
  }

  const result = await OrderModel.aggregate([
    {
      $group: {
        _id: '$userId',
        totalOrderValue: { $sum: '$totalValue' },
        totalOrders: { $sum: 1 },
      },
    },
    { $sort: { totalOrderValue: -1 } },
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
        totalOrderValue: 1,
        totalOrders: 1,
      },
    },
  ]);

  return res.json(result);
});

router.get('/category-sales', authMiddleware, requireRole('Manager', 'Admin'), async (_req, res) => {
  const orderCount = await OrderModel.estimatedDocumentCount();

  if (orderCount === 0) {
    const fallback = await BookingModel.aggregate([
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
          _id: { $ifNull: ['$cake.category', 'General'] },
          totalRevenue: { $sum: '$cake.price' },
          totalItemsSold: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
      {
        $project: {
          _id: 0,
          category: '$_id',
          totalRevenue: 1,
          totalItemsSold: 1,
        },
      },
    ]);

    return res.json(fallback);
  }

  const result = await OrderModel.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.category',
        totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
        totalItemsSold: { $sum: '$items.quantity' },
      },
    },
    { $sort: { totalRevenue: -1 } },
    {
      $project: {
        _id: 0,
        category: '$_id',
        totalRevenue: 1,
        totalItemsSold: 1,
      },
    },
  ]);

  return res.json(result);
});

router.get('/perf/explain', authMiddleware, requireRole('Manager', 'Admin'), async (_req, res) => {
  const topUsersPipeline = [
    {
      $group: {
        _id: '$userId',
        totalOrderValue: { $sum: '$totalValue' },
      },
    },
    { $sort: { totalOrderValue: -1 } },
    { $limit: 5 },
  ];

  const categoryPipeline = [
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.category',
        totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ];

  const topUsersExplain = await OrderModel.collection.aggregate(topUsersPipeline).explain('executionStats');
  const categoryExplain = await OrderModel.collection.aggregate(categoryPipeline).explain('executionStats');

  return res.json({
    topUsersExplain,
    categoryExplain,
  });
});

export default router;