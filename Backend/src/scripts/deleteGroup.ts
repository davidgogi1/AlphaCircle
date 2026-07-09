import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection;

  const groupId = new mongoose.Types.ObjectId('6a4780090105bd5edfc57333');

  const msgs    = await db.collection('chatgroupmessages').deleteMany({ group: groupId });
  const reads   = await db.collection('groupreads').deleteMany({ group: groupId });
  const group   = await db.collection('chatgroups').deleteOne({ _id: groupId });

  console.log(`Deleted: ${group.deletedCount} group, ${msgs.deletedCount} messages, ${reads.deletedCount} groupReads`);
  await mongoose.disconnect();
}
run();
