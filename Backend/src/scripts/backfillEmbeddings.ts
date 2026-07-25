import 'dotenv/config';
import mongoose from 'mongoose';
import Post from '../models/Post';
import Thread from '../models/Thread';
import { embedText } from '../services/embeddingService';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const posts = await Post.find({ embedding: { $exists: false } }).select('title content');
  console.log(`Posts to embed: ${posts.length}`);
  for (const p of posts) {
    p.embedding = await embedText(`${p.title ?? ''}\n${p.content}`);
    await p.save();
    process.stdout.write('.');
  }

  const threads = await Thread.find({ embedding: { $exists: false } }).select('title content');
  console.log(`\nThreads to embed: ${threads.length}`);
  for (const t of threads) {
    t.embedding = await embedText(`${t.title}\n${t.content}`);
    await t.save();
    process.stdout.write('.');
  }

  console.log('\nDone.');
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
