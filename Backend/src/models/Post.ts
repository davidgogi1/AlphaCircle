import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReaction {
  user: Types.ObjectId;
  type: string;
}

export interface IAttachment {
  filename:     string;
  originalName: string;
  mimetype:     string;
  size:         number;
}

export interface IPost extends Document {
  title:        string;
  content:      string;
  author:       Types.ObjectId;
  reactions:    Types.DocumentArray<IReaction & { _id: Types.ObjectId }>;
  commentCount: number;
  attachment?:  IAttachment;
  createdAt:    Date;
}

const ReactionSchema = new Schema<IReaction>(
  { user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['like','love','haha','wow','sad','angry'] } },
  { _id: false }
);

const AttachmentSchema = new Schema<IAttachment>({
  filename:     { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype:     { type: String, required: true },
  size:         { type: Number, required: true },
}, { _id: false });

const PostSchema = new Schema<IPost>({
  title:        { type: String, trim: true, maxlength: 200 },
  content:      { type: String, required: true, trim: true, maxlength: 1000 },
  author:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reactions:    { type: [ReactionSchema], default: [] },
  commentCount: { type: Number, default: 0 },
  attachment:   { type: AttachmentSchema, default: null },
  createdAt:    { type: Date, default: Date.now },
});

PostSchema.index({ createdAt: -1 });
export default mongoose.model<IPost>('Post', PostSchema);
