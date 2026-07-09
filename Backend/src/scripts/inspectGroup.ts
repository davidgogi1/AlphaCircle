import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection;

  const group = await db.collection('chatgroups').findOne({ name: 'eu stock' });
  console.log('Group:', JSON.stringify(group, null, 2));

  if (group) {
    const msgs = await db.collection('chatgroupmessages').countDocuments({ group: group._id });
    console.log(`Messages in this group: ${msgs}`);
  }

  await mongoose.disconnect();
}
run();
