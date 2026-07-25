import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IThreadReaction {
  user: Types.ObjectId;
  type: string;
}

export interface IThreadAttachment {
  filename:     string;
  originalName: string;
  mimetype:     string;
  size:         number;
}

export interface IThread extends Document {
  topic:        Types.ObjectId;
  tags:         Types.ObjectId[];
  title:        string;
  content:      string;
  author:       Types.ObjectId;
  reactions:    Types.DocumentArray<IThreadReaction & { _id: Types.ObjectId }>;
  commentCount: number;
  attachment?:  IThreadAttachment;
  embedding?:   number[];
  createdAt:    Date;
}

const ReactionSchema = new Schema<IThreadReaction>(
  { user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['like','love','haha','wow','sad','angry'] } },
  { _id: false }
);

const AttachmentSchema = new Schema<IThreadAttachment>({
  filename:     { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype:     { type: String, required: true },
  size:         { type: Number, required: true },
}, { _id: false });

const ThreadSchema = new Schema<IThread>({
  topic:        { type: Schema.Types.ObjectId, ref: 'Topic', required: false },
  tags:         [{ type: Schema.Types.ObjectId, ref: 'Topic' }],
  title:        { type: String, required: true, trim: true, maxlength: 200 },
  content:      { type: String, required: true, trim: true, maxlength: 2000 },
  author:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reactions:    { type: [ReactionSchema], default: [] },
  commentCount: { type: Number, default: 0 },
  attachment:   { type: AttachmentSchema, default: null },
  embedding:    { type: [Number], select: false },
  createdAt:    { type: Date, default: Date.now },
});

ThreadSchema.index({ topic: 1, createdAt: -1 });
ThreadSchema.index({ tags: 1, createdAt: -1 });

export default mongoose.model<IThread>('Thread', ThreadSchema);
