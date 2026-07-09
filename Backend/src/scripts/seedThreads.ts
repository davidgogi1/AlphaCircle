import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// ── IDs from the live DB ───────────────────────────────────────────────────
const AUTHORS = [
  '6a48f2f4254797a3f20a8fbc', // David
  '6a420ec135d53d9f36c0579d', // David1
  '6a421f3102e76003f06232ae', // David2
  '6a42471d02e76003f06232de', // David3
  '6a436ad32e1ff5a5e9a6eba9', // David4
  '6a43cdd33e4d2a59c10264d9', // David6
];

const T: Record<string, string> = {
  // sectors
  energy:    '6a4b5ded6ff726f3715ff8e2',
  materials: '6a4b5ded6ff726f3715ff8e3',
  industrials:'6a4b5ded6ff726f3715ff8e4',
  cons_disc: '6a4b5ded6ff726f3715ff8e5',
  cons_stap: '6a4b5ded6ff726f3715ff8e6',
  health:    '6a4b5ded6ff726f3715ff8e7',
  fin:       '6a4b5ded6ff726f3715ff8e8',
  it:        '6a4b5ded6ff726f3715ff8e9',
  comms:     '6a4b5ded6ff726f3715ff8ea',
  utilities: '6a4b5ded6ff726f3715ff8eb',
  realestate:'6a4b5ded6ff726f3715ff8ec',
  // topics
  earnings:  '6a4b5ded6ff726f3715ff8ed',
  ma:        '6a4b5ded6ff726f3715ff8ee',
  ipos:      '6a4b5ded6ff726f3715ff8ef',
  macro:     '6a4b5ded6ff726f3715ff8f0',
  technical: '6a4b5ded6ff726f3715ff8f1',
  regulation:'6a4b5ded6ff726f3715ff8f2',
  value:     '6a4b5ded6ff726f3715ff8f3',
  growth:    '6a4b5ded6ff726f3715ff8f4',
  dividends: '6a4b5ded6ff726f3715ff8f5',
  crypto:    '6a4b5ded6ff726f3715ff8f6',
  commodities:'6a4b5ded6ff726f3715ff8f7',
  shortsell: '6a4b5ded6ff726f3715ff8f8',
  // companies
  aapl:      '6a4b5ded6ff726f3715ff8f9',
  msft:      '6a4b5ded6ff726f3715ff8fa',
  nvda:      '6a4b5ded6ff726f3715ff8fb',
  googl:     '6a4b5ded6ff726f3715ff8fc',
  amzn:      '6a4b5ded6ff726f3715ff8fd',
  meta:      '6a4b5ded6ff726f3715ff8fe',
  tsla:      '6a4b5ded6ff726f3715ff8ff',
  asml:      '6a4b5ded6ff726f3715ff900',
  jpm:       '6a4b5ded6ff726f3715ff901',
  nvo:       '6a4b5ded6ff726f3715ff902',
  lvmh:      '6a4b5ded6ff726f3715ff903',
  xom:       '6a4b5ded6ff726f3715ff904',
  visa:      '6a4b5ded6ff726f3715ff905',
  brk:       '6a4b5ded6ff726f3715ff906',
  samsung:   '6a4b5ded6ff726f3715ff907',
  byd:       '6a4b5ded6ff726f3715ff908',
  airbus:    '6a4b5ded6ff726f3715ff909',
  siemens:   '6a4b5ded6ff726f3715ff90a',
  nestle:    '6a4b5ded6ff726f3715ff90b',
  shop:      '6a4b5ded6ff726f3715ff90c',
};

function id(key: string) { return new mongoose.Types.ObjectId(T[key]); }
function author(i: number) { return new mongoose.Types.ObjectId(AUTHORS[i % AUTHORS.length]); }
function ago(days: number, hours = 0) {
  return new Date(Date.now() - (days * 86400 + hours * 3600) * 1000);
}
function reactions(count: number, authorIdx: number) {
  const types = ['like','love','haha','wow','sad','angry'];
  return Array.from({ length: count }, (_, i) => ({
    user: new mongoose.Types.ObjectId(AUTHORS[(authorIdx + i + 1) % AUTHORS.length]),
    type: types[i % types.length],
  }));
}

