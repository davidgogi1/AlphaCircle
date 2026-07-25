import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICommentReaction {
  user: Types.ObjectId;
  type: string;
}

export interface ICommentAttachment {
  filename:     string;
  originalName: string;
  mimetype:     string;
  size:         number;
}

export interface IComment extends Document {
  post:        Types.ObjectId;
  author:      Types.ObjectId;
  content:     string;
  parent:      Types.ObjectId | null;
  reactions:   Types.DocumentArray<ICommentReaction & { _id: Types.ObjectId }>;
  attachment?: ICommentAttachment;
  createdAt:   Date;
}

const ReactionSchema = new Schema<ICommentReaction>(
  { user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['like','love','haha','wow','sad','angry'] } },
  { _id: false }
);

const AttachmentSchema = new Schema<ICommentAttachment>({
  filename:     { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype:     { type: String, required: true },
  size:         { type: Number, required: true },
}, { _id: false });

const CommentSchema = new Schema<IComment>({
  post:       { type: Schema.Types.ObjectId, ref: 'Post',    required: true },
  author:     { type: Schema.Types.ObjectId, ref: 'User',    required: true },
  content:    { type: String, trim: true, maxlength: 500, default: '' },
  parent:     { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
  reactions:  { type: [ReactionSchema], default: [] },
  attachment: { type: AttachmentSchema, default: null },
  createdAt:  { type: Date, default: Date.now },
});

CommentSchema.index({ post: 1, createdAt: 1 });

export default mongoose.model<IComment>('Comment', CommentSchema);
