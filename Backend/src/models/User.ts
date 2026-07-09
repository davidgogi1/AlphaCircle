import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username:        string;
  email:           string;
  password:        string;
  following:       Types.ObjectId[];
  stocks:          string[];
  profileComplete: boolean;
  registrationIp:  string;
  createdAt:       Date;
  // profile fields
  investingSince:  number;
  role:            string;
  strategy:        string;
  aum:             string;
  bio:             string;
  avatar:          string;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  username:        { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:        { type: String, required: true, minlength: 6 },
  following:       { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
  stocks:          { type: [String], default: [] },
  profileComplete: { type: Boolean, default: false },
  registrationIp:  { type: String, default: '' },
  createdAt:       { type: Date, default: Date.now },
  investingSince:  { type: Number, default: null },
  role:            { type: String, default: '' },
  strategy:        { type: String, default: '' },
  aum:             { type: String, default: '' },
  bio:             { type: String, default: '', maxlength: 160 },
  avatar:          { type: String, default: '' },
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
