import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import User from '../models/User';
import Topic from '../models/Topic';
import Thread from '../models/Thread';
import ThreadComment from '../models/ThreadComment';
import Post from '../models/Post';
import Comment from '../models/Comment';

const PASSWORD = '1718317183';
const REACTIONS = ['like', 'love', 'haha', 'wow', 'sad', 'angry'] as const;

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

const THREADS_DATA = [
  // ── Sports ────────────────────────────────────────────────────────────────
  {
    topic: 'sports', age: 3, reactionCount: 14,
    title: 'Is LeBron James the GOAT?',
    content: "We've been debating this for years. MJ won 6 rings with 2 three-peats, but LeBron has longevity unlike anything we've seen before. What's your take?",
    comments: [
      "LeBron's longevity is unreal but Jordan's rings speak for themselves.",
      "6 finals losses kills the GOAT argument for me.",
      "Peak LeBron 2012–2016 was the best basketball I've ever watched.",
      "Jordan never lost a finals. That's the difference.",
      "You have to consider the era. Jordan didn't face the same competition.",
    ],
  },
  {
    topic: 'sports', age: 8, reactionCount: 9,
    title: 'Champions League Final Predictions',
    content: "With the semifinals done, who do you think takes the trophy this year? Tactics, form, and squad depth all matter. Make your case.",
    comments: [
      "Man City's depth is just too much for everyone else.",
      "Don't count out Real Madrid. They always find a way.",
      "PSG finally has the squad to do it this year.",
    ],
  },
  {
    topic: 'sports', age: 1, reactionCount: 18,
    title: 'F1 2025: Who Takes the Championship?',
    content: "Verstappen has dominated but the new regulations shook things up. Ferrari looks strong, Hamilton is at a new team. Could be anyone's year.",
    comments: [
      "Verstappen wins it again. Red Bull is just built different.",
      "Hamilton at Ferrari is going to be must-watch TV.",
      "Norris is my dark horse pick. McLaren has been on a tear.",
      "Ferrari will find a way to mess it up like they always do lol",
      "The new tire regulations really change things. Wide open season.",
      "Leclerc deserves a championship. He's been robbed for years.",
    ],
  },
  {
    topic: 'sports', age: 48, reactionCount: 6,
    title: 'NBA Salary Cap Needs Serious Reform',
    content: "Super teams are ruining competitive balance. The cap is supposed to level the playing field but players and teams find workarounds every time. What would you change?",
    comments: [
      "Hard cap like the NFL. No exceptions whatsoever.",
      "The problem is player movement, not the cap itself.",
      "Small market teams will never truly compete under the current system.",
    ],
  },
  {
    topic: 'sports', age: 72, reactionCount: 11,
    title: 'Best Football Transfer of the Decade?',
    content: "From Neymar's $222M move to PSG to Mbappe finally going to Real Madrid — which transfer actually delivered the most value for the money spent?",
    comments: [
      "Suarez to Barcelona was robbery for Liverpool but genius for Barca.",
      "Mbappe to Real Madrid is going to go down as legendary.",
      "Neymar was a flop. Most expensive player in history and keeps getting injured.",
      "De Bruyne to City was the best pure value transfer ever made.",
    ],
  },
  {
    topic: 'sports', age: 120, reactionCount: 5,
    title: 'Should College Athletes Be Paid?',
    content: "NIL deals changed everything but is it enough? Universities make billions off these athletes. The debate has never been more relevant or more polarizing.",
    comments: [
      "They already are being paid through scholarships and facilities worth hundreds of thousands.",
      "Full pay would destroy the amateur spirit of college sports entirely.",
    ],
  },

  // ── Music ─────────────────────────────────────────────────────────────────
  {
    topic: 'music', age: 2, reactionCount: 22,
    title: 'Kendrick vs Drake: A Year Later',
    content: "The biggest rap beef in a generation is settled. Kendrick dropped Not Like Us, Drake went silent. What does this mean for rap going forward?",
    comments: [
      "Not Like Us was one of the greatest diss tracks ever recorded. Period.",
      "Drake's silence said everything. He knew he lost that battle.",
      "People are too hard on Drake. He's still one of the best commercially.",
      "This showed rap still has real stakes. It's not just streaming numbers.",
      "Kendrick elevated himself to a completely different tier after this.",
      "I still bump Drake. People act like he's finished lol",
      "The Super Bowl halftime show was the perfect cherry on top.",
    ],
  },
  {
    topic: 'music', age: 36, reactionCount: 8,
    title: 'Is Vinyl a Real Revival or Just Nostalgia?',
    content: "Vinyl sales have outpaced CDs for years now. But who's actually buying them? True audiophiles, collectors, or people who just want the aesthetic?",
    comments: [
      "I have a turntable and I genuinely think it sounds warmer and better.",
      "It's 80% aesthetic, 20% audio quality. And honestly that's fine.",
      "The warmth of analog is real. Streaming is too compressed.",
      "Kids buying Taylor Swift vinyl and never actually playing it 😂",
    ],
  },
  {
    topic: 'music', age: 5, reactionCount: 19,
    title: 'AI-Generated Music: Art or Existential Threat?',
    content: "Suno, Udio, and others can generate full tracks in seconds. Independent artists are already feeling it. Is this the end of the music industry as we know it?",
    comments: [
      "It's a tool like any other. Photographers didn't disappear when cameras got easier.",
      "The problem is it was trained on copyrighted music without consent.",
      "I've heard AI tracks that are genuinely impressive. The bar is being raised.",
      "Authenticity matters. People want to connect with real human stories.",
      "The labels are going to figure out how to monetize it and artists will suffer.",
    ],
  },
  {
    topic: 'music', age: 84, reactionCount: 7,
    title: 'Best Album of 2024 — Your Picks',
    content: "Charli XCX's Brat dominated the cultural conversation but there were so many great records. What's your personal album of the year?",
    comments: [
      "Brat was the most culturally significant album in years. Easy choice.",
      "Sabrina Carpenter's Short n' Sweet deserves way more credit.",
      "Kendrick's GNX came out of nowhere and it's incredible.",
      "Morgan Wallen's Deeper Well went underrated outside country circles.",
    ],
  },
  {
    topic: 'music', age: 12, reactionCount: 13,
    title: 'Streaming Killed the Music Album',
    content: "Artists used to craft albums as complete works of art. Now everything is optimized for playlists and skip rates. Has streaming destroyed the album format forever?",
    comments: [
      "Beyoncé's Renaissance proved the album still matters when done right.",
      "Singles culture existed before streaming. Albums aren't dead, they evolved.",
      "The skip button ruined music. You used to have to sit with a track.",
      "Concept albums are having a renaissance. SZA, Kendrick, Frank Ocean.",
      "Record labels push singles. Streaming didn't kill albums, the suits did.",
    ],
  },
  {
    topic: 'music', age: 168, reactionCount: 4,
    title: 'Live Concerts Are Better Than Ever',
    content: "The production budgets, the screens, the pyro — a top-tier concert in 2025 is a completely different experience than 20 years ago. Or has the soul gone missing?",
    comments: [
      "Taylor Swift's Eras Tour set a new standard for what a concert can be.",
      "Too much screens and not enough actual raw music sometimes.",
    ],
  },

  // ── Politics ──────────────────────────────────────────────────────────────
  {
    topic: 'politics', age: 6, reactionCount: 16,
    title: 'Should Voting Be Mandatory?',
    content: "Australia has compulsory voting and turnout is above 90%. The US struggles to hit 60% even in presidential years. Would mandatory voting actually fix democratic participation?",
    comments: [
      "Forced voting violates freedom. The right not to vote is also a right.",
      "Uninformed voters making random choices isn't better than no vote at all.",
      "Civic duty. Driving requires a license. Voting could work the same way.",
      "If you make it mandatory, also make it a national holiday.",
      "Australia's system works but their political culture is completely different.",
      "I'd support it only if there was a 'none of the above' option on the ballot.",
    ],
  },
  {
    topic: 'politics', age: 18, reactionCount: 12,
    title: 'Social Media Regulation: How Far Is Too Far?',
    content: "EU's Digital Services Act, X's content moderation battles, TikTok bans. Governments are more aggressive than ever. Where's the line between safety and censorship?",
    comments: [
      "The EU approach is the right model. Platforms need real accountability.",
      "Government regulating speech online is exactly what authoritarians do.",
      "Section 230 reform is long overdue in the US. Something has to change.",
      "The real problem is algorithmic amplification, not the content itself.",
    ],
  },
  {
    topic: 'politics', age: 4, reactionCount: 20,
    title: 'The Rise of Independent Voters',
    content: "More Americans identify as independent than either party. Yet the two-party system keeps them trapped. Is the era of two-party dominance ending or just evolving?",
    comments: [
      "First past the post voting guarantees two parties. Change the system first.",
      "Ranked choice voting is the actual solution everyone ignores.",
      "Independents still vote D or R 90% of the time. It's mostly identity.",
      "No Labels tried and failed. The infrastructure isn't there for a third party.",
      "Young voters are the most independent generation ever. Change is coming soon.",
      "The Electoral College also reinforces two-party dominance structurally.",
      "Both parties have captured their bases. Moderates have nowhere to go.",
    ],
  },
  {
    topic: 'politics', age: 14, reactionCount: 15,
    title: 'Climate Policy: Are We Already Too Late?',
    content: "2024 was officially the hottest year ever recorded. Emissions are still rising globally. Has the window for meaningful climate action already closed permanently?",
    comments: [
      "Too late to prevent damage but not too late to prevent catastrophe.",
      "China and India need to act. Western reductions alone won't matter.",
      "The defeatism is itself a political tool. We keep fighting regardless.",
      "Nuclear energy is the only realistic path to decarbonization at scale.",
      "Corporate lobbying has been the main obstacle for 40 years running.",
    ],
  },
  {
    topic: 'politics', age: 30, reactionCount: 10,
    title: 'Universal Basic Income: Fantasy or the Future?',
    content: "As AI automation accelerates, UBI gets more serious attention. Finland ran a pilot. Stockton California ran one. The data exists. Does it actually work?",
    comments: [
      "The Stockton experiment showed clear improvements in employment and wellbeing.",
      "We can't afford it without massive and unprecedented tax increases.",
      "People said the same thing about social security when FDR proposed it.",
      "The question isn't if we can afford it — it's who ends up paying for it.",
      "As automation takes jobs, it becomes not optional but economically necessary.",
    ],
  },
  {
    topic: 'politics', age: 96, reactionCount: 9,
    title: 'Term Limits for Congress: Yes or No?',
    content: "The average age in Congress is the highest it's ever been. Career politicians dominate. Should there be constitutional limits on how long someone can serve?",
    comments: [
      "Term limits would just empower lobbyists who are always there regardless.",
      "Voters can already remove politicians. We don't need constitutional changes.",
      "The founders didn't envision career politicians. Term limits absolutely make sense.",
    ],
  },

  // ── Business ──────────────────────────────────────────────────────────────
  {
    topic: 'business', age: 2, reactionCount: 25,
    title: 'Is the Stock Market Overvalued Right Now?',
    content: "The Shiller PE ratio is at historic highs. AI stocks are trading at insane multiples. Are we in a bubble or is this a new valuation paradigm we need to accept?",
    comments: [
      "Nvidia's P/E was considered crazy at 50x. Now people say the same at 200x.",
      "Every generation says the market is overvalued. Long-term it always goes up.",
      "'This time it's different' are the four most dangerous words in investing.",
      "The Fed's rate policy is what's really driving current valuations.",
      "Quality companies at any price eventually work out. Focus on the business.",
      "We're in a textbook bubble. The question is when, not if, it pops.",
      "Bond yields at 5% make stocks less attractive. Something has to give.",
      "Shiller PE has been 'high' for 10 years and the market keeps going up.",
    ],
  },
  {
    topic: 'business', age: 7, reactionCount: 21,
    title: 'AI Will Destroy More Jobs Than It Creates',
    content: "Every major technological revolution created more jobs than it destroyed. But AI hits white-collar knowledge work, not just manual labor. Is this time actually different?",
    comments: [
      "Radiologists, junior lawyers, entry-level coders — these jobs are already disappearing.",
      "New job categories always emerge. AI trainers, prompt engineers, etc.",
      "The problem is the transition period. People can't retrain overnight.",
      "Automation usually makes workers more productive, not unemployed.",
      "The pace is what's different this time. Previous automation took decades.",
      "CEOs aren't going to pay humans when AI can do the same work cheaper.",
    ],
  },
  {
    topic: 'business', age: 10, reactionCount: 17,
    title: 'Best Sectors to Invest in Right Now',
    content: "Tech is expensive, financials are uncertain, energy is volatile. Where do you see the best risk-adjusted returns over the next 2–3 years?",
    comments: [
      "Healthcare is always a safe long-term bet with aging demographics worldwide.",
      "Defense spending is only going up given the current geopolitical environment.",
      "Semiconductors. The AI infrastructure buildout is just getting started.",
      "International developed markets are actually quite cheap right now.",
      "Uranium and nuclear are the contrarian play everyone's sleeping on.",
      "Industrial automation companies benefit regardless of who wins the AI race.",
      "I'm still bullish on US tech despite the stretched valuations.",
    ],
  },
  {
    topic: 'business', age: 24, reactionCount: 14,
    title: 'Real Estate vs Stocks: Where to Put Your Money',
    content: "With mortgage rates still elevated and rent prices near peaks, is real estate still the safe bet it used to be? Or has the market fundamentally and permanently shifted?",
    comments: [
      "Real estate is local. National comparisons miss the point entirely.",
      "Index funds beat real estate net of expenses over any 20-year period.",
      "Leverage is real estate's secret weapon. You can't buy stocks on 80% margin easily.",
      "Rental income provides cash flow that stocks simply can't match.",
      "Property taxes and maintenance eat returns that look good only on paper.",
    ],
  },
  {
    topic: 'business', age: 40, reactionCount: 11,
    title: 'Why Most Startups Fail in Year Two',
    content: "Year 1 is exciting. Year 2 is when reality sets in — product-market fit questions, burn rate anxiety, team conflicts. What actually kills startups and how do founders avoid it?",
    comments: [
      "Running out of cash is the cause but poor prioritization is the root.",
      "Co-founder conflicts kill more startups than the market does.",
      "Most founders build products nobody actually asked for. Customer discovery is everything.",
      "Hiring too fast too early is the classic mistake everyone makes.",
    ],
  },
  {
    topic: 'business', age: 56, reactionCount: 8,
    title: "The Dollar's Global Dominance Is Fading",
    content: "BRICS nations are actively reducing dollar dependence. China and Russia settle trades in yuan. Saudi Arabia considers non-dollar oil sales. Is dollar hegemony ending?",
    comments: [
      "The dollar won't be replaced but its share of global trade will decline.",
      "No currency has the depth and liquidity of dollar markets. Nothing comes close.",
      "Geopolitical weaponization of the dollar is accelerating de-dollarization.",
      "Gold-backed alternatives keep getting floated and keep going absolutely nowhere.",
    ],
  },
];

