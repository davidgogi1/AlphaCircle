import 'dotenv/config';
import mongoose from 'mongoose';
import Post from '../models/Post';
import Thread from '../models/Thread';
import ConsensusEvent from '../models/ConsensusEvent';
import { embedText } from '../services/embeddingService';

// Users pulled from the live DB
const U: Record<string, string> = {
  david8:  '6a4611d53502479060ffc9cc',
  david9:  '6a4611d53502479060ffc9cf',
  david13: '6a4611d63502479060ffc9db',
  david16: '6a4611d73502479060ffc9e4',
  david21: '6a47ac4866d54ec91b2bed26',
  david2:  '6a421f3102e76003f06232ae',
  david3:  '6a42471d02e76003f06232de',
  david12: '6a4611d63502479060ffc9d8',
  david17: '6a4611d73502479060ffc9e7',
  david24: '6a4a03acc1dbd18df5423406',
};

// Topic tags pulled from the live DB
const T: Record<string, string> = {
  materials: '6a4b5ded6ff726f3715ff8e3',
  industrials: '6a4b5ded6ff726f3715ff8e4',
  cons_stap: '6a4b5ded6ff726f3715ff8e6',
  fin: '6a4b5ded6ff726f3715ff8e8',
  it: '6a4b5ded6ff726f3715ff8e9',
  utilities: '6a4b5ded6ff726f3715ff8eb',
  regulation: '6a4b5ded6ff726f3715ff8f2',
  value: '6a4b5ded6ff726f3715ff8f3',
  dividends: '6a4b5ded6ff726f3715ff8f5',
  byd: '6a4b5ded6ff726f3715ff908',
};

const oid = (s: string) => new mongoose.Types.ObjectId(s);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000);

// Each entry is written to deliberately avoid the literal words a natural
// paraphrased search query would use, so semantic search has something
// real to demonstrate beyond what the keyword regex already catches.
const POSTS = [
  {
    author: U.david8,
    title: 'The bottleneck nobody\'s pricing in',
    content: `Everyone's modeling GPU supply as the constraint on AI buildout. It's not. I spent the weekend digging into interconnection queues for new substations near major hyperscaler campuses in Virginia and Texas — wait times are now 3-5 years in some utility territories. You can have all the chips you want; if there's no power to plug them into, the datacenter doesn't get built. NextEra and Southern Company are quietly becoming AI infrastructure plays whether they like it or not. I'm long both as a picks-and-shovels bet that doesn't require picking the AI model winner.`,
    createdAt: daysAgo(3),
  },
  {
    author: U.david9,
    title: 'The subscription squeeze is just getting started',
    content: `Netflix's account-sharing crackdown added millions of paying households almost overnight — margin expansion nobody had to build a new product for. Now Disney and Max are running the same playbook. This isn't really about piracy, it's about converting free riders into ARPU. The next leg is bundling: expect more cross-promotional packages designed to raise the total household spend rather than compete on price. Whoever nails the bundle economics without cannibalizing standalone subs wins the next two years.`,
    createdAt: daysAgo(5),
  },
  {
    author: U.david13,
    title: 'Reading through Q2 snack food commentary — something\'s shifting',
    content: `Three different packaged food companies mentioned "moderating portion sizes" and "changing consumption occasions" on their calls this quarter without ever saying the words everyone's thinking. Volumes in salty snacks and confectionery are softening in a way that doesn't map cleanly to price elasticity — the units-per-household trend looks structural, not cyclical. Management teams are being cagey about naming the cause directly, but the timing lines up too well with appetite-suppressant drug adoption curves to be coincidence. Reformulating toward smaller portions and protein-forward products isn't a response to inflation, it's a response to fewer calories being wanted at all.`,
    createdAt: daysAgo(2),
  },
  {
    author: U.david16,
    title: 'Store brands are winning share and staying',
    content: `Grocery private label penetration keeps climbing and — this is the part that matters — retention rates among shoppers who trial a store brand during a squeeze are holding up even as inflation cools. Once someone discovers the generic version is functionally identical, they don't reliably trade back up. National brand pricing power in staples categories is quietly eroding one trial purchase at a time. I'd be cautious on names with weak differentiation outside of pure brand equity.`,
    createdAt: daysAgo(6),
  },
  {
    author: U.david21,
    title: 'An underappreciated line item: cyber coverage costs',
    content: `Buried in a mid-cap industrial's 10-K risk factors: cyber insurance premiums up over 40% year over year, with insurers now requiring documented incident response plans and mandatory multi-factor authentication just to underwrite a policy. Ransomware payouts have made underwriters far pickier, and coverage caps are shrinking even as premiums rise. This is becoming a real, measurable cost of doing business for any company holding customer data, and I don't think it's fully modeled into SG&A assumptions across small and mid caps yet.`,
    createdAt: daysAgo(1),
  },
];

