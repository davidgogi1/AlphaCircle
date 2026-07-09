import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection;

  const groups = await db.collection('chatgroups').find({}).toArray();

  for (const g of groups) {
    const creatorExists = await db.collection('users').findOne({ _id: g.creator }, { projection: { username: 1 } });
    const msgCount = await db.collection('chatgroupmessages').countDocuments({ group: g._id });
    const memberUsernames = [];
    for (const m of g.members ?? []) {
      const u = await db.collection('users').findOne({ _id: m.user }, { projection: { username: 1 } });
      memberUsernames.push(u ? u.username : `[DELETED:${m.user}]`);
    }
    const broken = !creatorExists ? '⚠️  BROKEN (creator deleted)' : '✅';
    console.log(`${broken} "${g.name}" | creator: ${creatorExists?.username ?? '[DELETED]'} | members: ${memberUsernames.join(', ')} | msgs: ${msgCount}`);
  }

  await mongoose.disconnect();
}
run();
