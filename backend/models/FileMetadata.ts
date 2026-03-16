import { Schema, model, Document, Types } from 'mongoose';

export interface IFileMetadata extends Document {
  userId: Types.ObjectId;
  filename: string;
  url: string;
  uploadedAt: Date;
}

const fileMetadataSchema = new Schema<IFileMetadata>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    filename: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const FileMetadataModel = model<IFileMetadata>('FileMetadata', fileMetadataSchema);
