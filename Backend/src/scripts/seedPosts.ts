import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const USERS = {
  David:   '6a48f2f4254797a3f20a8fbc',
  David1:  '6a420ec135d53d9f36c0579d',
  David2:  '6a421f3102e76003f06232ae',
  David3:  '6a42471d02e76003f06232de',
  David4:  '6a436ad32e1ff5a5e9a6eba9',
  David6:  '6a43cdd33e4d2a59c10264d9',
  David7:  '6a43e7bd3180058ab1fdf453',
  David21: '6a47ac4866d54ec91b2bed26',
};

const ALL_IDS  = Object.values(USERS);
const TYPES    = ['like', 'love', 'haha', 'wow', 'sad', 'angry'] as const;

function oid(s: string) { return new mongoose.Types.ObjectId(s); }

function reactions(userIds: string[], types: (typeof TYPES[number])[]): { user: mongoose.Types.ObjectId; type: string }[] {
  return userIds.map((u, i) => ({ user: oid(u), type: types[i % types.length] }));
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}

const POSTS = [
  // ── HIGH-ACTIVITY trending posts (from non-followed users) ───────────────
  {
    author: USERS.David4,
    title: 'NVIDIA Q1 Blowout: Data Center Revenue Hits $22.6B',
    content: `Blackwell architecture is printing money. $22.6B in data center revenue, up 427% YoY. The inference demand alone is replacing training revenue. Microsoft, Google, and Meta are locked into 3-year supply agreements. At 30x forward sales this looks expensive but the growth runway is unlike anything I've seen in 20 years of tech investing. The real question isn't if margins compress — it's by how much and when. Watching the GB200 NVLink shipment numbers closely this quarter.`,
    reactions: reactions([...ALL_IDS], ['like','love','wow','love','like','wow','love','like']),
    commentCount: 14,
    createdAt: daysAgo(0.3),
  },
  {
    author: USERS.David3,
    title: 'ECB Rate Decision: What the Market Got Wrong',
    content: `Everyone priced in a dovish pivot. Instead Lagarde signalled two more hikes. EUR/USD spike was instant but look at the 2Y Bund — it barely moved. The market had already been pricing in sticky inflation for the core. The real tell was the revision to the staff inflation projections: 2.9% for 2025, up from 2.7%. This isn't transitory anymore. European banks should outperform — higher-for-longer is their friend. BBVA, Santander, ING are my top picks here.`,
    reactions: reactions(ALL_IDS.slice(0,7), ['like','love','wow','like','love','wow','like']),
    commentCount: 9,
    createdAt: daysAgo(0.5),
  },
  {
    author: USERS.David21,
    title: 'Short Thesis on Tesla: The Multiple Is the Story',
    content: `Let me be clear — I'm not shorting the car company. I'm shorting the valuation gap. Tesla trades at 70x forward earnings while delivering 465K vehicles per quarter. Toyota does 2.7M. At parity multiples, TSLA is worth $90. The energy and FSD segments are real but they're not 12-month catalysts. The Cybertruck ramp is a disaster operationally. The margin trajectory is the only thing keeping me from going bigger. Watching the Q2 delivery number on July 2nd like a hawk.`,
    reactions: reactions([...ALL_IDS, USERS.David1], ['love','sad','wow','like','haha','wow','love','sad','like']),
    commentCount: 22,
    createdAt: daysAgo(1),
  },
  {
    author: USERS.David6,
    title: 'ASML Bookings Disappoint — Opportunity or Warning?',
    content: `€3.6B in net bookings vs €5.1B consensus. The stock dropped 8% intraday. My take: this is a timing issue, not a demand issue. TSMC's capex cycle shifted right by two quarters. The EUV backlog is still 2+ years. The lithography monopoly doesn't care about one soft quarter. I added to my position at €780 and I'll add again at €740 if we get there. This is exactly the kind of flush that creates 3-year entry points. Conviction: high.`,
    reactions: reactions(ALL_IDS.slice(1,8), ['like','love','like','wow','love','like','wow']),
    commentCount: 11,
    createdAt: daysAgo(1.5),
  },
  {
    author: USERS.David2,
    title: 'Novo Nordisk: Peak Obesity Drug Fears Are Overblown',
    content: `The bear case is simple: pipeline competition from Lilly, Amgen, Roche will compress margins. The bull case is simpler: there are 650 million obese adults worldwide and GLP-1 penetration is under 3%. Even in the US, the most penetrated market, we're at 7%. The global opportunity dwarfs any competitive pressure over the next 5 years. NOVO.B's 2026 revenue guidance of DKK 275B looks conservative given Wegovy supply chain improvements. I've been long since DKK 220 and I'm not touching it.`,
    reactions: reactions(ALL_IDS, ['like','love','wow','like','love','like','like','wow']),
    commentCount: 7,
    createdAt: daysAgo(2),
  },
  {
    author: USERS.David1,
    title: 'Yield Curve Uninversion: What History Says',
    content: `The 2s10s just went positive for the first time since mid-2023. Every major US recession in modern history was preceded by uninversion, not inversion. The market is celebrating but historically this is when you want to be defensive. Reducing duration, rotating into short-duration investment grade credit and commodities. If the Fed cuts into a labour market that's still tight, they'll regret it — we'll re-accelerate inflation and they'll need to hike again. This cycle isn't over.`,
    reactions: reactions([...ALL_IDS.slice(2), USERS.David1], ['wow','like','love','wow','sad','like','wow']),
    commentCount: 18,
    createdAt: daysAgo(2.5),
  },
  // ── FOLLOWED users' posts (David follows David1, David2, David3, David6, David7) ─
  {
    author: USERS.David1,
    title: 'My Updated Semiconductor Book for H2 2026',
    content: `Q2 earnings gave me clarity I was lacking. Trimming INTC after the foundry division cash burn — $7B loss is not what they guided. Adding to AVGO which is the quiet winner in custom silicon. Marvell is interesting at current levels for AI connectivity. QCOM is my surprise pick — automotive design wins are massively underappreciated. The sector has legs but stock selection matters more than it has in years. Happy to discuss individual names in the comments.`,
    reactions: reactions(ALL_IDS.slice(0,6), ['like','wow','love','like','wow','love']),
    commentCount: 8,
    createdAt: daysAgo(0.4),
  },
  {
    author: USERS.David1,
    content: `Quick update on my European banks position. NII margin expansion is real, non-performing loans are stable, and the capital ratios are the cleanest they've been in a decade. I'm overweight BBVA, BNP, and UniCredit. The political noise in France is a short-term entry point, not a structural problem. Long-term: higher rates + low credit losses + buybacks = a multi-year re-rating story. Am I alone in finding European banks more interesting than US banks right now?`,
    reactions: reactions(ALL_IDS.slice(1,7), ['like','love','like','wow','like','love']),
    commentCount: 5,
    createdAt: daysAgo(3),
  },
  {
    author: USERS.David2,
    title: 'LVMH H1 Results Preview: China Recovery Is the Key',
    content: `Consensus is modelling 4-6% organic growth. I think they're too conservative on the Wines & Spirits segment — Chinese travel retail has snapped back faster than expected. Fashion & Leather is still the engine at 40%+ EBIT margins. The real wildcard is Tiffany — if North America stabilises, that alone adds 50bps to group margins. I'm modelling 7% organic growth and 11.2% EBIT margin. Market will re-rate if they deliver anything above 6%. Bernard Arnault doesn't disappoint often.`,
    reactions: reactions(ALL_IDS.slice(0,5), ['love','like','wow','love','like']),
    commentCount: 6,
    createdAt: daysAgo(1.2),
  },
  {
    author: USERS.David2,
    content: `Chart of the week: Chinese retail sales YoY vs global luxury revenue growth. The correlation is 0.87 over the last 10 years. Current Chinese retail is running at +4.1% YoY. That maps to roughly 6-8% organic growth for the sector. If you're underweight luxury heading into August reporting season you might be leaving money on the table. Richemont and LVMH are my top two.`,
    reactions: reactions(ALL_IDS.slice(2,7), ['like','wow','love','like','wow']),
    commentCount: 3,
    createdAt: daysAgo(4),
  },
  {
    author: USERS.David3,
    title: 'Meta Reality Labs: When Does the Bleeding Stop?',
    content: `$17.7B operating loss last year. Another projected $18-19B this year. The question isn't whether the metaverse vision was right or wrong — it's whether Zuckerberg will keep burning cash while core advertising is printing money. Ray-Ban smart glasses are genuinely selling. That's the first non-failure in this segment. If they can pivot to AR hardware and abandon the full VR metaverse dream, the path to breakeven is clearer. The core business at 40% EBIT margins gives them the luxury of time. But patience has limits.`,
    reactions: reactions([...ALL_IDS.slice(0,4), USERS.David7], ['like','love','haha','wow','like']),
    commentCount: 12,
    createdAt: daysAgo(2),
  },
  {
    author: USERS.David3,
    content: `Checking in on macro signals ahead of the Fed meeting. ISM Manufacturing: 48.5 (contraction). Non-farm payrolls: 175K (cooling). Core PCE: 2.7% (sticky). This is the stagflation lite scenario. Fed will hold but the statement language will be the market mover. Watch for "progress" vs "substantial progress" — that single word shift moved 10Y yields 15bps last time. My positioning: short duration, long energy, long gold.`,
    reactions: reactions(ALL_IDS.slice(1,6), ['wow','like','love','wow','like']),
    commentCount: 4,
    createdAt: daysAgo(5),
  },
  {
    author: USERS.David6,
    title: 'Amazon AWS Growth Reacceleration: 3 Reasons I Believe It',
    content: `1) Enterprise cloud migrations that paused in 2023 are restarting — AWS pipeline conversations are back to pre-pause levels per channel checks. 2) Bedrock is winning AI workloads in regulated industries (healthcare, finance, legal) where data sovereignty matters. 3) Trainium chips are getting traction for training at price/performance ratios that challenge H100s. If AWS reaccelerates to 20%+ growth in H2, AMZN re-rates from 35x to 45x earnings. That's a $250B market cap move. I've been adding to my position since $175.`,
    reactions: reactions([...ALL_IDS.slice(0,6), USERS.David2], ['like','love','wow','love','like','wow','love']),
    commentCount: 9,
    createdAt: daysAgo(0.8),
  },
  {
    author: USERS.David6,
    content: `Anyone else watching the Berkshire 13F filing? New position in Occidental Petroleum, added to Chevron. Buffett is clearly making a bet on oil staying above $70 for the next 5 years. US shale breakeven economics around $55-60 make this asymmetric. With Middle East risk premium compressed, there's a vol buying opportunity in crude. WTI Dec 2026 calls at $80 strike are cheap. Just saying.`,
    reactions: reactions(ALL_IDS.slice(2,7), ['like','wow','like','love','wow']),
    commentCount: 6,
    createdAt: daysAgo(3.5),
  },
  {
    author: USERS.David7,
    title: 'Japan: The Trade That Finally Works',
    content: `10 years of "Japan is cheap" jokes are over. Three things changed: Buffett's trading house bet validated the thesis publicly, yen weakness boosted exporters, and the BOJ rate normalisation is forcing domestic capital reallocation away from JGBs. The Nikkei at 38,000 is not expensive — it's fair value for the first time in 30 years. I'm in Toyota (best positioned EV transition story in the world), Sony (gaming + sensors, massively undervalued sum-of-parts), and Mitsui (diversified with mining exposure). Currency hedge is the key question: I'm 50% hedged.`,
    reactions: reactions([...ALL_IDS.slice(0,5), USERS.David3], ['love','like','wow','love','like','like']),
    commentCount: 7,
    createdAt: daysAgo(1.8),
  },
  {
    author: USERS.David7,
    content: `Microsoft earnings preview: what I'm focused on. Not EPS (will beat). Not revenue (will beat). I want to see: 1) Copilot attach rate on M365 — any signal that enterprise is converting to premium licenses. 2) Azure AI workload mix — GPT-4o inference vs fine-tuning. 3) Operating margin — can they maintain 44%+ while investing in AI infra? The stock is priced for perfection at 35x but the cash generation is extraordinary. $32B FCF last year. Still my largest position.`,
    reactions: reactions(ALL_IDS.slice(1,7), ['like','love','wow','like','love','wow']),
    commentCount: 10,
    createdAt: daysAgo(0.6),
  },
  // ── Additional posts for feed depth ─────────────────────────────────────
  {
    author: USERS.David1,
    content: `Reminder that Apple's Services segment is now $85B annualised revenue growing 14% YoY. That segment alone would be a top-30 S&P 500 company. App Store + iCloud + Apple Pay + Apple TV+ + Arcade. The hardware narrative misses what Apple actually is in 2026: a subscription business with hardware as the moat. Trading at 27x earnings, you're getting the iPhone monopoly for free.`,
    reactions: reactions(ALL_IDS.slice(0,6), ['like','love','like','wow','love','like']),
    commentCount: 5,
    createdAt: daysAgo(6),
  },
  {
    author: USERS.David2,
    content: `Hot take: the EM debt trade is more interesting than EM equities right now. Dollar weakness + commodity tailwinds + improving credit fundamentals in Brazil and Indonesia. JPMorgan EM Bond Index has returned 11% YTD and I still think it has legs. The currency carry in BRL and IDR is compelling with US rates plateau. Local-currency debt gives you both the yield and the FX upside if the dollar weakens further.`,
    reactions: reactions(ALL_IDS.slice(3,8), ['like','wow','love','like','wow']),
    commentCount: 3,
    createdAt: daysAgo(7),
  },
  {
    author: USERS.David3,
    title: 'Airbus vs Boeing: A Decade of Widening Moat',
    content: `Boeing lost the plot somewhere between the 737 MAX crisis and the 2022 supply chain implosion. Airbus delivered 735 aircraft in 2024. Boeing managed 348. The A320neo family backlog is 7,200 aircraft. That's 9 years of production. Airbus has pricing power for the first time in its history. Meanwhile Boeing is burning cash trying to fix quality issues that should have been addressed 5 years ago. AIR.PA at 20x earnings is not expensive for a duopoly with this kind of order visibility.`,
    reactions: reactions(ALL_IDS.slice(1,7), ['like','love','wow','like','love','wow']),
    commentCount: 8,
    createdAt: daysAgo(4),
  },
  {
    author: USERS.David6,
    content: `Copper at $4.80/lb and the market is still sleeping on the energy transition demand story. One offshore wind farm uses 8,000 tonnes of copper. One EV uses 4x the copper of an ICE vehicle. Global copper mine supply is growing at 2% per year. I don't need to model anything exotic to see a structural deficit by 2028. Freeport-McMoRan and Antofagasta are my two picks. Long-dated copper calls are vol-adjusted cheap.`,
    reactions: reactions(ALL_IDS.slice(0,5), ['like','wow','love','like','wow']),
    commentCount: 4,
    createdAt: daysAgo(8),
  },
  {
    author: USERS.David7,
    content: `Back from the Deutsche Bank conference in Frankfurt. Key takeaway: institutional sentiment on European equities has shifted. Net overweight EM dropped 15ppts, net overweight Europe rose 12ppts. The valuation gap vs US is just too wide — STOXX 600 at 13x vs S&P at 22x. The rotation is happening slowly but it's happening. Industrials, energy, and financials are the three sectors everyone mentioned. I came back more confident in my EU tilt.`,
    reactions: reactions(ALL_IDS.slice(2,7), ['love','like','wow','love','like']),
    commentCount: 6,
    createdAt: daysAgo(2.8),
  },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection;

  await db.collection('posts').deleteMany({});
  console.log('Cleared posts.');

  // Make David follow David1, David2, David3, David6, David7
  const followedIds = [USERS.David1, USERS.David2, USERS.David3, USERS.David6, USERS.David7]
    .map(id => new mongoose.Types.ObjectId(id));
  await db.collection('users').updateOne(
    { _id: new mongoose.Types.ObjectId(USERS.David) },
    { $set: { following: followedIds } },
  );
  console.log('David now follows David1, David2, David3, David6, David7.');

  for (const p of POSTS) {
    await db.collection('posts').insertOne({
      title:        p.title ?? '',
      content:      p.content,
      author:       new mongoose.Types.ObjectId(p.author),
      reactions:    p.reactions,
      commentCount: p.commentCount,
      createdAt:    p.createdAt,
    });
  }

  console.log(`Seeded ${POSTS.length} posts.`);
  await mongoose.disconnect();
}
run();
