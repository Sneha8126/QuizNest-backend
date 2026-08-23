import { Schema, model, Document as MongooseDocument, Types } from 'mongoose';

export interface IStoredDocument extends MongooseDocument {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  data: Buffer;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

const storedDocumentSchema = new Schema<IStoredDocument>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    data: { type: Buffer, required: true },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), expires: 0, index: true },
  },
  { timestamps: true }
);

storedDocumentSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.data;
    return ret;
  },
});

export const StoredDocument = model<IStoredDocument>('StoredDocument', storedDocumentSchema);