const POSTS_DATA = [
  {
    age: 1, reactionCount: 14,
    content: "Just loaded up on NVDA puts. The AI hype is at peak euphoria. When everyone agrees a trade is obvious, it usually isn't. Risk/reward heavily favors the short side here.",
    comments: [
      "Brave call. I respect it but timing the top is notoriously hard.",
      "Puts are probably already pricing in a correction though.",
      "Been hearing this bear case for 2 years. Nvidia keeps printing.",
    ],
  },
  {
    age: 2, reactionCount: 18,
    content: "The Federal Reserve is trapped. Cut rates and inflation comes back. Hold rates and something breaks. There is no soft landing — there's just a question of what cracks first.",
    comments: [
      "Commercial real estate is what breaks first. Already seeing it.",
      "Regional banks are the canary in the coal mine here.",
      "They'll cut. They always cut. Politicians can't stomach a recession.",
      "Soft landings have happened before. 1994-1995 is the closest analog.",
    ],
  },
  {
    age: 3, reactionCount: 9,
    content: "Everyone is chasing AI. Meanwhile, water infrastructure in the US is crumbling. $1T replacement cost over 20 years. The boring trade nobody talks about is utilities and water.",
    comments: [
      "AWK and WTRG are solid plays on this thesis.",
      "The boring trades are usually the right trades.",
    ],
  },
  {
    age: 5, reactionCount: 22,
    content: "Unpopular opinion: index funds are about to face their first real test. They've only existed in a 40-year bull market for bonds. When that tailwind reverses, passive investing looks very different.",
    comments: [
      "This is a very valid concern that most people dismiss.",
      "Active managers haven't beaten the index over 20 years though.",
      "The passive allocation issue is real. Everyone owns the same overweight mega caps.",
      "Still beats the average active fund after fees.",
      "It's a liquidity argument, not a returns argument. Big difference.",
    ],
  },
  {
    age: 6, reactionCount: 11,
    content: "Just finished reading the Berkshire annual letter. Buffett's point about the US economy's resilience is underrated. For all the doom and gloom, American businesses keep delivering.",
    comments: [
      "Buffett has been bearish on cash for 4 years and just sits on $170B. Make it make sense.",
      "The letter was good but he keeps dodging the AI question entirely.",
      "He's been right more often than wrong. That's the whole point.",
    ],
  },
  {
    age: 8, reactionCount: 16,
    content: "China's real estate crisis isn't over. Evergrande was the headline but there are dozens of developers in the same position. The ripple effects into Chinese consumer spending are being massively underpriced by global markets.",
    comments: [
      "Agree. Western funds went back into China too fast after the reopening.",
      "The demographic cliff makes this structural, not cyclical.",
      "Playing this through commodity shorts. Less political risk.",
      "FXI puts have been painful but the thesis is intact.",
    ],
  },
  {
    age: 10, reactionCount: 25,
    content: "Hot take: the real bubble isn't AI stocks. It's private equity. $3T in dry powder chasing deals at valuations that assume rate cuts that aren't coming. The unwind will be quiet but brutal.",
    comments: [
      "The J-curve is going to destroy some pension fund allocations.",
      "PE marks don't update to market. That's how the pain gets hidden.",
      "Heard this for 5 years. PE keeps raising larger funds.",
      "This time leverage costs are actually hurting the model.",
      "The IPO window being shut is the real tell here.",
      "Secondaries market is already showing the cracks.",
    ],
  },
  {
    age: 12, reactionCount: 8,
    content: "Reminder that gold has outperformed the S&P 500 over the last 25 years. Not that you'd know it from financial media coverage. The barbarous relic narrative is a Wall Street cope.",
    comments: [
      "Try telling that to someone who bought gold in 1980 at $800.",
      "Gold in a properly diversified portfolio makes sense. Pure gold bugs are another thing.",
    ],
  },
  {
    age: 14, reactionCount: 20,
    content: "Semiconductor capex is the most important number in markets right now. TSMC, Samsung, Intel — they're all guiding up. That's a 2-3 year lead time on supply that the market is ignoring.",
    comments: [
      "The equipment makers are the pickaxes in this gold rush. ASML, AMAT, LRCX.",
      "Demand destruction is the risk. What if AI buildout slows?",
      "Data centers have a 3-year buildout cycle. Demand is locked in.",
      "The overhang when that capacity comes online is the real risk.",
      "Fabs don't get cancelled once shovels are in the ground.",
    ],
  },
  {
    age: 18, reactionCount: 13,
    content: "Everyone talks about diversification but nobody actually does it. Most retail portfolios are 80% US large cap tech whether they know it or not. Emerging markets, small caps, commodities — these exist.",
    comments: [
      "Home bias is real and it's a documented behavioral error.",
      "The thing is US large cap has won for 15 years straight.",
      "Mean reversion is brutal and slow but it comes.",
    ],
  },
  {
    age: 20, reactionCount: 17,
    content: "Tesla is the most confusing stock in the market. The car business is struggling, margins are compressed, competition from China is real. But the energy storage business is quietly doubling every year. Two completely different companies in one ticker.",
    comments: [
      "Megapack is genuinely undervalued within the TSLA bundle.",
      "Elon's political activity is also becoming a brand risk.",
      "The multiple still prices in perfection on robotaxi though.",
      "Every bull thesis on Tesla has been 'just wait for the next thing' for years.",
    ],
  },
  {
    age: 24, reactionCount: 10,
    content: "Had a conversation with a portfolio manager today. He said something that stuck: 'I've never seen a client get rich from being cautious, but I've seen plenty lose everything from being reckless.' Risk management is the only alpha that compounds.",
    comments: [
      "Drawdown recovery math is brutal. Down 50% means you need up 100% to break even.",
      "Kelly criterion is underused in retail investing.",
      "Position sizing is the most boring and most important thing in investing.",
    ],
  },
  {
    age: 30, reactionCount: 15,
    content: "The media treats every Fed meeting like it's the most important event in history. Meanwhile, the compounding effect of staying invested through volatility quietly makes you wealthier. Turn off CNBC and look at your portfolio quarterly.",
    comments: [
      "This is correct but also very hard to actually do emotionally.",
      "The gap between investor returns and fund returns proves this point.",
      "Easy to say in a bull market. Harder when you're down 40%.",
      "Vanguard did a study. The best performing accounts were forgotten ones.",
    ],
  },
  {
    age: 36, reactionCount: 7,
    content: "Uranium stocks just broke out of a 15-year consolidation. Structural demand from nuclear renaissance meets constrained supply. This is the trade of the decade and almost nobody in traditional finance is touching it.",
    comments: [
      "CCJ has been a rocket. Should have loaded up more.",
      "The ESG community finally warming up to nuclear is the real catalyst.",
    ],
  },
  {
    age: 48, reactionCount: 19,
    content: "Everyone has an opinion on Bitcoin. Here's mine: it doesn't matter whether it's digital gold or a scam. What matters is that institutional adoption via ETFs has created a new price floor that didn't exist 2 years ago. That's a structural shift.",
    comments: [
      "BlackRock's IBIT doing $60B in AUM in a year is insane.",
      "The halving supply dynamic is real regardless of the narrative.",
      "The correlations to risk assets during drawdowns are still problematic.",
      "Sovereign adoption is the next catalyst if it happens.",
      "ETF flows are also reversible. That floor has trapdoors.",
    ],
  },
  {
    age: 56, reactionCount: 6,
    content: "Defense stocks are not an ethical debate, they're a macro reality. European NATO members going from 1.5% to 2.5% of GDP on defense is trillions of dollars in incremental spending. RTX, LMT, BAES are direct beneficiaries.",
    comments: [
      "The geopolitical premium in defense is here for at least a decade.",
      "European defense companies are more interesting. Rheinmetall is up 400% in 2 years.",
    ],
  },
  {
    age: 60, reactionCount: 11,
    content: "Biggest lesson from 10 years of investing: the news cycle and the market are almost entirely disconnected. The worst headlines often coincide with the best entry points. The best headlines are when you should be selling.",
    comments: [
      "March 2020 was the single best buying opportunity of a generation and felt like the world ending.",
      "Sentiment indicators are genuinely useful for contrarian positioning.",
      "Easier said than done when you're watching your portfolio fall daily.",
      "This is why rule-based investing beats discretionary for most people.",
    ],
  },
  {
    age: 72, reactionCount: 14,
    content: "Apple hasn't had a truly new product category since the Watch in 2014. Vision Pro is struggling. The services model is brilliant but you can't grow services revenue forever without growing devices. The law of large numbers is catching up.",
    comments: [
      "The installed base loyalty is Apple's real moat. Not innovation.",
      "Tim Cook is an operations genius but not a product visionary.",
      "Services margin is 70%+. That's the business now.",
    ],
  },
  {
    age: 84, reactionCount: 9,
    content: "Small cap value has underperformed for so long that people have stopped believing in it. That's exactly the setup for a decade of outperformance. Higher rates structurally favor value over growth. Be patient.",
    comments: [
      "Value traps are real though. Not every cheap stock gets cheaper for no reason.",
      "IWN has been the most frustrating fund to hold for 5 years.",
    ],
  },
  {
    age: 96, reactionCount: 12,
    content: "The fintech disruption narrative was supposed to destroy banks. Instead, JPMorgan invested $17B in tech and came out stronger than ever. Incumbents who invest in their own disruption usually win. A lesson for every sector.",
    comments: [
      "Dimon deserves more credit than he gets on the tech investment story.",
      "The CFPB regulatory moat around banks also helped.",
      "Same thing happened with Netflix vs Disney+. First mover advantage is sticky.",
      "Nubank and Revolut are still growing fast in markets JPM doesn't serve well.",
    ],
  },
  {
    age: 120, reactionCount: 5,
    content: "The energy transition math doesn't add up yet. You can't run an AI data center on wind and solar without massive battery storage that doesn't scale yet. Natural gas is going to be the bridge fuel for 20 more years minimum.",
    comments: [
      "LNG export capacity is one of the most under-owned macro plays.",
      "The grid reliability argument is underappreciated by green energy bulls.",
    ],
  },
  {
    age: 144, reactionCount: 8,
    content: "Watching retail traders pile into 0DTE options is both impressive and terrifying. They've learned to use leverage. They haven't learned to respect it. This ends badly for most of them.",
    comments: [
      "Tastytrade built a business on this. They know what they're doing.",
      "The house always wins in 0DTE. Market makers love this product.",
      "I said the same thing about crypto in 2020. They still made money.",
    ],
  },
];

