import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAttachment {
  filename:     string;
  originalname: string;
  mimetype:     string;
  size:         number;
}

export interface IChatGroupMessage extends Document {
  group:      Types.ObjectId;
  sender:     Types.ObjectId;
  content:    string;
  attachment?: IAttachment;
  createdAt:  Date;
}

const AttachmentSchema = new Schema<IAttachment>({
  filename:     { type: String, required: true },
  originalname: { type: String, required: true },
  mimetype:     { type: String, required: true },
  size:         { type: Number, required: true },
}, { _id: false });

const ChatGroupMessageSchema = new Schema<IChatGroupMessage>({
  group:      { type: Schema.Types.ObjectId, ref: 'ChatGroup', required: true },
  sender:     { type: Schema.Types.ObjectId, ref: 'User',      required: true },
  content:    { type: String, default: '', trim: true, maxlength: 2000 },
  attachment: { type: AttachmentSchema, default: undefined },
  createdAt:  { type: Date, default: Date.now },
});

ChatGroupMessageSchema.index({ group: 1, createdAt: 1 });

export default mongoose.model<IChatGroupMessage>('ChatGroupMessage', ChatGroupMessageSchema);
