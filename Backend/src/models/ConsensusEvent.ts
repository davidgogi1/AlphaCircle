import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMetricDef {
  key:          string;
  label:        string;
  unit:         string;
  description?: string;
}

export interface IConsensusEvent extends Document {
  company:   string;
  ticker:    string;
  period:    string;
  eventType: string;
  eventDate: Date;
  metrics:   IMetricDef[];
  author?:   Types.ObjectId;
  createdAt: Date;
}

const MetricDefSchema = new Schema<IMetricDef>({
  key:         { type: String, required: true },
  label:       { type: String, required: true },
  unit:        { type: String, required: true },
  description: { type: String },
}, { _id: false });

const ConsensusEventSchema = new Schema<IConsensusEvent>({
  company:   { type: String, required: true },
  ticker:    { type: String, required: true },
  period:    { type: String, required: true },
  eventType: { type: String, required: true, default: 'Earnings Release' },
  eventDate: { type: Date,   required: true },
  metrics:   { type: [MetricDefSchema], required: true },
  author:    { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date,   default: Date.now },
});

export default mongoose.model<IConsensusEvent>('ConsensusEvent', ConsensusEventSchema);
