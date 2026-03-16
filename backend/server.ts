import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import cakesRoutes from './routes/cakes';
import bookingsRoutes from './routes/bookings';
import { connectRedis } from './redis';

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

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRoutes);
app.use('/cakes', cakesRoutes);
app.use('/bookings', bookingsRoutes);

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
  // Create default Manager if not exists
  const { UserModel } = await import('./models/User');
  const bcrypt = (await import('bcryptjs')).default;
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
