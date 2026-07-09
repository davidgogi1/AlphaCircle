import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IThreadCommentReaction {
  user: Types.ObjectId;
  type: string;
}

export interface IThreadComment extends Document {
  thread:    Types.ObjectId;
  author:    Types.ObjectId;
  content:   string;
  parent:    Types.ObjectId | null;
  reactions: Types.DocumentArray<IThreadCommentReaction & { _id: Types.ObjectId }>;
  createdAt: Date;
}

const ReactionSchema = new Schema<IThreadCommentReaction>(
  { user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['like','love','haha','wow','sad','angry'] } },
  { _id: false }
);

const ThreadCommentSchema = new Schema<IThreadComment>({
  thread:    { type: Schema.Types.ObjectId, ref: 'Thread',        required: true },
  author:    { type: Schema.Types.ObjectId, ref: 'User',          required: true },
  content:   { type: String, required: true, trim: true, maxlength: 500 },
  parent:    { type: Schema.Types.ObjectId, ref: 'ThreadComment', default: null },
  reactions: { type: [ReactionSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

ThreadCommentSchema.index({ thread: 1, createdAt: 1 });

export default mongoose.model<IThreadComment>('ThreadComment', ThreadCommentSchema);
