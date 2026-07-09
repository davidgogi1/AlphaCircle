import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IGroupRead extends Document {
  group:      Types.ObjectId;
  user:       Types.ObjectId;
  lastReadAt: Date;
}

const GroupReadSchema = new Schema<IGroupRead>({
  group:      { type: Schema.Types.ObjectId, ref: 'ChatGroup', required: true },
  user:       { type: Schema.Types.ObjectId, ref: 'User',      required: true },
  lastReadAt: { type: Date, default: Date.now },
});

GroupReadSchema.index({ group: 1, user: 1 }, { unique: true });

export default mongoose.model<IGroupRead>('GroupRead', GroupReadSchema);
