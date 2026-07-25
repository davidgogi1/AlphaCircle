import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAttachment {
  filename:     string;
  originalname: string;
  mimetype:     string;
  size:         number;
}

export interface IReaction {
  user: Types.ObjectId;
  type: string;
}

export interface IMessage extends Document {
  conversationId: string;
  sender:         Types.ObjectId;
  recipient:      Types.ObjectId;
  content:        string;
  attachment?:    IAttachment;
  reactions:      Types.DocumentArray<IReaction & { _id: Types.ObjectId }>;
  replyTo:        Types.ObjectId | null;
  read:           boolean;
  createdAt:      Date;
}

const AttachmentSchema = new Schema<IAttachment>({
  filename:     { type: String, required: true },
  originalname: { type: String, required: true },
  mimetype:     { type: String, required: true },
  size:         { type: Number, required: true },
}, { _id: false });

const ReactionSchema = new Schema<IReaction>(
  { user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['like','love','haha','wow','sad','angry'] } },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>({
  conversationId: { type: String, required: true },
  sender:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content:        { type: String, default: '', trim: true, maxlength: 2000 },
  attachment:     { type: AttachmentSchema, default: undefined },
  reactions:      { type: [ReactionSchema], default: [] },
  replyTo:        { type: Schema.Types.ObjectId, ref: 'Message', default: null },
  read:           { type: Boolean, default: false },
  createdAt:      { type: Date, default: Date.now },
});

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
