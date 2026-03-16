import { Schema, model, Document, Types } from 'mongoose';

export type OrderStatus = 'Placed' | 'Paid' | 'Cancelled';

export interface IOrderItem {
  cakeId: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  category: string;
}

export interface IOrder extends Document {
  userId: Types.ObjectId;
  items: IOrderItem[];
  totalValue: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    cakeId: { type: Schema.Types.ObjectId, ref: 'Cake', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], required: true, validate: [(items: IOrderItem[]) => items.length > 0, 'Order must contain at least one item'] },
    totalValue: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['Placed', 'Paid', 'Cancelled'], default: 'Placed' },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ totalValue: -1 });
orderSchema.index({ 'items.cakeId': 1 });
orderSchema.index({ 'items.category': 1, createdAt: -1 });

export const OrderModel = model<IOrder>('Order', orderSchema);