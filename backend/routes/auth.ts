import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { UserModel } from '../models/User';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { redisClient } from '../redis';

const router = Router();

const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  role: z.enum(['Admin', 'Manager', 'User']).default('User'),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

const refreshCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request body', errors: parsed.error.issues });
  }

  const { email, password, role } = parsed.data;
  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({ email, passwordHash, role });

  return res.status(201).json({
    message: 'Signup successful',
    user: { id: user._id, email: user.email, role: user.role },
  });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request body', errors: parsed.error.issues });
  }

  const { email, password } = parsed.data;
  const user = await UserModel.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const sid = crypto.randomUUID();
  const payload = { userId: String(user._id), email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload, sid);

  await redisClient.set(`rt:${payload.userId}:${sid}`, refreshToken, {
    EX: 7 * 24 * 60 * 60,
  });

  user.refreshTokens = [refreshToken, ...user.refreshTokens].slice(0, 5);
  await user.save();

  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  return res.json({
    message: 'Login successful',
    accessToken,
    user: { id: payload.userId, email: payload.email, role: payload.role },
  });
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token missing' });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const redisKey = `rt:${payload.userId}:${payload.sid}`;
    const tokenInRedis = await redisClient.get(redisKey);
    if (!tokenInRedis || tokenInRedis !== refreshToken) {
      return res.status(401).json({ message: 'Refresh token invalidated' });
    }

    const user = await UserModel.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    await redisClient.del(redisKey);

    const sid = crypto.randomUUID();
    const nextPayload = { userId: payload.userId, email: payload.email, role: payload.role };
    const newAccessToken = signAccessToken(nextPayload);
    const newRefreshToken = signRefreshToken(nextPayload, sid);

    await redisClient.set(`rt:${payload.userId}:${sid}`, newRefreshToken, {
      EX: 7 * 24 * 60 * 60,
    });

    user.refreshTokens = user.refreshTokens
      .filter((token) => token !== refreshToken)
      .concat(newRefreshToken)
      .slice(-5);
    await user.save();

    res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);

    return res.json({
      message: 'Token refreshed',
      accessToken: newAccessToken,
      user: { id: nextPayload.userId, email: nextPayload.email, role: nextPayload.role },
    });
  } catch {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await redisClient.del(`rt:${payload.userId}:${payload.sid}`);
      await UserModel.findByIdAndUpdate(payload.userId, { $pull: { refreshTokens: refreshToken } });
    } catch {
      // Ignore token parse errors during logout.
    }
  }

  res.clearCookie('refreshToken', refreshCookieOptions);
  return res.json({ message: 'Logged out' });
});

export default router;
