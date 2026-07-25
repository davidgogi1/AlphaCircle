import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITrustedDevice extends Document {
  user:       Types.ObjectId;
  deviceId:   string;
  userAgent:  string;
  ip:         string;
  city?:      string;
  country?:   string;
  lat?:       number;
  lon?:       number;
  createdAt:  Date;
  lastSeenAt: Date;
}

const TrustedDeviceSchema = new Schema<ITrustedDevice>({
  user:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId:   { type: String, required: true },
  userAgent:  { type: String, default: '' },
  ip:         { type: String, default: '' },
  city:       { type: String },
  country:    { type: String },
  lat:        { type: Number },
  lon:        { type: Number },
  createdAt:  { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
});

TrustedDeviceSchema.index({ user: 1, deviceId: 1 }, { unique: true });

export default mongoose.model<ITrustedDevice>('TrustedDevice', TrustedDeviceSchema);
