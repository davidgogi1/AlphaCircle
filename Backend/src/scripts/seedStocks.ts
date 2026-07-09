import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import Stock from '../models/Stock';

const STOCKS = [
  // Technology
  { ticker: 'AAPL',  name: 'Apple Inc.',                  sector: 'Technology',  exchange: 'NASDAQ' },
  { ticker: 'MSFT',  name: 'Microsoft Corporation',        sector: 'Technology',  exchange: 'NASDAQ' },
  { ticker: 'NVDA',  name: 'NVIDIA Corporation',           sector: 'Technology',  exchange: 'NASDAQ' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.',                sector: 'Technology',  exchange: 'NASDAQ' },
  { ticker: 'META',  name: 'Meta Platforms Inc.',          sector: 'Technology',  exchange: 'NASDAQ' },
  { ticker: 'AMD',   name: 'Advanced Micro Devices',       sector: 'Technology',  exchange: 'NASDAQ' },
  { ticker: 'TSLA',  name: 'Tesla Inc.',                   sector: 'Technology',  exchange: 'NASDAQ' },
  { ticker: 'AMZN',  name: 'Amazon.com Inc.',              sector: 'Technology',  exchange: 'NASDAQ' },
  { ticker: 'NFLX',  name: 'Netflix Inc.',                 sector: 'Technology',  exchange: 'NASDAQ' },
  { ticker: 'INTC',  name: 'Intel Corporation',            sector: 'Technology',  exchange: 'NASDAQ' },
  { ticker: 'CRM',   name: 'Salesforce Inc.',              sector: 'Technology',  exchange: 'NYSE'   },
  { ticker: 'ADBE',  name: 'Adobe Inc.',                   sector: 'Technology',  exchange: 'NASDAQ' },
  { ticker: 'ORCL',  name: 'Oracle Corporation',           sector: 'Technology',  exchange: 'NYSE'   },
  { ticker: 'UBER',  name: 'Uber Technologies',            sector: 'Technology',  exchange: 'NYSE'   },
  { ticker: 'SNOW',  name: 'Snowflake Inc.',               sector: 'Technology',  exchange: 'NYSE'   },

  // Finance
  { ticker: 'JPM',   name: 'JPMorgan Chase & Co.',         sector: 'Finance',     exchange: 'NYSE'   },
  { ticker: 'BAC',   name: 'Bank of America Corp.',        sector: 'Finance',     exchange: 'NYSE'   },
  { ticker: 'GS',    name: 'Goldman Sachs Group',          sector: 'Finance',     exchange: 'NYSE'   },
  { ticker: 'V',     name: 'Visa Inc.',                    sector: 'Finance',     exchange: 'NYSE'   },
  { ticker: 'MA',    name: 'Mastercard Inc.',              sector: 'Finance',     exchange: 'NYSE'   },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway',           sector: 'Finance',     exchange: 'NYSE'   },
  { ticker: 'MS',    name: 'Morgan Stanley',               sector: 'Finance',     exchange: 'NYSE'   },
  { ticker: 'BLK',   name: 'BlackRock Inc.',               sector: 'Finance',     exchange: 'NYSE'   },

  // Healthcare
  { ticker: 'LLY',   name: 'Eli Lilly and Company',        sector: 'Healthcare',  exchange: 'NYSE'   },
  { ticker: 'JNJ',   name: 'Johnson & Johnson',            sector: 'Healthcare',  exchange: 'NYSE'   },
  { ticker: 'UNH',   name: 'UnitedHealth Group',           sector: 'Healthcare',  exchange: 'NYSE'   },
  { ticker: 'ABBV',  name: 'AbbVie Inc.',                  sector: 'Healthcare',  exchange: 'NYSE'   },
  { ticker: 'PFE',   name: 'Pfizer Inc.',                  sector: 'Healthcare',  exchange: 'NYSE'   },
  { ticker: 'MRK',   name: 'Merck & Co. Inc.',             sector: 'Healthcare',  exchange: 'NYSE'   },

  // Energy
  { ticker: 'XOM',   name: 'Exxon Mobil Corporation',      sector: 'Energy',      exchange: 'NYSE'   },
  { ticker: 'CVX',   name: 'Chevron Corporation',          sector: 'Energy',      exchange: 'NYSE'   },
  { ticker: 'COP',   name: 'ConocoPhillips',               sector: 'Energy',      exchange: 'NYSE'   },
  { ticker: 'SLB',   name: 'SLB (Schlumberger)',           sector: 'Energy',      exchange: 'NYSE'   },

  // Consumer
  { ticker: 'WMT',   name: 'Walmart Inc.',                 sector: 'Consumer',    exchange: 'NYSE'   },
  { ticker: 'COST',  name: 'Costco Wholesale Corp.',       sector: 'Consumer',    exchange: 'NASDAQ' },
  { ticker: 'MCD',   name: "McDonald's Corporation",       sector: 'Consumer',    exchange: 'NYSE'   },
  { ticker: 'NKE',   name: 'Nike Inc.',                    sector: 'Consumer',    exchange: 'NYSE'   },
  { ticker: 'SBUX',  name: 'Starbucks Corporation',        sector: 'Consumer',    exchange: 'NASDAQ' },
  { ticker: 'HD',    name: 'The Home Depot Inc.',          sector: 'Consumer',    exchange: 'NYSE'   },
  { ticker: 'KO',    name: 'The Coca-Cola Company',        sector: 'Consumer',    exchange: 'NYSE'   },
  { ticker: 'PEP',   name: 'PepsiCo Inc.',                 sector: 'Consumer',    exchange: 'NASDAQ' },

  // Industrials
  { ticker: 'BA',    name: 'Boeing Company',               sector: 'Industrials', exchange: 'NYSE'   },
  { ticker: 'CAT',   name: 'Caterpillar Inc.',             sector: 'Industrials', exchange: 'NYSE'   },
  { ticker: 'GE',    name: 'GE Aerospace',                 sector: 'Industrials', exchange: 'NYSE'   },
  { ticker: 'RTX',   name: 'RTX Corporation',              sector: 'Industrials', exchange: 'NYSE'   },

  // ETFs
  { ticker: 'SPY',   name: 'SPDR S&P 500 ETF',            sector: 'ETF',         exchange: 'NYSE'   },
  { ticker: 'QQQ',   name: 'Invesco QQQ Trust',           sector: 'ETF',         exchange: 'NASDAQ' },
  { ticker: 'IWM',   name: 'iShares Russell 2000 ETF',    sector: 'ETF',         exchange: 'NYSE'   },
  { ticker: 'GLD',   name: 'SPDR Gold Shares',            sector: 'ETF',         exchange: 'NYSE'   },
  { ticker: 'VTI',   name: 'Vanguard Total Stock Market', sector: 'ETF',         exchange: 'NYSE'   },

  // Crypto-adjacent
  { ticker: 'COIN',  name: 'Coinbase Global Inc.',         sector: 'Crypto',      exchange: 'NASDAQ' },
  { ticker: 'MSTR',  name: 'MicroStrategy Inc.',           sector: 'Crypto',      exchange: 'NASDAQ' },
  { ticker: 'RIOT',  name: 'Riot Platforms Inc.',          sector: 'Crypto',      exchange: 'NASDAQ' },
];

async function seedStocks() {
  await connectDB();

  const existing = await Stock.countDocuments();
  if (existing >= STOCKS.length) {
    console.log(`Stocks already seeded (${existing} exist).`);
    await mongoose.disconnect();
    return;
  }

  let created = 0;
  for (const s of STOCKS) {
    await Stock.updateOne({ ticker: s.ticker }, { $setOnInsert: s }, { upsert: true });
    created++;
  }
  console.log(`Seeded ${created} stocks.`);
  await mongoose.disconnect();
}

seedStocks().catch(e => { console.error(e); process.exit(1); });
