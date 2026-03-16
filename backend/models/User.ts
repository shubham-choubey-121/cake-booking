import { Schema, model, Document } from 'mongoose';

export type Role = 'Admin' | 'Manager' | 'User';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: Role;
  isApproved: boolean;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Manager', 'User'], default: 'User' },
    isApproved: { type: Boolean, default: true },
    refreshTokens: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const UserModel = model<IUser>('User', userSchema);
