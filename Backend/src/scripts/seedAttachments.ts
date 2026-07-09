import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';
import User from '../models/User';
import Post from '../models/Post';
import Thread from '../models/Thread';
import Topic from '../models/Topic';

const UPLOADS = path.join(process.cwd(), 'uploads');

function generatePdf(filepath: string, title: string, lines: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 60 });
    const chunks: Buffer[] = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const buf = Buffer.concat(chunks);
      fs.writeFileSync(filepath, buf);
      resolve(buf.length);
    });
    doc.on('error', reject);

    doc.fontSize(18).font('Helvetica-Bold').text(title, { underline: true });
    doc.moveDown(0.8);
    doc.fontSize(11).font('Helvetica');
    for (const line of lines) {
      if (line === '') { doc.moveDown(0.4); }
      else             { doc.text(line); }
    }
    doc.end();
  });
}

function writeTxt(filename: string, content: string): number {
  fs.writeFileSync(path.join(UPLOADS, filename), content);
  return Buffer.byteLength(content);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  fs.mkdirSync(UPLOADS, { recursive: true });

  const user = await User.findOne({ username: 'David1' }).lean();
  if (!user) { console.error('David1 not found'); process.exit(1); }

  // ── File 1: PDF earnings report attached to a post ─────────────────────────
  const pdf1Name = 'nvda-q4-report.pdf';

  await Post.deleteOne({ 'attachment.filename': pdf1Name });
  fs.rmSync(path.join(UPLOADS, pdf1Name), { force: true });

  const pdf1Size = await generatePdf(path.join(UPLOADS, pdf1Name), 'NVDA Q4 2024 Earnings Summary', [
    'Reported: February 21, 2025',
    '',
    'Revenue:        $22.1B    (+265% YoY, +18% QoQ)',
    'Gross Margin:   74.6%     (+4 pp YoY)',
    'Net Income:     $12.3B    (+769% YoY)',
    'EPS (diluted):  $4.93     beat estimate of $4.64',
    '',
    'Segment Breakdown',
    '----------------------------',
    'Data Center:    $18.4B    (+409% YoY) — driven by H100/H200 demand',
    'Gaming:         $2.9B     (+56% YoY)  — Ada Lovelace upturn',
    'Professional:   $0.5B     (+11% YoY)',
    'Automotive:     $0.3B     (+17% YoY)',
    '',
    'Q1 2025 Guidance',
    '----------------------------',
    'Revenue:        ~$24.0B   +/-2%',
    'Gross Margin:   ~76.3%',
    '',
    'Key Takeaways',
    '----------------------------',
    '- Blackwell ramp on track; full production in H1 2025.',
    '- Sovereign AI orders (governments buying clusters) becoming material.',
    '- Inferencing workloads growing faster than training — sustains demand.',
    '- Free cash flow $11.5B — buybacks accelerating ($25B authorization).',
    '',
    'Analyst Consensus: Strong Buy | Avg. PT $1,050',
  ]);

  await Post.create({
    title:   'NVDA Q4 2024 — Full Earnings Breakdown (PDF)',
    content: 'Attached the full earnings breakdown as a PDF. Data Center at $18.4B is insane — +409% YoY. Blackwell ramp looks on track. Still my largest position and adding on any dip under $800.',
    author:  user._id,
    attachment: {
      filename:     pdf1Name,
      originalName: 'NVDA_Q4_2024_Earnings.pdf',
      mimetype:     'application/pdf',
      size:         pdf1Size,
    },
  });
  console.log(`Created post with PDF (${(pdf1Size / 1024).toFixed(1)} KB).`);

  // ── File 2: TXT thesis attached to a discussion thread ─────────────────────
  const txt2Name = 'btc-thesis-2025.txt';

  await Thread.deleteOne({ 'attachment.filename': txt2Name });
  fs.rmSync(path.join(UPLOADS, txt2Name), { force: true });

  const txt2Content = `BITCOIN INVESTMENT THESIS — 2025
=================================

Author: David1 | AlphaCircle | July 2025


EXECUTIVE SUMMARY
-----------------
Bitcoin is entering a structural bull cycle driven by ETF-led institutional
demand, post-halving supply compression, and improving regulatory clarity.
I am targeting a 12-18 month price range of $120,000 – $250,000.


KEY DRIVERS
-----------
1. Spot ETF Inflows
   BlackRock IBIT and Fidelity FBTC are collectively absorbing ~3x the
   daily mined supply. Net inflows hit $5B in a single week in Feb 2025.

2. Halving Supply Shock
   April 2024 halving cut block reward from 6.25 to 3.125 BTC/block.
   ~450 BTC/day minted vs ~3,000 BTC/day ETF demand. Classic squeeze.

3. Institutional Balance Sheet Adoption
   MicroStrategy now holds >214,000 BTC. Several S&P 500 firms followed.
   Sovereign wealth funds (Norway, Abu Dhabi) adding exposure.

4. Regulatory Clarity
   US SAB 121 reversal allows banks to custody crypto. EU MiCA live.
   Regulatory tail-risk is the lowest it has been since 2013.


PRICE TARGETS
-------------
Conservative:  $95,000   (demand/supply equilibrium, risk-off macro)
Base case:    $150,000   (ETF demand sustains, BTC/gold ratio reverts)
Bull case:    $250,000   (institutional FOMO + USD debasement narrative)


RISKS
-----
- Macro liquidity crunch (Fed re-accelerates hikes)
- ETF outflow cascade if BTC drops below key support ($52K)
- Miner capitulation if hash rate drops >30%
- Black swan: critical protocol vulnerability


POSITION SIZING
---------------
Given 30-day realised vol of ~45%, max 5-10% of portfolio is prudent.
Dollar-cost average on dips rather than lump-sum to manage drawdown risk.

Use cold storage for any position >$50K equivalent.


CONCLUSION
----------
The risk/reward is asymmetric in favour of bulls in 2025. Supply is
constrained, demand is structurally growing, and the macro narrative
(dollar debasement, fiscal deficits) has never been more supportive.

Would love to hear pushback — especially on the miner capitulation risk.
`;

  const txt2Size = writeTxt(txt2Name, txt2Content);

  const businessTopic = await Topic.findOne({ slug: 'business' }).lean();
  if (businessTopic) {
    await Thread.create({
      topic:   businessTopic._id,
      title:   'Bitcoin 2025 Thesis — Full Writeup Attached',
      content: 'Been working on this for a few weeks. Covers ETF inflows, halving dynamics, price targets and key risks. Full writeup in the TXT file below. Would love pushback.',
      author:  user._id,
      attachment: {
        filename:     txt2Name,
        originalName: 'Bitcoin_Thesis_2025.txt',
        mimetype:     'text/plain',
        size:         txt2Size,
      },
    });
    console.log(`Created thread with TXT (${txt2Size} bytes).`);
  } else {
    console.log('Business topic not found — skipping thread.');
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(console.error);
