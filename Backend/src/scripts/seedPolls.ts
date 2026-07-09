import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import User from '../models/User';
import Poll from '../models/Poll';

function pickN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

const POLLS_DATA = [
  {
    question: 'Stocks or Real Estate for long-term wealth building?',
    age: 2,
    options: [
      { text: 'Stocks — higher liquidity, easier diversification', weight: 4 },
      { text: 'Real Estate — tangible asset, leverage, cash flow', weight: 3 },
      { text: 'Split 50/50 — balance is key', weight: 2 },
      { text: 'Neither — I prefer bonds and alternatives', weight: 1 },
    ],
  },
  {
    question: 'Is Bitcoin a legitimate long-term store of value?',
    age: 5,
    options: [
      { text: 'Yes — digital gold, fixed supply', weight: 4 },
      { text: 'No — pure speculation with no intrinsic value', weight: 2 },
      { text: 'Maybe — still proving itself', weight: 3 },
      { text: 'It\'s a bubble waiting to pop', weight: 1 },
    ],
  },
  {
    question: 'Best investing strategy for the next 5 years?',
    age: 10,
    options: [
      { text: 'S&P 500 index funds — set and forget', weight: 5 },
      { text: 'Individual stock picking', weight: 2 },
      { text: 'Real estate + REITs', weight: 3 },
      { text: 'Crypto portfolio', weight: 1 },
      { text: 'Diversified across all of the above', weight: 4 },
    ],
  },
  {
    question: 'Will the S&P 500 outperform in 2025?',
    age: 1,
    options: [
      { text: 'Yes, double digit returns again', weight: 3 },
      { text: 'Flat year, 0–5% gains', weight: 3 },
      { text: 'Correction incoming, negative returns', weight: 2 },
      { text: 'Massive crash, 20%+ drop', weight: 1 },
    ],
  },
  {
    question: 'Should companies prioritize dividends or reinvest profits for growth?',
    age: 18,
    options: [
      { text: 'Pay dividends — reward shareholders', weight: 3 },
      { text: 'Reinvest for growth — compound returns', weight: 4 },
      { text: 'Buybacks are better than dividends', weight: 2 },
      { text: 'Depends entirely on the company\'s stage', weight: 5 },
    ],
  },
  {
    question: 'Best AI stock to hold for the next decade?',
    age: 6,
    options: [
      { text: 'Nvidia — GPU monopoly on AI training', weight: 5 },
      { text: 'Microsoft — OpenAI partnership + Azure', weight: 4 },
      { text: 'Alphabet — DeepMind + search dominance', weight: 3 },
      { text: 'Meta — massive AI infra investment', weight: 2 },
    ],
  },
  {
    question: 'Is now a good time to buy a house?',
    age: 30,
    options: [
      { text: 'Yes — rates will stay high, just buy', weight: 2 },
      { text: 'Wait for rates to drop', weight: 4 },
      { text: 'Market will crash, hold off', weight: 2 },
      { text: 'Never buy — renting is smarter', weight: 1 },
    ],
  },
  {
    question: 'GOAT debate: LeBron James or Michael Jordan?',
    age: 3,
    options: [
      { text: 'Michael Jordan — 6-0 in the Finals, untouchable', weight: 4 },
      { text: 'LeBron James — longevity + versatility', weight: 3 },
      { text: 'Different eras, impossible to compare', weight: 3 },
      { text: 'Neither — Kareem has the most MVPs', weight: 1 },
    ],
  },
  {
    question: 'What\'s the biggest risk to markets in 2025?',
    age: 12,
    options: [
      { text: 'Inflation coming back', weight: 3 },
      { text: 'Geopolitical conflict', weight: 4 },
      { text: 'AI bubble bursting', weight: 3 },
      { text: 'Federal debt crisis', weight: 2 },
    ],
  },
  {
    question: 'Which asset class will outperform in the next recession?',
    age: 48,
    options: [
      { text: 'Gold — classic safe haven', weight: 3 },
      { text: 'US Treasuries — risk-free rate', weight: 2 },
      { text: 'Cash — optionality is king', weight: 2 },
      { text: 'Distressed equities — buy the dip', weight: 4 },
    ],
  },
];

async function seedPolls() {
  await connectDB();

  const existing = await Poll.countDocuments();
  if (existing >= POLLS_DATA.length) {
    console.log(`Polls already seeded (${existing} exist), skipping.`);
    await mongoose.disconnect();
    return;
  }

  const allUsers = await User.find({ username: /^David\d+$/ }).lean();
  if (allUsers.length < 3) {
    console.error('Not enough users found. Run the main seed script first.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Seeding polls with ${allUsers.length} users…`);

  for (const pd of POLLS_DATA) {
    const exists = await Poll.findOne({ question: pd.question });
    if (exists) { console.log(`Poll "${pd.question.slice(0, 40)}…" exists, skipping`); continue; }

    // Pick a creator
    const creator = pick(allUsers);
    const others  = allUsers.filter(u => u._id.toString() !== creator._id.toString());

    // Distribute votes according to weights
    const totalWeight  = pd.options.reduce((s, o) => s + o.weight, 0);
    const totalVoters  = Math.floor(allUsers.length * 0.65); // ~65% of users vote
    const voterPool    = pickN(others, totalVoters);

    let voterIndex = 0;
    const optionsWithVoters = pd.options.map(opt => {
      const share  = Math.round((opt.weight / totalWeight) * voterPool.length);
      const voters = voterPool.slice(voterIndex, voterIndex + share).map(u => u._id);
      voterIndex += share;
      return { text: opt.text, voters };
    });

    const createdAt = hoursAgo(pd.age);
    await Poll.create({ question: pd.question, options: optionsWithVoters, creator: creator._id, createdAt });
    console.log(`Created poll: "${pd.question.slice(0, 50)}…"`);
  }

  console.log('\nDone.');
  await mongoose.disconnect();
}

seedPolls().catch(err => { console.error(err); process.exit(1); });
