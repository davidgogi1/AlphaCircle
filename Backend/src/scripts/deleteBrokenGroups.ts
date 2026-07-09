import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection;

  // Find all groups whose creator no longer exists
  const groups = await db.collection('chatgroups').find({}).toArray();
  const brokenIds: mongoose.Types.ObjectId[] = [];

  for (const g of groups) {
    const creatorExists = await db.collection('users').findOne({ _id: g.creator }, { projection: { _id: 1 } });
    if (!creatorExists) {
      console.log(`Will delete: "${g.name}" (${g._id})`);
      brokenIds.push(g._id);
    }
  }

  if (brokenIds.length === 0) {
    console.log('No broken groups found.');
    await mongoose.disconnect();
    return;
  }

  const msgs  = await db.collection('chatgroupmessages').deleteMany({ group: { $in: brokenIds } });
  const reads = await db.collection('groupreads').deleteMany({ group: { $in: brokenIds } });
  const result= await db.collection('chatgroups').deleteMany({ _id: { $in: brokenIds } });

  console.log(`\nDeleted: ${result.deletedCount} groups, ${msgs.deletedCount} messages, ${reads.deletedCount} groupReads`);
  await mongoose.disconnect();
}
run();
