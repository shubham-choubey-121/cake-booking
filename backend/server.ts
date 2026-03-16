import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import passport from 'passport';
import authRoutes from './routes/auth';
import cakesRoutes from './routes/cakes';
import bookingsRoutes from './routes/bookings';
import ordersRoutes from './routes/orders';
import { connectRedis } from './redis';
import { getCloudinaryConfigError } from './utils/cloudinary';
import './utils/passport';

export const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(passport.initialize());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    message: 'Cake Booking API is running',
    health: '/health',
  });
});

app.use('/auth', authRoutes);
app.use('/cakes', cakesRoutes);
app.use('/bookings', bookingsRoutes);
app.use('/orders', ordersRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const startServer = async () => {
  const port = Number(process.env.PORT || 5000);
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/cake_booking';

  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');

  await connectRedis();
  const cloudinaryConfigError = getCloudinaryConfigError();
  if (cloudinaryConfigError) {
    console.warn(`Cloudinary disabled: ${cloudinaryConfigError}. Falling back to inline image storage.`);
  }

  // Seed default users if they don't exist
  const { UserModel } = await import('./models/User');
  const bcrypt = (await import('bcryptjs')).default;

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@cake.com';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  const existingAdmin = await UserModel.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await UserModel.create({ email: adminEmail, passwordHash, role: 'Admin' });
    console.log(`Default Admin created: ${adminEmail} / ${adminPassword}`);
  }

  const managerEmail = process.env.DEFAULT_MANAGER_EMAIL || 'manager@cake.com';
  const managerPassword = process.env.DEFAULT_MANAGER_PASSWORD || 'manager123';
  const existingManager = await UserModel.findOne({ email: managerEmail });
  if (!existingManager) {
    const passwordHash = await bcrypt.hash(managerPassword, 10);
    await UserModel.create({ email: managerEmail, passwordHash, role: 'Manager' });
    console.log(`Default Manager created: ${managerEmail} / ${managerPassword}`);
  }

  app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
