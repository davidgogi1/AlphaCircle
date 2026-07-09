import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import Post from '../models/Post';
import Comment from '../models/Comment';

async function run() {
  await connectDB();

  // Manual posts don't have the reactions field at all in MongoDB
  const manualPosts = await Post.find({ reactions: { $exists: false } }).lean();
  console.log(`Found ${manualPosts.length} manual posts to delete`);

  for (const p of manualPosts) {
    const deleted = await Comment.deleteMany({ post: p._id });
    await Post.deleteOne({ _id: p._id });
    console.log(`  Deleted post "${(p.content as string).slice(0, 50)}…" and ${deleted.deletedCount} comments`);
  }

  console.log('Done');
  await mongoose.connection.close();
}

run().catch(e => { console.error(e); process.exit(1); });
