import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISaved extends Document {
  user:      Types.ObjectId;
  type:      'post' | 'thread';
  ref:       Types.ObjectId;
  createdAt: Date;
}

const SavedSchema = new Schema<ISaved>({
  user:      { type: Schema.Types.ObjectId, ref: 'User',   required: true },
  type:      { type: String, enum: ['post', 'thread'],      required: true },
  ref:       { type: Schema.Types.ObjectId,                 required: true },
  createdAt: { type: Date, default: Date.now },
});

SavedSchema.index({ user: 1, type: 1, ref: 1 }, { unique: true });

export default mongoose.model<ISaved>('Saved', SavedSchema);
