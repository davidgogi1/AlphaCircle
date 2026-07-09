import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMember {
  user:   Types.ObjectId;
  status: 'pending' | 'accepted';
}

export interface IChatGroup extends Document {
  name:                  string;
  creator:               Types.ObjectId;
  members:               Types.DocumentArray<IMember & { _id: Types.ObjectId }>;
  pendingAdminTransfer?: Types.ObjectId;
  createdAt:             Date;
}

const MemberSchema = new Schema<IMember>({
  user:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
});

const ChatGroupSchema = new Schema<IChatGroup>({
  name:                  { type: String, required: true, trim: true, maxlength: 100 },
  creator:               { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members:               { type: [MemberSchema], default: [] },
  pendingAdminTransfer:  { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
  createdAt:             { type: Date, default: Date.now },
});

ChatGroupSchema.index({ 'members.user': 1 });

export default mongoose.model<IChatGroup>('ChatGroup', ChatGroupSchema);
