import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const AUTHORS = [
  '6a48f2f4254797a3f20a8fbc', // David
  '6a420ec135d53d9f36c0579d', // David1
  '6a421f3102e76003f06232ae', // David2
  '6a42471d02e76003f06232de', // David3
  '6a436ad32e1ff5a5e9a6eba9', // David4
  '6a43cdd33e4d2a59c10264d9', // David6
];

function a(i: number) { return new mongoose.Types.ObjectId(AUTHORS[i % AUTHORS.length]); }
function ago(h: number) { return new Date(Date.now() - h * 3600 * 1000); }

// Comments keyed by thread title substring
const COMMENTS: Record<string, { author: number; content: string; hoursAgo: number }[]> = {
  'NVDA Q1 2025': [
    { author: 1, content: "The gross margin story is what keeps me long. 78% at $26B revenue is absurd. AMD is nowhere close on the margin profile.", hoursAgo: 2.5 },
    { author: 2, content: "Bear case: hyperscalers start using their own chips (Google TPU, Amazon Trainium) and NVDA loses pricing power. It's already happening at the margin.", hoursAgo: 2.1 },
    { author: 0, content: "That's a real risk but CUDA moat is underrated. Switching costs aren't just hardware — it's the entire software stack. Years of migration.", hoursAgo: 1.8 },
    { author: 3, content: "Blackwell delays were concerning but they ramped faster than feared. Supply is the real constraint, not demand.", hoursAgo: 1.2 },
    { author: 4, content: "At 35x forward earnings I can't call it cheap but I've said that for 3 years and been wrong every time.", hoursAgo: 0.8 },
  ],
  'ASML: The only company': [
    { author: 2, content: "China revenue was 49% of Q4 last year. The export control cliff is a real near-term headwind even if the long-term thesis is intact.", hoursAgo: 6 },
    { author: 3, content: "Replacement demand alone keeps ASML busy for years — chipmakers can't let EUV machines age out. This isn't purely a growth story.", hoursAgo: 5.5 },
    { author: 1, content: "The real question: when does China successfully build domestic EUV? SMIC won't get there before 2035 at the earliest. Maybe never.", hoursAgo: 4 },
  ],
  'Fed holds at 5.25': [
    { author: 4, content: "Markets have been wrong about cuts for 18 straight months. At some point you stop fading the Fed and just accept higher for longer.", hoursAgo: 0.5 },
    { author: 5, content: "The labor market is the key. 3.9% unemployment with 2.7% core PCE — the Fed has no urgency. They'll cut when unemployment hits 4.5%+.", hoursAgo: 0.4 },
    { author: 0, content: "Or they cut pre-emptively before the labor market breaks. That's the soft landing scenario. Fed credibility depends on threading this needle.", hoursAgo: 0.3 },
    { author: 1, content: "Short duration is the right trade here. TBT has been my best performer YTD.", hoursAgo: 0.2 },
    { author: 2, content: "How are you sizing it? I've been burned twice trying to short bonds.", hoursAgo: 0.15 },
    { author: 1, content: "Small — 3% of portfolio. Asymmetric. Wrong once in a while but the carry while waiting is low now that short rates are 5%+.", hoursAgo: 0.1 },
  ],
  'Novo Nordisk Ozempic': [
    { author: 3, content: "The compounding pharmacy angle is fascinating. FDA has been inconsistent on enforcement. Hims and Ro are printing money on semaglutide copies.", hoursAgo: 5 },
    { author: 4, content: "Once Novo builds out manufacturing and supply shortage ends, compounders get shut down. That's the law — you can only compound a drug that's in shortage.", hoursAgo: 4.5 },
    { author: 2, content: "Oral semaglutide (Rybelsus) is the real unlock for mass market. No injection barrier. Phase 3 data look good.", hoursAgo: 3 },
    { author: 0, content: "Lilly is the one to watch — tirzepatide has better efficacy data than semaglutide in head-to-head trials. NVO vs LLY is the real debate.", hoursAgo: 2 },
  ],
  'Berkshire cash pile': [
    { author: 5, content: "He's been saying stocks are expensive since 2021. Yet he bought Occidental aggressively. The cash pile doesn't mean he sees no value — it means he's waiting for the fat pitch.", hoursAgo: 3 },
    { author: 1, content: "The T-bill yield at 5.3% makes waiting cheaper than any time since 2007. He's getting paid to be patient.", hoursAgo: 2.8 },
    { author: 2, content: "The succession question is underrated. What happens to capital allocation discipline when Buffett is gone? Munger held him accountable too.", hoursAgo: 2.2 },
    { author: 0, content: "Greg Abel has been running the operating businesses for years. The question is whether he has Buffett's temperament for inaction. That's the hardest skill to inherit.", hoursAgo: 1.5 },
    { author: 3, content: "Japan sogo shosha bet was inspired. 5 trading companies at 0.7x book. That's classic Buffett hidden in plain sight.", hoursAgo: 1 },
  ],
  'Tesla margins': [
    { author: 4, content: "The margin compression is worse than it looks because they're also ramping Cybertruck which has negative gross margin. Core Model 3/Y margins are actually holding better.", hoursAgo: 4 },
    { author: 5, content: "FSD take rate is still under 5%. The entire bull thesis depends on autonomous driving monetization and there's no timeline certainty.", hoursAgo: 3.5 },
    { author: 1, content: "Robotaxi announcement in August. If the hardware is proven and the regulatory path clears in Texas first, the valuation math changes completely.", hoursAgo: 3 },
    { author: 2, content: "Tesla is the only company with real-world miles at scale for training autonomous AI. That data moat is worth something even if you can't quantify it yet.", hoursAgo: 2.5 },
    { author: 0, content: "Meanwhile BYD is at $10k per car and profitable. The commoditization of EVs is happening faster than optimists modeled.", hoursAgo: 2 },
    { author: 3, content: "Different markets though — BYD can't sell in the US or Europe in meaningful volume yet due to tariffs. Tesla's China exposure is the real risk.", hoursAgo: 1.5 },
  ],
  'Bitcoin ETF flows': [
    { author: 2, content: "The fastest ETF to $10B in history. IBIT beat GLD which took 2 years. Institutional demand is real and structurally different from prior cycles.", hoursAgo: 7 },
    { author: 3, content: "Demand is real. But miners are now selling immediately post-halving — they're leveraged operations that need cash flow. Supply pressure is persistent.", hoursAgo: 6.5 },
    { author: 4, content: "The halving narrative is overhyped but the ETF narrative is real. These are two separate forces and the ETF demand dwarfs post-halving supply reduction.", hoursAgo: 5 },
    { author: 0, content: "Regulatory risk is underpriced. A single hostile administration action (exchange shutdowns, stablecoin ban) could crater price 40% overnight.", hoursAgo: 4 },
    { author: 1, content: "That's exactly why the ETF wrapper matters — regulated product, custodied by Coinbase, BlackRock's reputation behind it. Much harder to ban.", hoursAgo: 3 },
  ],
  'S&P 500 at all-time highs': [
    { author: 5, content: "Equal-weight vs cap-weight divergence is at historical extremes. Top 10 stocks are 35% of the S&P. This level of concentration has historically resolved with a correction in the leaders, not a catch-up in the laggards.", hoursAgo: 1.3 },
    { author: 0, content: "Or the leaders keep leading because they're actually better businesses. The Magnificent 7 have better margins, better growth, better balance sheets than the average S&P company.", hoursAgo: 1.1 },
    { author: 2, content: "Fair point but you're paying 30x+ for that quality. The question is always valuation vs quality, not just quality.", hoursAgo: 0.9 },
    { author: 3, content: "Put spreads on QQQ are cheap at VIX 13. 3-month 5% OTM put spread costs almost nothing and protects against the most likely correction scenario.", hoursAgo: 0.6 },
  ],
  'Short thesis: regional US banks': [
    { author: 1, content: "The HTM accounting loophole is real but I'd argue the market already knows. Regional bank stocks are already trading at 0.7-0.9x book — some discount is in.", hoursAgo: 2 },
    { author: 4, content: "SVB was a wake-up call but most regionals have since repositioned. The ones still exposed are the smaller community banks with less sophisticated ALM.", hoursAgo: 1.8 },
    { author: 0, content: "Curious which 3 names you're short. The setup differs a lot — a bank with 90%+ FDIC-insured deposits is fine. It's the uninsured deposit concentration that matters.", hoursAgo: 1.5 },
    { author: 2, content: "NYCB was the obvious one post-Signature. The CRE concentration + HTM book + uninsured deposits was the trifecta.", hoursAgo: 1.2 },
    { author: 3, content: "NYCB had to raise equity at a massive discount. Classic dilution play if you caught it early.", hoursAgo: 0.8 },
  ],
  'Apple.*Services': [
    { author: 2, content: "The DMA enforcement in Europe is worth watching. If Apple is forced to allow third-party app stores, the 30% commission on in-app purchases gets competed down. That's $8-10B in high-margin revenue at risk.", hoursAgo: 1.5 },
    { author: 4, content: "Apple Intelligence is the next monetization layer. If they can charge $5-10/month for AI features on top of iCloud, the Services ARPU story gets even better.", hoursAgo: 1 },
    { author: 5, content: "Hardware replacement cycles are lengthening. iPhone 15 to 16 upgrade rate is lower than 14 to 15. The installed base is the story, not new device sales.", hoursAgo: 0.7 },
  ],
  'Copper super-cycle': [
    { author: 0, content: "FCX at 15x EV/EBITDA looks cheap given the structural demand thesis. They also have gold exposure which is a nice hedge.", hoursAgo: 3 },
    { author: 3, content: "The permitting problem in the US is real. Resolution Copper in Arizona has been stuck for 15 years. We're relying on Chilean and Congolese supply for most of the growth.", hoursAgo: 2.5 },
    { author: 1, content: "Chile political risk is rising — Boric government has been pushing for higher royalties. If that passes, Chilean CAPEX gets deferred and the supply gap widens further.", hoursAgo: 2 },
    { author: 5, content: "Long copper via options on FCX or SCCO is more capital efficient than the COPX ETF which has a lot of gold miner dilution.", hoursAgo: 1.5 },
  ],
  'portfolio concentration': [
    { author: 0, content: "I run 12 positions. Top 3 at 15% each, rest at 5-7%. The Kelly criterion math always suggests more concentration than feels comfortable — I size down from Kelly by 50%.", hoursAgo: 8 },
    { author: 2, content: "Depends entirely on your edge. If you have genuine information advantage in 3 names, concentrate. If you're momentum-following 15 names you read about on Substack, diversify.", hoursAgo: 7 },
    { author: 3, content: "My framework: position size = conviction × liquidity. High conviction + liquid = big position. High conviction + illiquid = moderate position (need exit flexibility).", hoursAgo: 6 },
    { author: 4, content: "Volatility sizing makes more sense to me than conviction sizing. Equal risk contribution means your 30-vol stock gets half the notional of your 15-vol stock.", hoursAgo: 5 },
    { author: 1, content: "Whatever method you use — write it down before you buy. The conviction feels different when the stock is down 20%.", hoursAgo: 4 },
  ],
  'Best financial data sources': [
    { author: 1, content: "TIKR is genuinely underrated. The 10-year normalized financials in one view saves hours vs EDGAR. Worth every cent.", hoursAgo: 9 },
    { author: 3, content: "For macro data: FRED is free and comprehensive. For positioning data: COT reports and Goldman's Prime Brokerage data when you can get it.", hoursAgo: 8 },
    { author: 5, content: "Stratechery for tech business model analysis. Not data but the frameworks are excellent.", hoursAgo: 7 },
    { author: 2, content: "SEC EDGAR full-text search (efts.sec.gov) is criminally underused. You can search every 10-K and 8-K for specific language. Great for finding risk disclosures before they're news.", hoursAgo: 6 },
    { author: 0, content: "Substack has replaced sell-side research for me on small/mid caps. The best analysts left banks and write independently now.", hoursAgo: 5 },
    { author: 4, content: "Blind spot for most retail investors: management quality. Call transcripts + Glassdoor + LinkedIn tenure of the CFO. Numbers don't lie but they're backward-looking.", hoursAgo: 3 },
  ],
};

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection;

  await db.collection('threadcomments').deleteMany({});

  const threads = await db.collection('threads').find({}, { projection: { _id: 1, title: 1 } }).toArray();

  let totalComments = 0;

  for (const thread of threads) {
    const title: string = thread.title;
    const threadId = thread._id;

    // Find matching comment set
    const key = Object.keys(COMMENTS).find(k => new RegExp(k).test(title));
    if (!key) continue;

    const commentDefs = COMMENTS[key];
    const docs = commentDefs.map(c => ({
      thread:    threadId,
      author:    new mongoose.Types.ObjectId(AUTHORS[c.author % AUTHORS.length]),
      content:   c.content,
      parent:    null,
      reactions: [],
      createdAt: ago(c.hoursAgo),
    }));

    await db.collection('threadcomments').insertMany(docs);
    await db.collection('threads').updateOne(
      { _id: threadId },
      { $set: { commentCount: docs.length } },
    );
    totalComments += docs.length;
    console.log(`  "${title.slice(0, 50)}" → ${docs.length} comments`);
  }

  console.log(`\nDone. Inserted ${totalComments} comments across ${Object.keys(COMMENTS).length} threads.`);
  await mongoose.disconnect();
}
run();
