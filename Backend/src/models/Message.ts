import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAttachment {
  filename:     string;
  originalname: string;
  mimetype:     string;
  size:         number;
}

// An end-to-end encrypted attachment: the file on disk (`filename`) IS the
// ciphertext, and the real name/mimetype only exist inside `encryptedMeta`,
// unlockable with the same per-recipient wrapped session keys as the message.
export interface IEncryptedAttachment {
  filename:       string; // opaque stored filename, ciphertext bytes
  size:           number;
  iv:             string;
  encryptedMeta:  string; // AES-GCM encrypted {name, mimetype} JSON
  encryptedMetaIv: string;
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
  // End-to-end encryption fields — only populated when `encrypted` is true.
  // Existing (pre-encryption) messages simply have `encrypted: false` and
  // keep using the plain `content`/`attachment` fields above.
  encrypted:          boolean;
  cipherText:         string;
  iv:                 string;
  encryptedKeys:      Map<string, string>; // userId -> RSA-wrapped AES session key
  encryptedAttachment?: IEncryptedAttachment;
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

const MessageSchema = new Schema<IMessage>({
  conversationId: { type: String, required: true },
  sender:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content:        { type: String, default: '', trim: true, maxlength: 2000 },
  attachment:     { type: AttachmentSchema, default: undefined },
  encrypted:      { type: Boolean, default: false },
  cipherText:     { type: String, default: '' },
  iv:             { type: String, default: '' },
  encryptedKeys:  { type: Map, of: String, default: undefined },
  encryptedAttachment: { type: EncryptedAttachmentSchema, default: undefined },
  reactions:      { type: [ReactionSchema], default: [] },
  replyTo:        { type: Schema.Types.ObjectId, ref: 'Message', default: null },
  read:           { type: Boolean, default: false },
  createdAt:      { type: Date, default: Date.now },
});

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
