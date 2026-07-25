import 'dotenv/config';
import mongoose from 'mongoose';
import Post from '../models/Post';
import { embedText } from '../services/embeddingService';
import { extractHashtags } from '../utils/hashtags';

const U: Record<string, string> = {
  david8:  '6a4611d53502479060ffc9cc',
  david9:  '6a4611d53502479060ffc9cf',
  david12: '6a4611d63502479060ffc9d8',
  david13: '6a4611d63502479060ffc9db',
  david16: '6a4611d73502479060ffc9e4',
  david17: '6a4611d73502479060ffc9e7',
  david21: '6a47ac4866d54ec91b2bed26',
  david24: '6a4a03acc1dbd18df5423406',
  david2:  '6a421f3102e76003f06232ae',
  david3:  '6a42471d02e76003f06232de',
};

const oid = (s: string) => new mongoose.Types.ObjectId(s);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

const POSTS = [
  {
    author: U.david8,
    content: `Loading up on Azure exposure ahead of earnings — #microsoft Copilot attach rates are the number to watch this quarter, not the cloud growth headline.`,
    createdAt: daysAgo(1),
  },
  {
    author: U.david9,
    content: `#microsoft and #openai renegotiating the exclusivity terms could be the most underrated storyline in enterprise software right now.`,
    createdAt: daysAgo(2),
  },
  {
    author: U.david12,
    content: `Microsoft's Azure margins keep expanding while nobody's talking about it — the Copilot bundling strategy is working exactly as designed.`,
    createdAt: daysAgo(3),
  },
  {
    author: U.david13,
    content: `#nvidia Blackwell supply constraints are easing faster than the sell-side models assumed. Bullish into the print.`,
    createdAt: daysAgo(1.5),
  },
  {
    author: U.david16,
    content: `Nvidia GPUs are still the bottleneck for every hyperscaler capex plan I've looked at this quarter.`,
    createdAt: daysAgo(4),
  },
  {
    author: U.david17,
    content: `#tesla delivery numbers missed but #nvidia's data center guide more than made up for the tape reaction today.`,
    createdAt: daysAgo(2.5),
  },
  {
    author: U.david21,
    content: `#openai burn rate keeps climbing but so does enterprise ARR — curious how long investors let the math stay this asymmetric.`,
    createdAt: daysAgo(0.7),
  },
  {
    author: U.david24,
    content: `OpenAI's enterprise pricing changes are going to ripple through every AI wrapper startup pricing page by Q3.`,
    createdAt: daysAgo(3.5),
  },
  {
    author: U.david2,
    content: `#bitcoin miners are quietly becoming the marginal buyer of stranded power capacity — more interesting than the price action itself.`,
    createdAt: daysAgo(5),
  },
  {
    author: U.david3,
    content: `Bitcoin's realized volatility has compressed to levels not seen since 2019, and options markets haven't caught up yet.`,
    createdAt: daysAgo(1.2),
  },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);

  console.log(`Creating ${POSTS.length} hashtag demo posts...`);
  for (const p of POSTS) {
    const hashtags = extractHashtags(p.content);
    const embedding = await embedText(p.content);
    await Post.create({ ...p, author: oid(p.author), hashtags, embedding });
    process.stdout.write('.');
  }

  console.log('\nDone.');
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
