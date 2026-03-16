import { Schema, model, Document, Types } from 'mongoose';

export type BookingStatus = 'Booked' | 'Approved' | 'Cancelled';

export interface IBooking extends Document {
  userId: Types.ObjectId;
  cakeId: Types.ObjectId;
  status: BookingStatus;
  paymentType: 'COD';
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cakeId: { type: Schema.Types.ObjectId, ref: 'Cake', required: true },
    status: { type: String, enum: ['Booked', 'Approved', 'Cancelled'], default: 'Booked' },
    paymentType: { type: String, enum: ['COD'], default: 'COD' },
  },
  { timestamps: true }
);

export const BookingModel = model<IBooking>('Booking', bookingSchema);
