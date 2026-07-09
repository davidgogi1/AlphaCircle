import 'dotenv/config';
import { connectDB } from '../config/db';
import '../models/User'; // register User model
import Post from '../models/Post';

async function run() {
  await connectDB();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    const posts = await Post.find({ createdAt: { $gte: since } })
      .populate('author', 'username')
      .lean();
    console.log('Post count:', posts.length);
    if (posts[0]) {
      const p = posts[0];
      console.log('createdAt:', p.createdAt, typeof p.createdAt);
      console.log('reactions type:', Array.isArray(p.reactions));
      console.log('reactions length:', p.reactions?.length);
      console.log('commentCount:', p.commentCount);
      const hoursAgo = (Date.now() - new Date(p.createdAt as Date).getTime()) / 3_600_000;
      const score = ((p.reactions?.length ?? 0) + (p.commentCount ?? 0) * 2) / Math.pow(hoursAgo + 2, 1.5);
      console.log('score:', score);
    }
    console.log('ALL GOOD');
  } catch(e) {
    console.error('ERROR:', e);
  }
  process.exit(0);
}

run();
