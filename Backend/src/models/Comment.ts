import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICommentReaction {
  user: Types.ObjectId;
  type: string;
}

export interface IComment extends Document {
  post:      Types.ObjectId;
  author:    Types.ObjectId;
  content:   string;
  parent:    Types.ObjectId | null;
  reactions: Types.DocumentArray<ICommentReaction & { _id: Types.ObjectId }>;
  createdAt: Date;
}

const ReactionSchema = new Schema<ICommentReaction>(
  { user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['like','love','haha','wow','sad','angry'] } },
  { _id: false }
);

const CommentSchema = new Schema<IComment>({
  post:      { type: Schema.Types.ObjectId, ref: 'Post',    required: true },
  author:    { type: Schema.Types.ObjectId, ref: 'User',    required: true },
  content:   { type: String, required: true, trim: true, maxlength: 500 },
  parent:    { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
  reactions: { type: [ReactionSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

CommentSchema.index({ post: 1, createdAt: 1 });

export default mongoose.model<IComment>('Comment', CommentSchema);
