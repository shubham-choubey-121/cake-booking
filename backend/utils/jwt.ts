import jwt from 'jsonwebtoken';
import { Role } from '../models/User';

interface BasePayload {
  userId: string;
  email: string;
  role: Role;
}

interface AccessPayload extends BasePayload {
  type: 'access';
}

interface RefreshPayload extends BasePayload {
  type: 'refresh';
  sid: string;
}

const accessSecret = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';

export const signAccessToken = (payload: BasePayload): string => {
  const expiresIn =
    (process.env.ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn']) || ('15m' as const);
  return jwt.sign({ ...payload, type: 'access' } satisfies AccessPayload, accessSecret, {
    expiresIn,
  });
};

export const signRefreshToken = (payload: BasePayload, sid: string): string => {
  const expiresIn =
    (process.env.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn']) || ('7d' as const);
  return jwt.sign({ ...payload, type: 'refresh', sid } satisfies RefreshPayload, refreshSecret, {
    expiresIn,
  });
};

export const verifyAccessToken = (token: string): AccessPayload => {
  return jwt.verify(token, accessSecret) as AccessPayload;
};

export const verifyRefreshToken = (token: string): RefreshPayload => {
  return jwt.verify(token, refreshSecret) as RefreshPayload;
};