const threads = [
  // ── NVIDIA / IT / Earnings ─────────────────────────────────────
  {
    title: "NVDA Q1 2025: Another blowout quarter — is the AI trade still intact?",
    content: "Nvidia reported $26B revenue, up 262% YoY. Data center alone was $22.6B. Gross margins held above 78%. At this scale, growth is mathematically harder to sustain. Are we pricing in perfection, or is there still a runway? My base case: supply constraints ease in H2, which both helps and hurts — revenue accelerates but the pricing power narrative weakens. Interested to hear bear cases here.",
    tags: [id('it'), id('earnings'), id('nvda')], author: author(0), commentCount: 14, reactions: reactions(18, 0), createdAt: ago(0, 3),
  },
  {
    title: "ASML: The only company that matters in the semiconductor supply chain",
    content: "ASML's EUV monopoly is genuinely irreplaceable on a 5-10 year horizon. No competitor is close to commercializing extreme ultraviolet lithography. The question is regulatory risk — US-China export controls are already biting. ASML guided down on China revenue. How do you model geopolitical risk for a company with zero real competition but significant concentration?",
    tags: [id('it'), id('regulation'), id('asml')], author: author(1), commentCount: 9, reactions: reactions(11, 1), createdAt: ago(0, 7),
  },
  {
    title: "Microsoft Copilot monetisation: early signals from enterprise deployments",
    content: "Teams using M365 Copilot at $30/seat are reporting 15-20% productivity gains in structured tasks but mixed results in creative work. The real story is lock-in: once Copilot is embedded in workflows, switching costs are enormous. Azure growth of 28% YoY is the engine. Valuation looks stretched at 35x forward earnings, but the moat is widening, not narrowing.",
    tags: [id('it'), id('growth'), id('msft')], author: author(2), commentCount: 7, reactions: reactions(9, 2), createdAt: ago(1, 2),
  },
  {
    title: "Google's AI search overhaul — threat or opportunity for Alphabet?",
    content: "The SGE (Search Generative Experience) rollout is the most consequential product change at Google since PageRank. Ad revenue per query could drop if users get answers without clicking. But the counter: Google has the distribution, the data, and the compute. Gemini is competitive with GPT-4 on most benchmarks. I think the market is underpricing Alphabet's ability to adapt its own moat.",
    tags: [id('it'), id('comms'), id('googl')], author: author(3), commentCount: 12, reactions: reactions(15, 3), createdAt: ago(1, 5),
  },
  // ── Macro / Rates ─────────────────────────────────────────────
  {
    title: "Fed holds at 5.25-5.5% — Powell signals two cuts in 2025, market prices three",
    content: "The divergence between Fed guidance and market pricing has persisted for 18 months. Every time the market front-runs cuts, sticky inflation forces a recalibration. Core PCE at 2.7% is not close enough to 2% to justify easing. I'm positioning for higher-for-longer until I see two consecutive months of sub-2.5% core. Until then, short duration is the trade.",
    tags: [id('macro'), id('fin')], author: author(4), commentCount: 21, reactions: reactions(24, 4), createdAt: ago(0, 1),
  },
  {
    title: "Dollar milkshake theory 2025 update — still valid?",
    content: "Brent Johnson's thesis: USD strengthens as global dollar-denominated debt creates structural demand for dollars, sucking liquidity from EM. Two years in, the dollar is down from 2022 peaks but holding above pre-COVID levels. EM stress is real but contained. My view: the thesis is correct directionally but the timeline is looser than advertised. DXY 110 is possible but not imminent.",
    tags: [id('macro'), id('commodities')], author: author(5), commentCount: 6, reactions: reactions(7, 5), createdAt: ago(2, 4),
  },
  {
    title: "European recession risk: PMIs below 50 for 8 months straight",
    content: "Germany manufacturing PMI printed 42.5, France 44.1. Services are holding the eurozone together but starting to crack. ECB cut earlier than the Fed — smart or premature? Inflation in southern Europe is still elevated. I'm underweight European equities ex-luxury and defense. Anyone constructive on Europe here, I'd genuinely like to hear the bull case.",
    tags: [id('macro'), id('regulation')], author: author(0), commentCount: 17, reactions: reactions(13, 0), createdAt: ago(2, 8),
  },
  {
    title: "Japan rate hike: BOJ finally buries yield curve control",
    content: "BOJ raised rates to 0.5% and abandoned YCC after 15 years. Yen strengthened 5% on the news. Japanese government bonds sold off hard. The carry trade unwind could be significant — estimated $4T in yen-funded positions globally. Watch USD/JPY closely. If we see 135 again, the carry trade unwind accelerates and creates volatility in US Treasuries.",
    tags: [id('macro'), id('fin')], author: author(1), commentCount: 8, reactions: reactions(19, 1), createdAt: ago(3, 2),
  },
  // ── Healthcare / Biotech ──────────────────────────────────────
  {
    title: "Novo Nordisk Ozempic supply: constraint is the bottleneck, not demand",
    content: "Novo confirmed they can't manufacture GLP-1 agonists fast enough to meet demand. They're building 5 new facilities. The real question: when does manufacturing capacity catch up to demand, and what happens to pricing when it does? At $1,000/month list price with rebates landing at $500-700, the drug is still priced out of the mass market. Compounding pharmacies are the wildcard.",
    tags: [id('health'), id('earnings'), id('nvo')], author: author(2), commentCount: 19, reactions: reactions(22, 2), createdAt: ago(0, 6),
  },
  {
    title: "Is the biotech IPO window opening? Q1 2025 pipeline analysis",
    content: "Three biotech IPOs priced above range in Q1, first time since 2021. The window is cracking open but selectively — late-stage assets with binary catalysts are getting done, early-stage is still shut. The XBI is up 18% from lows but still 40% below the 2021 peak. If the Fed cuts in H2, biotech multiples could re-rate significantly. Best risk/reward is mid-cap with 2+ phase 3 catalysts.",
    tags: [id('health'), id('ipos')], author: author(3), commentCount: 5, reactions: reactions(6, 3), createdAt: ago(4, 1),
  },
  // ── Financials / Banks ────────────────────────────────────────
  {
    title: "JPMorgan Q1 earnings: NIM compression begins — the easy money era for banks is over",
    content: "JPM reported $58B revenue but NIM (net interest margin) compressed 12bps quarter-on-quarter. The rising rate tailwind is turning into a headwind as deposit costs rise faster than loan yields. Dimon guided cautiously on loan growth. Credit quality is still solid — charge-offs at 0.52% — but watch commercial real estate. My thesis: sell bank stocks in H2 2025 as NIM compression accelerates.",
    tags: [id('fin'), id('earnings'), id('jpm')], author: author(4), commentCount: 11, reactions: reactions(14, 4), createdAt: ago(1, 9),
  },
  {
    title: "Visa: The ultimate toll road — but is growth topping out?",
    content: "Visa processed $3.3T in payments last quarter. Cross-border volumes (highest margin) grew 16%. The threat: real-time payment systems (FedNow, India UPI, Brazil PIX) are eating into low-value transaction volumes. Visa's response has been to buy into these networks. At 26x earnings, it's not cheap, but the earnings quality and capital return program are exceptional.",
    tags: [id('fin'), id('earnings'), id('visa')], author: author(5), commentCount: 4, reactions: reactions(8, 5), createdAt: ago(3, 5),
  },
  {
    title: "Berkshire cash pile hits $189B — Buffett sees no value anywhere?",
    content: "Berkshire is sitting on $189B in cash and short-term T-bills, earning 5.3%. Buffett hasn't made a major acquisition in two years. Either he sees no value at current prices, or he's positioning for a crisis to deploy capital. For reference, the 2008 deployment was ~$15B into Goldman and GE — this cash pile could do 10x that. Patience as a strategy.",
    tags: [id('fin'), id('value'), id('brk')], author: author(0), commentCount: 28, reactions: reactions(31, 0), createdAt: ago(0, 4),
  },
  // ── Energy ────────────────────────────────────────────────────
  {
    title: "Oil at $75: OPEC+ cuts vs. US shale response — who blinks first?",
    content: "OPEC+ extended 2.2 mbpd cuts through Q3. US shale producers have held production flat despite the lower price — they've been focused on shareholder returns over volume growth. Permian Basin breakevens are around $40-45 so there's no forced curtailment. The structural bull case: CAPEX underinvestment since 2015 means the market will be structurally undersupplied when demand recovers. ExxonMobil is my highest conviction energy long.",
    tags: [id('energy'), id('commodities'), id('xom')], author: author(1), commentCount: 16, reactions: reactions(12, 1), createdAt: ago(1, 3),
  },
  {
    title: "European energy transition: who's paying for the green premium?",
    content: "Renewables are now cheaper than gas peakers on a levelized cost basis, but grid reliability is still the missing piece. Germany's Energiewende has been expensive — retail electricity prices are among the highest in the world. The political backlash is real: AfD polling at 20%+ on a platform partially built on energy costs. My view: transition happens, but slower and messier than consensus expects. Utilities are undervalued.",
    tags: [id('energy'), id('utilities'), id('regulation')], author: author(2), commentCount: 9, reactions: reactions(7, 2), createdAt: ago(5, 0),
  },
  // ── Consumer / Luxury ─────────────────────────────────────────
  {
    title: "LVMH slowdown in China: structural or cyclical?",
    content: "LVMH organic growth in Asia (ex-Japan) was -6% last quarter, driven by China weakness. The aspirational middle-class Chinese consumer is under pressure from the property crash and youth unemployment at 15%. True luxury (top-tier Vuitton, Dior haute couture) is holding but accessible luxury is cracking. LVMH is still trading at 22x — I think there's 15% downside if China misses recovery expectations.",
    tags: [id('cons_disc'), id('earnings'), id('lvmh')], author: author(3), commentCount: 13, reactions: reactions(10, 3), createdAt: ago(2, 6),
  },
  {
    title: "Shopify: Is the merchant success flywheel finally showing in numbers?",
    content: "Shopify's Q1 revenue grew 23% to $2.1B. More importantly, Merchant Solutions (payments, capital, shipping) grew 27% and is now 73% of revenue — the platform is becoming a financial services company. GMV growth of 25% is the real KPI. Valuation at 10x revenue is pricing in continued execution. The bear case: Amazon is aggressively targeting the same SMB market.",
    tags: [id('cons_disc'), id('growth'), id('shop')], author: author(4), commentCount: 7, reactions: reactions(9, 4), createdAt: ago(4, 3),
  },
  {
    title: "Nestlé under pressure: pricing power limits hit, volumes fall",
    content: "Nestlé reported organic growth of 1.5%, with pricing contributing 2.1% and volumes contracting 0.6%. The consumer is clearly trading down. Maggi, KitKat, and Nespresso are holding but the entry-level products are losing shelf space to private label. Nestle's response has been portfolio premiumization — selling assets below 10% EBIT margin. The restructuring makes sense strategically but the timeline is long.",
    tags: [id('cons_stap'), id('earnings'), id('nestle')], author: author(5), commentCount: 6, reactions: reactions(5, 5), createdAt: ago(6, 0),
  },
  // ── Tech / Semis ──────────────────────────────────────────────
  {
    title: "Apple's Services gross margin is the real story — hardware is just the install base",
    content: "Apple Services grew 14% to $23.9B with gross margins of 75%. Every iPhone sold is worth $6-8/year in software economics. The installed base of 2.2B active devices is the moat. The threat I take seriously: EU Digital Markets Act forcing sideloading. If 15% of EU App Store revenue is competed away, that's $2-3B in high-margin revenue. Modest impact but sets a precedent.",
    tags: [id('it'), id('earnings'), id('aapl')], author: author(0), commentCount: 22, reactions: reactions(26, 0), createdAt: ago(0, 2),
  },
  {
    title: "Meta's year of efficiency — has the cost discipline become structural?",
    content: "Meta went from 87,000 employees to 67,000 in 18 months, revenue per employee doubled. Reality Labs still burning $4-5B per quarter but Zuckerberg seems committed. The AI infrastructure buildout ($35-40B CAPEX guidance) is the bet that either cements the moat or destroys it. Advertising revenue growth of 27% is being driven by Reels and AI-optimized targeting. I'm cautiously long.",
    tags: [id('comms'), id('growth'), id('meta')], author: author(1), commentCount: 18, reactions: reactions(21, 1), createdAt: ago(1, 4),
  },
  // ── EV / Industrials ─────────────────────────────────────────
  {
    title: "Tesla margins: is the price war a strategic masterstroke or a race to the bottom?",
    content: "Tesla cut prices 8 times in 2024. Gross auto margin fell from 28% to 17%. But deliveries grew 38%. The bull case: Tesla is buying market share at the expense of competitors with higher cost bases, cementing volume leadership before the next generation of cheaper models. The bear case: margin recovery is now dependent on software/FSD monetization, which is years away. I hold a small position, net skeptical.",
    tags: [id('cons_disc'), id('earnings'), id('tsla')], author: author(2), commentCount: 31, reactions: reactions(35, 2), createdAt: ago(0, 5),
  },
  {
    title: "BYD surpasses Tesla in quarterly EV deliveries — what it means",
    content: "BYD delivered 526,000 pure EVs in Q4 2024, ahead of Tesla's 484,000. BYD has battery, motor, and chip manufacturing in-house — the most vertically integrated automaker in history. The price of their entry model Seagull is $10,000. That is the existential threat to Western EVs. My view: BYD wins emerging market EV dominance. Tesla wins premium autonomy globally. Both can coexist.",
    tags: [id('cons_disc'), id('regulation'), id('byd')], author: author(3), commentCount: 24, reactions: reactions(28, 3), createdAt: ago(1, 1),
  },
  {
    title: "Airbus vs. Boeing: the once-in-a-decade opportunity for European aerospace",
    content: "Boeing's 737 MAX and 787 production problems have handed Airbus a backlog advantage that will take a decade to close. Airbus A320neo family has a 7-year order backlog. The European defense spending surge (NATO 2% GDP commitments) adds another growth vector. Airbus is trading at 22x forward earnings — cheap for the backlog duration and defense optionality.",
    tags: [id('industrials'), id('earnings'), id('airbus')], author: author(4), commentCount: 8, reactions: reactions(10, 4), createdAt: ago(3, 4),
  },
  // ── Real Estate / REITs ───────────────────────────────────────
  {
    title: "US commercial real estate: office sector finally repricing after 3 years of denial",
    content: "NYC Class B office vacancy hit 22%. Some buildings are selling at 60-70 cents on the dollar vs. 2019 appraisals. The math is brutal: a $200M building with $150M of floating-rate debt at 7.5% needs 95% occupancy to break even. Conversion to residential is constrained by floor plate geometry. I see another 20-30% of downside in secondary office markets. Long industrial REITs, short office.",
    tags: [id('realestate'), id('macro')], author: author(5), commentCount: 15, reactions: reactions(17, 5), createdAt: ago(2, 2),
  },
  {
    title: "Data center REITs: the infrastructure play on the AI boom",
    content: "Digital Realty and Equinix are trading at 25-28x FFO, at the top of their historical range. But the demand signal is extraordinary: hyperscalers have pre-leased capacity through 2027. Power is the new constraint — data centers need 100-200MW facilities and the grid can't keep up. Nuclear small modular reactors and co-location deals with power companies are the emerging solution. Long EQIX.",
    tags: [id('realestate'), id('it'), id('utilities')], author: author(0), commentCount: 11, reactions: reactions(13, 0), createdAt: ago(4, 6),
  },
  // ── Crypto ───────────────────────────────────────────────────
  {
    title: "Bitcoin ETF flows: $12B in first 3 months — institutional allocation is real",
    content: "BlackRock's IBIT took in $12B in its first 3 months — the fastest ETF launch in history. Institutional allocations of 1-3% in 60/40 portfolios are becoming standard. The halving narrative drives supply dynamics. I'm not a maximalist but I recognize this is a new demand source that didn't exist in prior cycles. My base case: BTC $80-100K by year end, assuming no regulatory shock.",
    tags: [id('crypto'), id('fin')], author: author(1), commentCount: 29, reactions: reactions(32, 1), createdAt: ago(0, 8),
  },
  {
    title: "Crypto regulation: MiCA goes live in Europe — a template for the world?",
    content: "MiCA (Markets in Crypto Assets) is now the law in all 27 EU member states. Stablecoin issuers must hold reserves in EU banks. Exchanges need passporting licenses. The impact on DeFi is unclear — regulators explicitly punted on decentralized protocols. My take: MiCA is good for large regulated players (Coinbase, Kraken) and bad for the anonymous DeFi ecosystem. Regulatory clarity always benefits incumbents.",
    tags: [id('crypto'), id('regulation')], author: author(2), commentCount: 14, reactions: reactions(16, 2), createdAt: ago(3, 3),
  },
  // ── Value / Dividends ─────────────────────────────────────────
  {
    title: "Deep value screens for 2025: where Buffett metrics still find names",
    content: "Running a Graham screen (P/E < 15, P/B < 1.5, current ratio > 2, debt < equity) in 2025 returns mostly Korean and Japanese small-caps plus a handful of European industrials. Samsung trades at 1.1x book with $70B cash on its balance sheet. The discount to intrinsic value is real but the corporate governance risk and political risk in Korea are the offsets. KOSPI has been dead money for 10 years.",
    tags: [id('value'), id('earnings'), id('samsung')], author: author(3), commentCount: 9, reactions: reactions(11, 3), createdAt: ago(5, 2),
  },
  {
    title: "Dividend aristocrats in a rate cut environment: the playbook",
    content: "If the Fed cuts 2-3x in 2025, the relative yield advantage of dividend stocks vs. cash narrows but equities re-rate. The sweet spot: dividend growers with 5-8% yield plus 7-10% dividend growth. ExxonMobil, JPMorgan, and Visa all fit this profile. The risk: rate cuts are signaling economic weakness, which means earnings compression. Run the DuPont on payout ratios before buying.",
    tags: [id('dividends'), id('value')], author: author(4), commentCount: 5, reactions: reactions(6, 4), createdAt: ago(7, 0),
  },
  // ── M&A ──────────────────────────────────────────────────────
  {
    title: "Synopsys/Ansys merger blocked: what it means for EDA consolidation",
    content: "The DOJ blocking Synopsys' $35B acquisition of Ansys sends a clear signal: the Biden-era anti-trust approach is targeting software consolidation, not just tech hardware. EDA is a tiny market ($15B TAM) but strategically critical for semiconductor design. Both stocks sold off 8-12% on the news. I'm buying the dip in both — standalone, they remain exceptional businesses with pricing power.",
    tags: [id('it'), id('ma'), id('regulation')], author: author(5), commentCount: 7, reactions: reactions(8, 5), createdAt: ago(6, 3),
  },
  {
    title: "Siemens acquires Altair Engineering: vertical integration in industrial AI",
    content: "Siemens paid $10B for Altair, the simulation software company. This is a classic Siemens playbook: buy the software layer on top of their industrial hardware. The combined offering — physical hardware + digital twin simulation + AI optimization — is a genuine differentiation. German industrial stocks are unloved but Siemens' business quality deserves a premium it's not getting. Forward P/E of 17x looks cheap.",
    tags: [id('industrials'), id('it'), id('ma'), id('siemens')], author: author(0), commentCount: 6, reactions: reactions(7, 0), createdAt: ago(8, 1),
  },
  // ── Short Selling / Technical ──────────────────────────────────
  {
    title: "Technical analysis: S&P 500 at all-time highs — reading the breadth divergence",
    content: "The S&P 500 made new ATHs but the equal-weight S&P has underperformed by 800bps YTD. Mega-cap tech is carrying the index. This is a breadth divergence that historically precedes corrections. The advance-decline line is diverging. VIX at 13 is too low for my comfort. I'm not calling a crash, but I've trimmed equity exposure and added tail hedges via put spreads. Risk/reward is asymmetric to the downside.",
    tags: [id('technical'), id('macro')], author: author(1), commentCount: 19, reactions: reactions(23, 1), createdAt: ago(1, 6),
  },
  {
    title: "Short thesis: regional US banks sitting on unrealized HTM losses",
    content: "Community banks loaded up on 10-year Treasuries and Agency MBS at 1.5-2% in 2020-21. Those are now marked at 70-75 cents on the dollar on a mark-to-market basis, but held at par in held-to-maturity accounting. If depositors run (like SVB), forced sales crystallize the losses. I'm short 3 regional banks with >30% HTM portfolios and <100% FDIC insured deposits. Names available in comments.",
    tags: [id('fin'), id('shortsell')], author: author(2), commentCount: 23, reactions: reactions(27, 2), createdAt: ago(2, 7),
  },
  // ── Materials / Mining ────────────────────────────────────────
  {
    title: "Copper super-cycle thesis: electrification demand is a decade-long tailwind",
    content: "A single onshore wind turbine uses 4 tonnes of copper. An EV uses 4x the copper of an ICE vehicle. Global grid buildout requires an estimated 2.5x increase in copper mining output by 2035 — and not a single major new mine has been permitted in the last five years. The supply-demand imbalance is structural. Copper is my highest conviction commodity long. COPX ETF or direct exposure through FCX.",
    tags: [id('materials'), id('commodities')], author: author(3), commentCount: 12, reactions: reactions(14, 3), createdAt: ago(3, 1),
  },
  // ── Amazon / E-commerce ───────────────────────────────────────
  {
    title: "AWS margin expansion is the Amazon story — retail is the legacy business",
    content: "AWS grew 17% to $25B quarterly revenue. Operating margin hit 38% — up from 26% a year ago. The shift from on-premise to cloud has a long tail. Meanwhile, Amazon advertising is a $50B+ annualized business growing 18% with near-100% margins. North America retail eked out 6% operating margin. The sum-of-parts on Amazon puts it at $250 in a conservative scenario. I'm still long.",
    tags: [id('it'), id('earnings'), id('amzn')], author: author(4), commentCount: 10, reactions: reactions(12, 4), createdAt: ago(4, 5),
  },
  // ── No tags (intentional — demonstrates untagged threads) ─────
  {
    title: "What's your current portfolio concentration? Single stock vs. diversified",
    content: "Curious where this community lands on concentration. I run a 10-15 stock portfolio with top 3 positions at 20-25% each. Diversification beyond 15 names feels like paying for index-like returns with single-stock volatility. But I'm aware this is a high-risk approach. What's your framework for sizing? Do you size by conviction, by volatility, or by Kelly criterion?",
    tags: [], author: author(5), commentCount: 8, reactions: reactions(9, 5), createdAt: ago(9, 2),
  },
  {
    title: "Best financial data sources for retail investors in 2025",
    content: "Sharing what I actually use: TIKR for fundamentals screening, Koyfin for charting and consensus estimates, EDGAR for SEC filings, Koyfin again for macro dashboards. Bloomberg is out of reach financially. For primary research on small caps, IR teams are surprisingly accessible — a cold email often gets a call. What tools are people here using?",
    tags: [], author: author(0), commentCount: 15, reactions: reactions(18, 0), createdAt: ago(10, 3),
  },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection;

  await db.collection('threads').deleteMany({});
  await db.collection('threadcomments').deleteMany({});
  console.log('Cleared existing threads.');

  const result = await db.collection('threads').insertMany(
    threads.map(t => ({
      ...t,
      tags: t.tags.map(id => id),
      topic: t.tags[0] ?? null,
    }))
  );
  console.log(`Inserted ${result.insertedCount} threads.`);

  await mongoose.disconnect();
}
run();
