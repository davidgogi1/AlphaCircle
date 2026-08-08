import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAttachment {
  filename:     string;
  originalname: string;
  mimetype:     string;
  size:         number;
}

export interface IEncryptedAttachment {
  filename:        string;
  size:            number;
  iv:              string;
  encryptedMeta:   string;
  encryptedMetaIv: string;
}

export interface IReaction {
  user: Types.ObjectId;
  type: string;
}

export interface IChatGroupMessage extends Document {
  group:      Types.ObjectId;
  sender:     Types.ObjectId;
  content:    string;
  attachment?: IAttachment;
  encrypted:          boolean;
  cipherText:         string;
  iv:                 string;
  encryptedKeys:      Map<string, string>; // userId -> RSA-wrapped AES session key, one per current member
  encryptedAttachment?: IEncryptedAttachment;
  reactions:  Types.DocumentArray<IReaction & { _id: Types.ObjectId }>;
  replyTo:    Types.ObjectId | null;
  createdAt:  Date;
}

const AttachmentSchema = new Schema<IAttachment>({
  filename:     { type: String, required: true },
  originalname: { type: String, required: true },
  mimetype:     { type: String, required: true },
  size:         { type: Number, required: true },
}, { _id: false });

const EncryptedAttachmentSchema = new Schema<IEncryptedAttachment>({
  filename:        { type: String, required: true },
  size:            { type: Number, required: true },
  iv:              { type: String, required: true },
  encryptedMeta:   { type: String, required: true },
  encryptedMetaIv: { type: String, required: true },
}, { _id: false });

const ReactionSchema = new Schema<IReaction>(
  { user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['like','love','haha','wow','sad','angry'] } },
  { _id: false }
);

const ChatGroupMessageSchema = new Schema<IChatGroupMessage>({
  group:      { type: Schema.Types.ObjectId, ref: 'ChatGroup', required: true },
  sender:     { type: Schema.Types.ObjectId, ref: 'User',      required: true },
  content:    { type: String, default: '', trim: true, maxlength: 2000 },
  attachment: { type: AttachmentSchema, default: undefined },
  encrypted:      { type: Boolean, default: false },
  cipherText:     { type: String, default: '' },
  iv:             { type: String, default: '' },
  encryptedKeys:  { type: Map, of: String, default: undefined },
  encryptedAttachment: { type: EncryptedAttachmentSchema, default: undefined },
  reactions:  { type: [ReactionSchema], default: [] },
  replyTo:    { type: Schema.Types.ObjectId, ref: 'ChatGroupMessage', default: null },
  createdAt:  { type: Date, default: Date.now },
});

ChatGroupMessageSchema.index({ group: 1, createdAt: 1 });

export default mongoose.model<IChatGroupMessage>('ChatGroupMessage', ChatGroupMessageSchema);