const THREADS = [
  {
    author: U.david2,
    tags: [T.materials, T.byd],
    title: 'Sodium-ion batteries could break the lithium chokehold',
    content: `CATL and a handful of Chinese battery makers are pushing sodium-ion chemistry into production for entry-level EVs and stationary storage. Energy density is lower than lithium-ion, so it won't touch premium long-range vehicles anytime soon, but for city runabouts and grid storage the economics are compelling — sodium is essentially unlimited and doesn't carry the geopolitical baggage of cobalt or the price volatility of lithium carbonate. If this scales, it materially changes the input-cost assumptions everyone's using for mass-market EV margins. Curious if anyone's tracking capacity ramp timelines on this.`,
    createdAt: daysAgo(4),
  },
  {
    author: U.david3,
    tags: [T.industrials, T.regulation],
    title: 'The "just in case" supply chain is here to stay',
    content: `Talked to a friend running procurement at a mid-size industrial manufacturer — they've added a second qualified supplier in Mexico for components that used to come exclusively from a single Chinese vendor, and leadership explicitly told him cost is no longer the only variable in the sourcing decision. Redundancy has a price tag and boards are willing to pay it after three separate shock events in five years. This shows up as margin drag in the short term but I think it's a durable, multi-year capex cycle for anyone selling automation, logistics infrastructure, or industrial real estate in Mexico and Southeast Asia.`,
    createdAt: daysAgo(7),
  },
  {
    author: U.david12,
    tags: [T.fin],
    title: 'Non-bank lenders are eating regional banks\' lunch, quietly',
    content: `Post-2023 regional bank stress, capital requirements tightened enough that a lot of mid-market corporate lending simply moved off bank balance sheets entirely. Private credit funds are now originating deals that would have been syndicated bank loans five years ago, at wider spreads, with covenants banks can no longer justify given their cost of capital. This isn't a niche trend anymore — it's a structural reallocation of who bears credit risk in the economy, happening almost entirely outside public market visibility. Worth understanding who's actually holding this risk before the next credit cycle turns.`,
    createdAt: daysAgo(2),
  },
  {
    author: U.david17,
    tags: [T.it, T.regulation],
    title: 'Domestic fab buildout is a multi-decade bet, not a 2025 story',
    content: `Everyone got excited about groundbreaking ceremonies for new fabrication plants in Arizona and Ohio, but the realistic timeline from shovel-in-ground to meaningful high-yield output at leading-edge nodes is 5-7 years, and that's assuming no permitting delays or labor shortages, both of which are already showing up. Subsidies solve the capital problem, not the talent problem — there simply aren't enough experienced fab process engineers in the US right now, and importing them is its own political fight. I like the long-term thesis but I think the market is pricing in a timeline that's too aggressive by half.`,
    createdAt: daysAgo(9),
  },
  {
    author: U.david24,
    tags: [T.dividends, T.value],
    title: 'Why more companies are choosing buybacks over raising the dividend',
    content: `A dividend increase is a public commitment the market punishes you for cutting later — a buyback is optional and can be paused quietly with zero headline risk. That asymmetry is why I think we keep seeing capital return skew further toward repurchases even at managements that talk about wanting to be "shareholder friendly" with income investors. It's not really about tax efficiency anymore, it's about flexibility and avoiding the reputational cost of ever reversing course. Curious whether anyone models this distinction when screening for capital discipline.`,
    createdAt: daysAgo(5),
  },
];

