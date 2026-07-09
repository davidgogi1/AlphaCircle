import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection;

  // Find users whose username does NOT start with "david" (case-insensitive)
  const toDelete = await db.collection('users')
    .find({ username: { $not: /^david/i } }, { projection: { _id: 1, username: 1 } })
    .toArray();

  if (toDelete.length === 0) {
    console.log('No non-David users found.');
    await mongoose.disconnect();
    return;
  }

  console.log('Deleting users:', toDelete.map(u => u.username));
  const ids = toDelete.map(u => u._id);

  // Remove their content across collections
  const posts    = await db.collection('posts').deleteMany({ author: { $in: ids } });
  const comments = await db.collection('comments').deleteMany({ author: { $in: ids } });
  const reactions= await db.collection('reactions').deleteMany({ user: { $in: ids } });
  const follows  = await db.collection('follows').deleteMany({ $or: [{ follower: { $in: ids } }, { following: { $in: ids } }] });
  const groupRead= await db.collection('groupreads').deleteMany({ user: { $in: ids } });
  const users    = await db.collection('users').deleteMany({ _id: { $in: ids } });

  console.log(`Deleted: ${users.deletedCount} users, ${posts.deletedCount} posts, ${comments.deletedCount} comments, ${reactions.deletedCount} reactions, ${follows.deletedCount} follows, ${groupRead.deletedCount} groupReads`);

  await mongoose.disconnect();
}
run();
