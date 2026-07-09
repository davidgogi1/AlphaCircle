import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IConsensusForecast extends Document {
  event:     Types.ObjectId;
  user:      Types.ObjectId;
  values:    Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const ConsensusForecastSchema = new Schema<IConsensusForecast>({
  event:  { type: Schema.Types.ObjectId, ref: 'ConsensusEvent', required: true },
  user:   { type: Schema.Types.ObjectId, ref: 'User',           required: true },
  values: { type: Map, of: Number, required: true },
}, { timestamps: true });

ConsensusForecastSchema.index({ event: 1, user: 1 }, { unique: true });

export default mongoose.model<IConsensusForecast>('ConsensusForecast', ConsensusForecastSchema);
