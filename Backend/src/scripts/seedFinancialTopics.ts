import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection;

  // Wipe existing topics and migrate threads
  await db.collection('topics').deleteMany({});
  console.log('Cleared old topics.');

  const sectors = [
    { name: 'Energy',                   slug: 'energy',                   icon: '⚡', description: 'Oil, gas, renewables and energy infrastructure', type: 'sector' },
    { name: 'Materials',                slug: 'materials',                 icon: '⚗️', description: 'Mining, chemicals and raw materials', type: 'sector' },
    { name: 'Industrials',              slug: 'industrials',               icon: '🏭', description: 'Aerospace, defence, machinery and transport', type: 'sector' },
    { name: 'Consumer Discretionary',   slug: 'consumer-discretionary',   icon: '🛍️', description: 'Retail, autos, leisure and luxury goods', type: 'sector' },
    { name: 'Consumer Staples',         slug: 'consumer-staples',          icon: '🛒', description: 'Food, beverages, household and personal products', type: 'sector' },
    { name: 'Healthcare',               slug: 'healthcare',                icon: '💊', description: 'Pharma, biotech, medtech and health services', type: 'sector' },
    { name: 'Financials',               slug: 'financials',                icon: '🏦', description: 'Banks, insurers, asset managers and fintech', type: 'sector' },
    { name: 'Information Technology',   slug: 'information-technology',    icon: '💻', description: 'Software, semiconductors and IT services', type: 'sector' },
    { name: 'Communication Services',   slug: 'communication-services',    icon: '📡', description: 'Telecoms, media and internet platforms', type: 'sector' },
    { name: 'Utilities',                slug: 'utilities',                  icon: '🔌', description: 'Electric, gas and water utilities', type: 'sector' },
    { name: 'Real Estate',              slug: 'real-estate',               icon: '🏢', description: 'REITs, property developers and real estate services', type: 'sector' },
  ];

  const topics = [
    { name: 'Earnings & Results',   slug: 'earnings',          icon: '📊', description: 'Quarterly and annual earnings, revenue, guidance', type: 'topic' },
    { name: 'M&A',                  slug: 'mergers',           icon: '🤝', description: 'Mergers, acquisitions, spin-offs and deal flow', type: 'topic' },
    { name: 'IPOs & Listings',      slug: 'ipos',              icon: '🚀', description: 'New listings, SPACs and direct listings', type: 'topic' },
    { name: 'Macro & Rates',        slug: 'macro',             icon: '🌍', description: 'Interest rates, inflation, central banks and GDP', type: 'topic' },
    { name: 'Technical Analysis',   slug: 'technical',         icon: '📈', description: 'Charts, patterns, indicators and price action', type: 'topic' },
    { name: 'Regulation & Policy',  slug: 'regulation',        icon: '⚖️', description: 'Government policy, regulation and geopolitics', type: 'topic' },
    { name: 'Value Investing',      slug: 'value',             icon: '💎', description: 'Deep value, fundamental analysis and margin of safety', type: 'topic' },
    { name: 'Growth Investing',     slug: 'growth',            icon: '🌱', description: 'High-growth companies, disruption and innovation', type: 'topic' },
    { name: 'Dividends & Income',   slug: 'dividends',         icon: '💰', description: 'Dividend stocks, yield and income strategies', type: 'topic' },
    { name: 'Crypto & Digital Assets', slug: 'crypto',         icon: '₿',  description: 'Bitcoin, Ethereum, DeFi and digital assets', type: 'topic' },
    { name: 'Commodities',          slug: 'commodities',       icon: '🥇', description: 'Gold, oil, agricultural and industrial commodities', type: 'topic' },
    { name: 'Short Selling',        slug: 'short-selling',     icon: '🔻', description: 'Short theses, fraud detection and bearish cases', type: 'topic' },
  ];

  const companies = [
    { name: 'Apple (AAPL)',           slug: 'aapl',   icon: '🍎', description: 'Consumer electronics, software and services', type: 'company' },
    { name: 'Microsoft (MSFT)',       slug: 'msft',   icon: '🪟', description: 'Cloud computing, enterprise software and gaming', type: 'company' },
    { name: 'NVIDIA (NVDA)',          slug: 'nvda',   icon: '🎮', description: 'GPUs, AI accelerators and data centre chips', type: 'company' },
    { name: 'Alphabet (GOOGL)',       slug: 'googl',  icon: '🔍', description: 'Search, cloud, advertising and AI', type: 'company' },
    { name: 'Amazon (AMZN)',          slug: 'amzn',   icon: '📦', description: 'E-commerce, cloud (AWS) and logistics', type: 'company' },
    { name: 'Meta (META)',            slug: 'meta',   icon: '📱', description: 'Social media, AR/VR and digital advertising', type: 'company' },
    { name: 'Tesla (TSLA)',           slug: 'tsla',   icon: '⚡', description: 'Electric vehicles, energy storage and autonomy', type: 'company' },
    { name: 'ASML (ASML)',            slug: 'asml',   icon: '🔬', description: 'Semiconductor lithography equipment', type: 'company' },
    { name: 'JPMorgan Chase (JPM)',   slug: 'jpm',    icon: '🏦', description: 'Global investment bank and financial services', type: 'company' },
    { name: 'Novo Nordisk (NVO)',     slug: 'nvo',    icon: '💉', description: 'GLP-1 drugs, diabetes and obesity treatments', type: 'company' },
    { name: 'LVMH (MC)',              slug: 'lvmh',   icon: '👜', description: 'Luxury goods: Louis Vuitton, Dior and more', type: 'company' },
    { name: 'ExxonMobil (XOM)',       slug: 'xom',    icon: '🛢️', description: 'Integrated oil and gas major', type: 'company' },
    { name: 'Visa (V)',               slug: 'visa',   icon: '💳', description: 'Global payments network', type: 'company' },
    { name: 'Berkshire Hathaway (BRK)', slug: 'brk',  icon: '🧮', description: 'Warren Buffett\'s diversified holding company', type: 'company' },
    { name: 'Samsung (005930)',       slug: 'samsung',icon: '📺', description: 'Consumer electronics, chips and displays', type: 'company' },
    { name: 'BYD (BYDDF)',            slug: 'byd',    icon: '🔋', description: 'Chinese EV and battery manufacturer', type: 'company' },
    { name: 'Airbus (AIR)',           slug: 'airbus', icon: '✈️', description: 'Commercial aircraft and defence', type: 'company' },
    { name: 'Siemens (SIE)',          slug: 'siemens',icon: '⚙️', description: 'Industrial automation, energy and healthcare tech', type: 'company' },
    { name: 'Nestlé (NESN)',          slug: 'nestle', icon: '🍫', description: 'Food and beverage giant', type: 'company' },
    { name: 'Shopify (SHOP)',         slug: 'shop',   icon: '🛒', description: 'E-commerce platform for merchants', type: 'company' },
  ];

  const all = [...sectors, ...topics, ...companies];
  await db.collection('topics').insertMany(all);
  console.log(`Inserted ${sectors.length} sectors, ${topics.length} topics, ${companies.length} companies.`);

  // Migrate existing threads: set tags = [topic] where tags is empty
  const result = await db.collection('threads').updateMany(
    { tags: { $exists: false } },
    [{ $set: { tags: ['$topic'] } }],
  );
  console.log(`Migrated ${result.modifiedCount} existing threads to use tags array.`);

  await mongoose.disconnect();
}
run();
