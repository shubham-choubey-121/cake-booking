import { Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import passport from 'passport';
import { z } from 'zod';
import { UserModel } from '../models/User';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { redisClient } from '../redis';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

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

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

const refreshCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

const issueAuthTokens = async (user: { _id: unknown; email: string; role: 'Admin' | 'Manager' | 'User'; refreshTokens: string[] }) => {
  const sid = crypto.randomUUID();
  const payload = { userId: String(user._id), email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload, sid);

  await redisClient.set(`rt:${payload.userId}:${sid}`, refreshToken, {
    EX: 7 * 24 * 60 * 60,
  });

  user.refreshTokens = [refreshToken, ...user.refreshTokens].slice(0, 5);

  return {
    accessToken,
    refreshToken,
    user: { id: payload.userId, email: payload.email, role: payload.role },
  };
};

const redirectOAuthSuccess = (res: Response, accessToken: string, user: { id: string; email: string; role: 'Admin' | 'Manager' | 'User' }) => {
  const redirectUrl = new URL('/login', frontendOrigin);
  const encodedUser = Buffer.from(JSON.stringify(user), 'utf8').toString('base64url');
  redirectUrl.searchParams.set('oauth', 'success');
  redirectUrl.searchParams.set('accessToken', accessToken);
  redirectUrl.searchParams.set('user', encodedUser);
  return res.redirect(redirectUrl.toString());
};

const redirectOAuthFailure = (res: Response, message: string) => {
  const redirectUrl = new URL('/login', frontendOrigin);
  redirectUrl.searchParams.set('oauth', 'error');
  redirectUrl.searchParams.set('message', message);
  return res.redirect(redirectUrl.toString());
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
  const isApproved = role === 'Manager' ? false : true;
  const user = await UserModel.create({ email, passwordHash, role, isApproved });

  if (role === 'Manager') {
    return res.status(201).json({
      message: 'Manager signup submitted. Wait for admin approval before login.',
      user: { id: user._id, email: user.email, role: user.role, isApproved: user.isApproved },
    });
  }

  return res.status(201).json({
    message: 'Signup successful',
    user: { id: user._id, email: user.email, role: user.role, isApproved: user.isApproved },
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

  if (user.role === 'Manager' && !user.isApproved) {
    return res.status(403).json({ message: 'Manager account pending admin approval' });
  }

  const tokenBundle = await issueAuthTokens(user);
  await user.save();

  res.cookie('refreshToken', tokenBundle.refreshToken, refreshCookieOptions);

  return res.json({
    message: 'Login successful',
    accessToken: tokenBundle.accessToken,
    user: tokenBundle.user,
  });
});

router.get('/admin/pending-managers', authMiddleware, requireRole('Admin'), async (_req, res) => {
  const pendingManagers = await UserModel.find({ role: 'Manager', isApproved: false })
    .select('_id email role isApproved createdAt')
    .sort({ createdAt: -1 });

  return res.json(pendingManagers);
});

router.patch('/admin/managers/:id/approve', authMiddleware, requireRole('Admin'), async (req, res) => {
  const manager = await UserModel.findOne({ _id: req.params.id, role: 'Manager' });
  if (!manager) {
    return res.status(404).json({ message: 'Manager not found' });
  }

  manager.isApproved = true;
  await manager.save();

  return res.json({
    message: 'Manager approved successfully',
    user: { id: manager._id, email: manager.email, role: manager.role, isApproved: manager.isApproved },
  });
});

router.post('/admin/create-manager', authMiddleware, requireRole('Admin'), async (req, res) => {
  const parsed = z.object({
    email: z.email(),
    password: z.string().min(6),
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request body', errors: parsed.error.issues });
  }

  const { email, password } = parsed.data;
  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({ email, passwordHash, role: 'Manager', isApproved: true });

  return res.status(201).json({
    message: 'Manager created successfully',
    user: { id: user._id, email: user.email, role: user.role, isApproved: user.isApproved },
  });
});

router.get('/oauth/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ message: 'Google OAuth is not configured' });
  }
  return passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get('/oauth/google/callback', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return redirectOAuthFailure(res, 'Google OAuth is not configured');
  }
  passport.authenticate('google', { session: false }, async (error: Error | null, oauthUser: Awaited<ReturnType<typeof UserModel.findOne>> | false) => {
    if (error || !oauthUser) {
      return redirectOAuthFailure(res, 'Google login failed');
    }

    const tokenBundle = await issueAuthTokens(oauthUser);
    await oauthUser.save();
    res.cookie('refreshToken', tokenBundle.refreshToken, refreshCookieOptions);
    return redirectOAuthSuccess(res, tokenBundle.accessToken, tokenBundle.user);
  })(req, res, next);
});

router.get('/oauth/github', (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(503).json({ message: 'GitHub OAuth is not configured' });
  }
  return passport.authenticate('github', { scope: ['user:email'], session: false })(req, res, next);
});

router.get('/oauth/github/callback', (req, res, next) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return redirectOAuthFailure(res, 'GitHub OAuth is not configured');
  }
  passport.authenticate('github', { session: false }, async (error: Error | null, oauthUser: Awaited<ReturnType<typeof UserModel.findOne>> | false) => {
    if (error || !oauthUser) {
      return redirectOAuthFailure(res, 'GitHub login failed');
    }

    const tokenBundle = await issueAuthTokens(oauthUser);
    await oauthUser.save();
    res.cookie('refreshToken', tokenBundle.refreshToken, refreshCookieOptions);
    return redirectOAuthSuccess(res, tokenBundle.accessToken, tokenBundle.user);
  })(req, res, next);
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

router.post('/change-password', authMiddleware, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request body', errors: parsed.error.issues });
  }

  const { currentPassword, newPassword } = parsed.data;
  if (currentPassword === newPassword) {
    return res.status(400).json({ message: 'New password must be different from current password' });
  }

  const user = await UserModel.findById(req.user!.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.refreshTokens = [];
  await user.save();

  res.clearCookie('refreshToken', refreshCookieOptions);
  return res.json({ message: 'Password changed successfully. Please login again.' });
});

export default router;
