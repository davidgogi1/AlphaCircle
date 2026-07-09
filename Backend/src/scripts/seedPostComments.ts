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

function oid(s: string) { return new mongoose.Types.ObjectId(s); }
function hoursAgo(h: number) { return new Date(Date.now() - h * 3_600_000); }

type C = { author: string; content: string; h: number };

const SEED: Record<string, C[]> = {
  '6a4bc5d4a698f8d15fb12bff': [ // NVIDIA
    { author: USERS.David1, h: 5,   content: `The inference demand point is key. Training clusters are one-off capex, inference is recurring. That changes the revenue visibility picture completely.` },
    { author: USERS.David3, h: 4.5, content: `Microsoft and Meta locked into multi-year supply deals changes the supply/demand calculus. This is not a cyclical semiconductor story anymore.` },
    { author: USERS.David2, h: 4,   content: `Valuation is rich but what is the alternative for AI exposure at scale? AMD is years behind on software. Intel's GPU play is a rounding error.` },
    { author: USERS.David6, h: 3,   content: `I am more cautious. 30x sales prices in a lot of perfection. One bad quarter on margins or a demand pause and this thing halves.` },
    { author: USERS.David4, h: 2.5, content: `Disagree on margin risk — Blackwell ASPs are higher than Hopper, gross margin should expand, not compress.` },
    { author: USERS.David7, h: 2,   content: `The custom silicon risk from Google TPUs and Amazon Trainium is real but it is a 2027-2028 story, not 2026.` },
  ],
  '6a4bc5d4a698f8d15fb12c03': [ // Tesla short
    { author: USERS.David1,  h: 20, content: `The valuation gap argument is solid. But the FSD optionality is genuinely hard to value — if it works it is worth more than the car business.` },
    { author: USERS.David2,  h: 19, content: `FSD has been "almost ready" for 5 years. At some point that optionality stops being priced in.` },
    { author: USERS.David3,  h: 18, content: `Cybertruck unit economics are terrible. They are selling it at a loss to preserve market buzz. That cannot last.` },
    { author: USERS.David21, h: 17, content: `Agree with the thesis but timing a short on TSLA is notoriously difficult. Retail holder base is uniquely conviction-driven.` },
    { author: USERS.David6,  h: 15, content: `The delivery number on July 2nd is going to be the catalyst either way. If they beat 500K, shorts get squeezed hard.` },
    { author: USERS.David4,  h: 12, content: `Energy storage revenue was $3B last quarter. That segment alone is growing 80% YoY. The market is ignoring it.` },
    { author: USERS.David7,  h: 8,  content: `Bears have been saying this for 4 years. Stock is still up 400% from 2020. Respect the momentum even if fundamentals say otherwise.` },
  ],
  '6a4bc5d4a698f8d15fb12c09': [ // Yield curve
    { author: USERS.David2, h: 58, content: `The historical pattern is clear but the lag varies enormously — 6 months to 2 years post-uninversion. Impossible to time precisely.` },
    { author: USERS.David3, h: 56, content: `Short duration makes sense. Real yields on TIPS are attractive and you get paid to wait while you de-risk.` },
    { author: USERS.David6, h: 52, content: `Gold as an inflation hedge is interesting here. If the Fed cuts too early and has to reverse, gold outperforms in both scenarios.` },
    { author: USERS.David7, h: 48, content: `The labour market is the wildcard. JOLTs and weekly claims are the data points I track most closely right now.` },
    { author: USERS.David1, h: 44, content: `Reducing duration I agree with. But "rotate into commodities" — which ones? Energy and copper are very different bets.` },
  ],
  '6a4bc5d4a698f8d15fb12c01': [ // ECB
    { author: USERS.David7,  h: 11, content: `The Bund move (or lack of it) is the real tell here. The 2Y barely moved because long-end investors already believed in sticky inflation.` },
    { author: USERS.David21, h: 10, content: `BBVA and Santander are interesting but you are taking Spain country risk. ING is cleaner exposure to higher-for-longer.` },
    { author: USERS.David1,  h: 9,  content: `Lagarde's credibility is on the line. She was too slow on the way up, she cannot afford to be too early on the way down.` },
  ],
  '6a4bc5d4a698f8d15fb12c05': [ // ASML
    { author: USERS.David2,  h: 35, content: `TSMC's capex shift right is the right read. They announced the Arizona fab delay last month. ASML bookings will recover in Q3.` },
    { author: USERS.David3,  h: 33, content: `The EUV monopoly is the deepest moat in all of tech. There is no plan B for chipmakers. You buy the dip.` },
    { author: USERS.David21, h: 30, content: `Adding at €780 is brave. I would wait for €740 as you said — let the panic exhaust itself before sizing up.` },
  ],
  '6a4bc5d4a698f8d15fb12c13': [ // Meta Reality Labs
    { author: USERS.David1, h: 47, content: `Ray-Ban glasses at $299 is the first consumer hit. Low margin but it proves people will wear always-on AI hardware if it is fashionable.` },
    { author: USERS.David6, h: 45, content: `The ad business subsidising this is the key point. No other company has $50B+ profit to burn on a decade-long moonshot.` },
    { author: USERS.David7, h: 42, content: `Metaverse as a concept is dead but AR glasses is a real product category. Zuckerberg was early, not wrong.` },
    { author: USERS.David2, h: 40, content: `Still, $18B annual loss is hard to ignore. At some point the board has to ask whether the capital allocation makes sense.` },
  ],
  '6a4bc5d4a698f8d15fb12c17': [ // Amazon AWS
    { author: USERS.David3, h: 19, content: `The Bedrock data sovereignty angle is underappreciated. Healthcare and finance are huge TAMs and they will not use OpenAI.` },
    { author: USERS.David1, h: 18, content: `Trainium price/performance vs H100 is becoming a real conversation. AWS has the distribution to actually monetise it.` },
    { author: USERS.David4, h: 16, content: `If AWS hits 20% growth in Q3 the stock re-rates immediately. The market has been underestimating the recovery.` },
  ],
  '6a4bc5d4a698f8d15fb12c0b': [ // Semiconductor book
    { author: USERS.David2, h: 9, content: `QCOM automotive is a genuine sleeper. Snapdragon Digital Chassis design wins compound for 5+ years before you see revenue.` },
    { author: USERS.David6, h: 8, content: `Marvell at current levels — what is your price target? Their custom silicon program with AWS and Google is early stage but promising.` },
    { author: USERS.David3, h: 6, content: `AVGO custom silicon revenue is already $12B annualised. The market still undervalues how sticky those hyperscaler relationships are.` },
  ],
  '6a4bc5d4a698f8d15fb12c1b': [ // Japan
    { author: USERS.David4, h: 43, content: `Sony sum-of-parts is genuinely compelling. PlayStation + music IP + sensors — each segment deserves a separate multiple.` },
    { author: USERS.David2, h: 41, content: `The BOJ rate normalisation is the macro driver. JGB holders have nowhere to go but equities once yields stop being artificially pinned.` },
    { author: USERS.David6, h: 39, content: `Currency hedge is the most important decision in this trade. Unhedged JPY has been a killer for the last two years.` },
  ],
  '6a4bc5d4a698f8d15fb12c1d': [ // Microsoft preview
    { author: USERS.David1,  h: 14, content: `Copilot attach rate is my number one metric too. If enterprises are converting to M365 Copilot at $30/seat, that is $20B incremental ARR at scale.` },
    { author: USERS.David3,  h: 13, content: `Operating margin at 44%+ while running some of the largest AI infra in the world is remarkable. Shows the pricing power of the Office monopoly.` },
    { author: USERS.David21, h: 11, content: `Azure AI mix between inference and fine-tuning matters for margin. Inference is lower margin but higher volume. Watch the revenue quality.` },
  ],
  '6a4bc5d4a698f8d15fb12c07': [ // Novo Nordisk
    { author: USERS.David6, h: 47, content: `The 3% penetration point is the key insight. The comparison to statins is apt — it took 15 years for statins to reach peak penetration. GLP-1 has a longer runway.` },
    { author: USERS.David7, h: 45, content: `Supply chain was the binding constraint, not demand. The fill-finish capacity expansions coming online this year change the picture significantly.` },
    { author: USERS.David1, h: 43, content: `Lilly pipeline competition is real but so is NOVO's formulation moat. Oral semaglutide if approved is a completely different market.` },
  ],
};

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection;

  await db.collection('comments').deleteMany({});

  let total = 0;
  for (const [postId, comments] of Object.entries(SEED)) {
    for (const c of comments) {
      await db.collection('comments').insertOne({
        post:      oid(postId),
        author:    oid(c.author),
        content:   c.content,
        parent:    null,
        reactions: [],
        createdAt: hoursAgo(c.h),
      });
    }
    await db.collection('posts').updateOne(
      { _id: oid(postId) },
      { $set: { commentCount: comments.length } },
    );
    total += comments.length;
    console.log(`  post ${postId.slice(-6)}: ${comments.length} comments`);
  }

  const seededIds = Object.keys(SEED).map(oid);
  await db.collection('posts').updateMany(
    { _id: { $nin: seededIds } },
    { $set: { commentCount: 0 } },
  );

  console.log(`\nDone. ${total} comments seeded.`);
  await mongoose.disconnect();
}
run();
