import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const result = await (User as any).updateMany({}, { $set: { onboardingComplete: true } });
  console.log('Updated:', result.modifiedCount, 'users');
  await mongoose.disconnect();
}

run().catch(console.error);
