import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IInvite extends Document {
  email:     string;
  token:     string;
  invitedBy: Types.ObjectId;
  used:      boolean;
  expiresAt: Date;
  createdAt: Date;
}

const InviteSchema = new Schema<IInvite>({
  email:     { type: String, required: true, lowercase: true, trim: true },
  token:     { type: String, required: true, unique: true },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  used:      { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

InviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IInvite>('Invite', InviteSchema);
