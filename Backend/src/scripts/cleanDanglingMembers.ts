import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection;

  const groups = await db.collection('chatgroups').find({}).toArray();
  let cleaned = 0;

  for (const group of groups) {
    const members: any[] = group.members ?? [];
    const userIds = members.map((m: any) => m.user);

    // Find which user IDs actually exist
    const existing = await db.collection('users')
      .find({ _id: { $in: userIds } }, { projection: { _id: 1 } })
      .toArray();
    const existingSet = new Set(existing.map(u => u._id.toString()));

    const before = members.length;
    const kept   = members.filter((m: any) => existingSet.has(m.user.toString()));

    if (kept.length < before) {
      await db.collection('chatgroups').updateOne(
        { _id: group._id },
        { $set: { members: kept } },
      );
      console.log(`Group "${group.name}": removed ${before - kept.length} dangling member(s)`);
      cleaned++;
    }
  }

  console.log(`Done. ${cleaned} group(s) cleaned.`);
  await mongoose.disconnect();
}
run();
