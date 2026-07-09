import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPoll extends Document {
  question: string;
  options:  { text: string; voters: Types.ObjectId[] }[];
  creator:  Types.ObjectId;
  createdAt: Date;
}

const OptionSchema = new Schema(
  { text:   { type: String, required: true, trim: true, maxlength: 100 },
    voters: [{ type: Schema.Types.ObjectId, ref: 'User' }] },
  { _id: true }
);

const PollSchema = new Schema<IPoll>({
  question:  { type: String, required: true, trim: true, maxlength: 300 },
  options:   { type: [OptionSchema], required: true },
  creator:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

PollSchema.index({ createdAt: -1 });
export default mongoose.model<IPoll>('Poll', PollSchema);
