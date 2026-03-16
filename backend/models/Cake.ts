import { Schema, model, Document } from 'mongoose';

export interface ICake extends Document {
  name: string;
  description: string;
  imageURL: string;
  price: number;
  stock: number;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const cakeSchema = new Schema<ICake>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    imageURL: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    available: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CakeModel = model<ICake>('Cake', cakeSchema);
