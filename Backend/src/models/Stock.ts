import mongoose, { Document, Schema } from 'mongoose';

export interface IStock extends Document {
  ticker:   string;
  name:     string;
  sector:   string;
  exchange: string;
}

const StockSchema = new Schema<IStock>({
  ticker:   { type: String, required: true, unique: true, uppercase: true },
  name:     { type: String, required: true },
  sector:   { type: String, required: true },
  exchange: { type: String, default: 'NASDAQ' },
});

export default mongoose.model<IStock>('Stock', StockSchema);
