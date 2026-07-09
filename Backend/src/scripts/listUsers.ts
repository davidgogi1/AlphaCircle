import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const users = await mongoose.connection.collection('users')
    .find({}, { projection: { username: 1, email: 1 } }).toArray();
  console.log(JSON.stringify(users, null, 2));
  await mongoose.disconnect();
}
run();