async function seed() {
  await connectDB();

  // ── Create users David8–David20 ──────────────────────────────────────────
  for (let i = 8; i <= 20; i++) {
    const username = `David${i}`;
    const email    = `david.gogi${i}@proton.me`;
    const exists   = await User.findOne({ username });
    if (exists) { console.log(`${username} already exists, skipping`); continue; }
    await new User({ username, email, password: PASSWORD }).save();
    console.log(`Created ${username}`);
  }

  const allUsers = await User.find({ username: /^David\d+$/ }).lean();
  console.log(`Total users available: ${allUsers.length}`);

  const topics = await Topic.find().lean();
  const bySlug = Object.fromEntries(topics.map(t => [t.slug, t]));

  // ── Create threads ───────────────────────────────────────────────────────
  for (const td of THREADS_DATA) {
    const topic = bySlug[td.topic];
    if (!topic) { console.log(`Topic "${td.topic}" not found`); continue; }

    const exists = await Thread.findOne({ title: td.title });
    if (exists) { console.log(`Thread "${td.title}" already exists, skipping`); continue; }

    const author    = pick(allUsers);
    const createdAt = hoursAgo(td.age);
    const others    = allUsers.filter(u => u._id.toString() !== author._id.toString());
    const reactors  = pickN(others, td.reactionCount);
    const reactions = reactors.map(u => ({ user: u._id, type: pick(REACTIONS) }));

    const thread = await Thread.create({
      topic:        topic._id,
      title:        td.title,
      content:      td.content,
      author:       author._id,
      reactions,
      commentCount: td.comments.length,
      createdAt,
    });

    const commenters = pickN(others, td.comments.length);
    for (let i = 0; i < td.comments.length; i++) {
      const commenter   = commenters[i] ?? pick(others);
      const commentedAt = new Date(createdAt.getTime() + (i + 1) * 8 * 60 * 1000);
      await ThreadComment.create({
        thread:    thread._id,
        author:    commenter._id,
        content:   td.comments[i],
        parent:    null,
        reactions: [],
        createdAt: commentedAt,
      });
    }

    console.log(`  ✓ "${td.title}" (${reactions.length} reactions, ${td.comments.length} comments)`);
  }

  // ── Create posts ────────────────────────────────────────────────────────
  const existingPostCount = await Post.countDocuments();
  if (existingPostCount > 10) {
    console.log(`\nPosts already seeded (${existingPostCount} exist), skipping`);
  } else {
    console.log('\nSeeding posts...');
    for (const pd of POSTS_DATA) {
      const author    = pick(allUsers);
      const createdAt = hoursAgo(pd.age);
      const others    = allUsers.filter(u => u._id.toString() !== author._id.toString());
      const reactors  = pickN(others, pd.reactionCount);
      const reactions = reactors.map(u => ({ user: u._id, type: pick(REACTIONS) }));

      const post = await Post.create({
        content:      pd.content,
        author:       author._id,
        reactions,
        commentCount: pd.comments.length,
        createdAt,
      });

      const commenters = pickN(others, pd.comments.length);
      for (let i = 0; i < pd.comments.length; i++) {
        const commenter   = commenters[i] ?? pick(others);
        const commentedAt = new Date(createdAt.getTime() + (i + 1) * 10 * 60 * 1000);
        await Comment.create({
          post:      post._id,
          author:    commenter._id,
          content:   pd.comments[i],
          parent:    null,
          reactions: [],
          createdAt: commentedAt,
        });
      }

      console.log(`  ✓ Post by ${author.username} (${reactions.length} reactions, ${pd.comments.length} comments)`);
    }
  }

  console.log('\nSeed complete!');
  await mongoose.connection.close();
}

seed().catch(err => { console.error(err); process.exit(1); });
