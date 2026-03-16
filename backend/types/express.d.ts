import { Role } from '../models/User';

declare global {
  namespace Express {
    interface UserPayload {
      userId: string;
      email: string;
      role: Role;
      sid?: string;
      type: 'access' | 'refresh';
    }

    interface User extends UserPayload {}

    interface Request {
      user?: User;
    }
  }
}

export {};