const POLLS = [
  { company: 'Apple', ticker: 'AAPL', period: 'Q3 2026', eventDate: daysFromNow(9), metrics: [
    { key: 'revenue', label: 'Revenue', unit: '$B', description: 'Total net sales' },
    { key: 'iphone', label: 'iPhone Revenue', unit: '$B', description: 'iPhone segment sales' },
    { key: 'services', label: 'Services Revenue', unit: '$B', description: 'App Store, iCloud, subscriptions' },
    { key: 'eps', label: 'EPS', unit: '$', description: 'Basic earnings per share' },
  ]},
  { company: 'Alphabet', ticker: 'GOOGL', period: 'Q2 2026', eventDate: daysFromNow(11), metrics: [
    { key: 'revenue', label: 'Revenue', unit: '$B', description: 'Total revenue' },
    { key: 'cloud', label: 'Cloud Revenue', unit: '$B', description: 'Google Cloud segment revenue' },
    { key: 'adrevenue', label: 'Ad Revenue', unit: '$B', description: 'Search + YouTube advertising' },
    { key: 'eps', label: 'EPS', unit: '$', description: 'Basic earnings per share' },
  ]},
  { company: 'Amazon', ticker: 'AMZN', period: 'Q2 2026', eventDate: daysFromNow(13), metrics: [
    { key: 'revenue', label: 'Revenue', unit: '$B', description: 'Total net sales' },
    { key: 'aws', label: 'AWS Revenue', unit: '$B', description: 'Amazon Web Services segment revenue' },
    { key: 'opmargin', label: 'Operating Margin', unit: '%', description: 'Consolidated operating margin' },
    { key: 'eps', label: 'EPS', unit: '$', description: 'Basic earnings per share' },
  ]},
  { company: 'NVIDIA', ticker: 'NVDA', period: 'Q2 FY2027', eventDate: daysFromNow(16), metrics: [
    { key: 'revenue', label: 'Revenue', unit: '$B', description: 'Total revenue' },
    { key: 'datacenter', label: 'Data Center Revenue', unit: '$B', description: 'Data Center segment revenue' },
    { key: 'grossmargin', label: 'Gross Margin', unit: '%', description: 'Non-GAAP gross margin' },
    { key: 'eps', label: 'EPS', unit: '$', description: 'Non-GAAP earnings per share' },
  ]},
  { company: 'Shopify', ticker: 'SHOP', period: 'Q2 2026', eventDate: daysFromNow(19), metrics: [
    { key: 'revenue', label: 'Revenue', unit: '$M', description: 'Total revenue' },
    { key: 'gmv', label: 'GMV', unit: '$B', description: 'Gross merchandise volume' },
    { key: 'fcfmargin', label: 'Free Cash Flow Margin', unit: '%', description: 'FCF as % of revenue' },
    { key: 'eps', label: 'EPS', unit: '$', description: 'Diluted earnings per share' },
  ]},
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);

  console.log(`Creating ${POSTS.length} posts...`);
  for (const p of POSTS) {
    const embedding = await embedText(`${p.title}\n${p.content}`);
    await Post.create({ ...p, author: oid(p.author), embedding });
    process.stdout.write('.');
  }

  console.log(`\nCreating ${THREADS.length} threads...`);
  for (const t of THREADS) {
    const embedding = await embedText(`${t.title}\n${t.content}`);
    const tags = t.tags.map(oid);
    await Thread.create({ ...t, author: oid(t.author), tags, topic: tags[0], embedding });
    process.stdout.write('.');
  }

  console.log(`\nCreating ${POLLS.length} polls (consensus events)...`);
  for (const poll of POLLS) {
    await ConsensusEvent.create({ ...poll, eventType: 'Earnings Release' });
    process.stdout.write('.');
  }

  console.log('\nDone.');
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
