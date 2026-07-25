import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPendingLogin extends Document {
  user:      Types.ObjectId;
  codeHash:  string;
  ip:        string;
  userAgent: string;
  highRisk:  boolean;
  attempts:  number;
  createdAt: Date;
}

const PendingLoginSchema = new Schema<IPendingLogin>({
  user:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  codeHash:  { type: String, required: true },
  ip:        { type: String, default: '' },
  userAgent: { type: String, default: '' },
  highRisk:  { type: Boolean, default: false },
  attempts:  { type: Number, default: 0 },
  // TTL index — MongoDB auto-deletes this document 600s (10min) after createdAt,
  // so abandoned/expired verification attempts clean themselves up.
  createdAt: { type: Date, default: Date.now, expires: 600 },
});

export default mongoose.model<IPendingLogin>('PendingLogin', PendingLoginSchema);
