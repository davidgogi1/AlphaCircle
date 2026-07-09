import mongoose, { Document, Schema } from 'mongoose';

export type TagType = 'sector' | 'topic' | 'company';

export interface ITopic extends Document {
  name:        string;
  slug:        string;
  description: string;
  icon:        string;
  type:        TagType;
}

const TopicSchema = new Schema<ITopic>({
  name:        { type: String, required: true },
  slug:        { type: String, required: true, unique: true },
  description: { type: String, required: true },
  icon:        { type: String, required: true },
  type:        { type: String, enum: ['sector', 'topic', 'company'], default: 'topic' },
});

export default mongoose.model<ITopic>('Topic', TopicSchema);
