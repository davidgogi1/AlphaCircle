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

function d(iso: string) { return new Date(iso); }

const EVENTS = [
  {
    company: 'JPMorgan Chase',
    ticker: 'JPM',
    period: 'Q2 2026',
    eventType: 'Earnings Release',
    eventDate: d('2026-07-11'),
    metrics: [
      { key: 'revenue',  label: 'Net Revenue',         unit: '$B',  description: 'Total managed net revenue' },
      { key: 'nii',      label: 'Net Interest Income',  unit: '$B',  description: 'Interest earned minus interest paid' },
      { key: 'eps',      label: 'EPS',                  unit: '$',   description: 'Diluted earnings per share' },
      { key: 'roe',      label: 'Return on Equity',     unit: '%',   description: 'Annualised ROE' },
    ],
    forecasts: [
      { user: 0, values: { revenue: 43.8, nii: 23.1, eps: 4.62, roe: 17.2 } },
      { user: 1, values: { revenue: 44.5, nii: 23.4, eps: 4.71, roe: 17.8 } },
      { user: 2, values: { revenue: 43.2, nii: 22.8, eps: 4.55, roe: 16.9 } },
      { user: 3, values: { revenue: 44.1, nii: 23.2, eps: 4.68, roe: 17.5 } },
      { user: 4, values: { revenue: 43.6, nii: 22.9, eps: 4.59, roe: 17.0 } },
    ],
  },
  {
    company: 'ASML',
    ticker: 'ASML',
    period: 'Q2 2026',
    eventType: 'Earnings Release',
    eventDate: d('2026-07-16'),
    metrics: [
      { key: 'orders',   label: 'Net Bookings',   unit: '€B',  description: 'New equipment orders received in the quarter' },
      { key: 'revenue',  label: 'Revenue',         unit: '€B',  description: 'Total net sales' },
      { key: 'ebit',     label: 'EBIT',            unit: '€B',  description: 'Earnings before interest & tax' },
      { key: 'eps',      label: 'EPS',             unit: '€',   description: 'Basic earnings per share' },
    ],
    forecasts: [
      { user: 0, values: { orders: 4.2,  revenue: 8.1,  ebit: 2.7,  eps: 5.85 } },
      { user: 1, values: { orders: 3.8,  revenue: 7.9,  ebit: 2.6,  eps: 5.62 } },
      { user: 2, values: { orders: 4.5,  revenue: 8.3,  ebit: 2.8,  eps: 6.01 } },
      { user: 3, values: { orders: 3.9,  revenue: 8.0,  ebit: 2.65, eps: 5.74 } },
      { user: 4, values: { orders: 4.1,  revenue: 8.2,  ebit: 2.72, eps: 5.90 } },
      { user: 5, values: { orders: 4.4,  revenue: 8.15, ebit: 2.74, eps: 5.95 } },
    ],
  },
  {
    company: 'Tesla',
    ticker: 'TSLA',
    period: 'Q2 2026',
    eventType: 'Earnings Release',
    eventDate: d('2026-07-22'),
    metrics: [
      { key: 'deliveries',  label: 'Vehicle Deliveries', unit: 'K units', description: 'Total vehicles delivered' },
      { key: 'revenue',     label: 'Revenue',             unit: '$B',      description: 'Total revenue' },
      { key: 'autoMargin',  label: 'Auto Gross Margin',   unit: '%',       description: 'Gross margin excl. credits' },
      { key: 'eps',         label: 'EPS',                 unit: '$',       description: 'Adjusted EPS' },
    ],
    forecasts: [
      { user: 0, values: { deliveries: 498, revenue: 24.8, autoMargin: 17.2, eps: 0.52 } },
      { user: 1, values: { deliveries: 512, revenue: 25.4, autoMargin: 17.8, eps: 0.55 } },
      { user: 2, values: { deliveries: 485, revenue: 24.2, autoMargin: 16.8, eps: 0.48 } },
      { user: 3, values: { deliveries: 505, revenue: 25.1, autoMargin: 17.5, eps: 0.53 } },
      { user: 5, values: { deliveries: 520, revenue: 25.8, autoMargin: 18.1, eps: 0.57 } },
    ],
  },
  {
    company: 'Microsoft',
    ticker: 'MSFT',
    period: 'Q4 FY2026',
    eventType: 'Earnings Release',
    eventDate: d('2026-07-29'),
    metrics: [
      { key: 'revenue',    label: 'Revenue',           unit: '$B', description: 'Total revenue' },
      { key: 'azureGrowth',label: 'Azure Growth',      unit: '%',  description: 'Azure and other cloud services YoY growth' },
      { key: 'opIncome',   label: 'Operating Income',  unit: '$B', description: 'Operating income' },
      { key: 'eps',        label: 'EPS',               unit: '$',  description: 'Diluted EPS' },
    ],
    forecasts: [
      { user: 0, values: { revenue: 73.2, azureGrowth: 34, opIncome: 31.8, eps: 3.24 } },
      { user: 1, values: { revenue: 72.8, azureGrowth: 33, opIncome: 31.4, eps: 3.18 } },
      { user: 2, values: { revenue: 74.1, azureGrowth: 35, opIncome: 32.5, eps: 3.31 } },
      { user: 3, values: { revenue: 73.5, azureGrowth: 34, opIncome: 32.0, eps: 3.27 } },
      { user: 4, values: { revenue: 72.5, azureGrowth: 32, opIncome: 31.1, eps: 3.14 } },
    ],
  },
  {
    company: 'Meta',
    ticker: 'META',
    period: 'Q2 2026',
    eventType: 'Earnings Release',
    eventDate: d('2026-07-30'),
    metrics: [
      { key: 'revenue',  label: 'Revenue',   unit: '$B',  description: 'Advertising and other revenue' },
      { key: 'dau',      label: 'DAU',       unit: 'M',   description: 'Daily active users across the family of apps' },
      { key: 'arpu',     label: 'ARPU',      unit: '$',   description: 'Average revenue per user (worldwide)' },
      { key: 'eps',      label: 'EPS',       unit: '$',   description: 'Diluted EPS' },
    ],
    forecasts: [
      { user: 0, values: { revenue: 45.2, dau: 3410, arpu: 13.26, eps: 6.12 } },
      { user: 1, values: { revenue: 44.8, dau: 3380, arpu: 13.25, eps: 6.05 } },
      { user: 2, values: { revenue: 45.9, dau: 3440, arpu: 13.34, eps: 6.21 } },
      { user: 3, values: { revenue: 45.5, dau: 3420, arpu: 13.29, eps: 6.15 } },
      { user: 4, values: { revenue: 44.5, dau: 3370, arpu: 13.20, eps: 5.98 } },
      { user: 5, values: { revenue: 46.1, dau: 3455, arpu: 13.40, eps: 6.28 } },
    ],
  },
  {
    company: 'Apple',
    ticker: 'AAPL',
    period: 'Q3 FY2026',
    eventType: 'Earnings Release',
    eventDate: d('2026-07-31'),
    metrics: [
      { key: 'revenue',   label: 'Revenue',          unit: '$B', description: 'Total net sales' },
      { key: 'iphone',    label: 'iPhone Revenue',   unit: '$B', description: 'iPhone segment revenue' },
      { key: 'services',  label: 'Services Revenue', unit: '$B', description: 'Services segment revenue' },
      { key: 'eps',       label: 'EPS',              unit: '$',  description: 'Diluted EPS' },
    ],
    forecasts: [
      { user: 0, values: { revenue: 98.4, iphone: 46.2, services: 26.8, eps: 1.58 } },
      { user: 1, values: { revenue: 97.8, iphone: 45.8, services: 26.5, eps: 1.55 } },
      { user: 2, values: { revenue: 99.1, iphone: 46.8, services: 27.1, eps: 1.62 } },
      { user: 3, values: { revenue: 98.7, iphone: 46.5, services: 26.9, eps: 1.60 } },
      { user: 4, values: { revenue: 97.2, iphone: 45.4, services: 26.2, eps: 1.52 } },
    ],
  },
  {
    company: 'Amazon',
    ticker: 'AMZN',
    period: 'Q2 2026',
    eventType: 'Earnings Release',
    eventDate: d('2026-07-31'),
    metrics: [
      { key: 'revenue',   label: 'Revenue',         unit: '$B', description: 'Total net sales' },
      { key: 'aws',       label: 'AWS Revenue',     unit: '$B', description: 'Amazon Web Services segment' },
      { key: 'opIncome',  label: 'Operating Income',unit: '$B', description: 'Total operating income' },
      { key: 'eps',       label: 'EPS',             unit: '$',  description: 'Diluted EPS' },
    ],
    forecasts: [
      { user: 0, values: { revenue: 163.8, aws: 30.2, opIncome: 19.4, eps: 1.72 } },
      { user: 2, values: { revenue: 165.1, aws: 30.8, opIncome: 20.1, eps: 1.78 } },
      { user: 3, values: { revenue: 162.5, aws: 29.8, opIncome: 18.9, eps: 1.68 } },
      { user: 4, values: { revenue: 164.4, aws: 30.5, opIncome: 19.8, eps: 1.75 } },
    ],
  },
  {
    company: 'Novo Nordisk',
    ticker: 'NVO',
    period: 'H1 2026',
    eventType: 'Half-Year Results',
    eventDate: d('2026-08-13'),
    metrics: [
      { key: 'revenue',   label: 'Revenue',         unit: 'DKK B', description: 'Total net sales' },
      { key: 'glp1',      label: 'GLP-1 Sales',     unit: 'DKK B', description: 'Ozempic + Wegovy + Rybelsus combined' },
      { key: 'ebit',      label: 'Operating Profit', unit: 'DKK B', description: 'EBIT' },
      { key: 'eps',       label: 'EPS',             unit: 'DKK',   description: 'Diluted EPS' },
    ],
    forecasts: [
      { user: 0, values: { revenue: 141.2, glp1: 115.4, ebit: 67.8, eps: 8.42 } },
      { user: 1, values: { revenue: 138.5, glp1: 112.8, ebit: 66.1, eps: 8.21 } },
      { user: 2, values: { revenue: 143.8, glp1: 117.9, ebit: 69.2, eps: 8.61 } },
      { user: 3, values: { revenue: 140.1, glp1: 114.5, ebit: 67.2, eps: 8.35 } },
      { user: 5, values: { revenue: 142.5, glp1: 116.8, ebit: 68.5, eps: 8.52 } },
    ],
  },
  {
    company: 'NVIDIA',
    ticker: 'NVDA',
    period: 'Q2 FY2027',
    eventType: 'Earnings Release',
    eventDate: d('2026-08-27'),
    metrics: [
      { key: 'revenue',    label: 'Revenue',             unit: '$B',  description: 'Total revenue' },
      { key: 'dcRevenue',  label: 'Data Center Revenue', unit: '$B',  description: 'Data Center segment revenue' },
      { key: 'grossMargin',label: 'Gross Margin',        unit: '%',   description: 'GAAP gross margin' },
      { key: 'eps',        label: 'EPS',                 unit: '$',   description: 'Non-GAAP diluted EPS' },
    ],
    forecasts: [
      { user: 0, values: { revenue: 47.5, dcRevenue: 43.2, grossMargin: 74.8, eps: 0.98 } },
      { user: 1, values: { revenue: 46.8, dcRevenue: 42.5, grossMargin: 74.2, eps: 0.95 } },
      { user: 2, values: { revenue: 48.4, dcRevenue: 44.1, grossMargin: 75.3, eps: 1.02 } },
      { user: 3, values: { revenue: 47.1, dcRevenue: 42.9, grossMargin: 74.5, eps: 0.97 } },
      { user: 4, values: { revenue: 49.2, dcRevenue: 44.8, grossMargin: 75.8, eps: 1.05 } },
      { user: 5, values: { revenue: 46.5, dcRevenue: 42.2, grossMargin: 73.9, eps: 0.94 } },
    ],
  },
  {
    company: 'Berkshire Hathaway',
    ticker: 'BRK.B',
    period: 'Q2 2026',
    eventType: 'Earnings Release',
    eventDate: d('2026-08-08'),
    metrics: [
      { key: 'opEps',      label: 'Operating EPS',        unit: '$',  description: 'Operating earnings per Class B equivalent share' },
      { key: 'bookValue',  label: 'Book Value per Share', unit: '$',  description: 'Per Class B equivalent share' },
      { key: 'insurance',  label: 'Insurance Underwriting', unit: '$B', description: 'Pre-tax underwriting gain/loss' },
    ],
    forecasts: [
      { user: 0, values: { opEps: 6.12, bookValue: 238.4, insurance: 3.8 } },
      { user: 2, values: { opEps: 5.98, bookValue: 236.1, insurance: 3.5 } },
      { user: 3, values: { opEps: 6.25, bookValue: 240.2, insurance: 4.1 } },
      { user: 5, values: { opEps: 6.08, bookValue: 237.8, insurance: 3.7 } },
    ],
  },
  {
    company: 'LVMH',
    ticker: 'MC',
    period: 'H1 2026',
    eventType: 'Half-Year Results',
    eventDate: d('2026-07-24'),
    metrics: [
      { key: 'revenue',    label: 'Revenue',              unit: '€B', description: 'Consolidated revenue' },
      { key: 'organicGrowth', label: 'Organic Revenue Growth', unit: '%', description: 'Revenue growth excl. FX and scope effects' },
      { key: 'ebit',       label: 'Recurring Operating Income', unit: '€B', description: 'EBIT from recurring operations' },
      { key: 'eps',        label: 'EPS',                  unit: '€',  description: 'Basic EPS' },
    ],
    forecasts: [
      { user: 0, values: { revenue: 41.8, organicGrowth: 4.2, ebit: 10.4, eps: 9.85 } },
      { user: 1, values: { revenue: 42.4, organicGrowth: 5.1, ebit: 10.8, eps: 10.12 } },
      { user: 3, values: { revenue: 41.2, organicGrowth: 3.5, ebit: 10.1, eps: 9.62 } },
      { user: 4, values: { revenue: 42.1, organicGrowth: 4.8, ebit: 10.6, eps: 9.98 } },
    ],
  },
  {
    company: 'Airbus',
    ticker: 'AIR',
    period: 'H1 2026',
    eventType: 'Half-Year Results',
    eventDate: d('2026-07-30'),
    metrics: [
      { key: 'deliveries', label: 'Aircraft Deliveries', unit: 'units', description: 'Commercial aircraft delivered in H1' },
      { key: 'revenue',    label: 'Revenue',             unit: '€B',    description: 'Total revenues' },
      { key: 'ebit',       label: 'Adj. EBIT',           unit: '€B',    description: 'Adjusted earnings before interest & tax' },
      { key: 'eps',        label: 'EPS',                 unit: '€',     description: 'Reported EPS' },
    ],
    forecasts: [
      { user: 0, values: { deliveries: 355, revenue: 31.8, ebit: 3.4, eps: 3.95 } },
      { user: 1, values: { deliveries: 362, revenue: 32.4, ebit: 3.6, eps: 4.12 } },
      { user: 2, values: { deliveries: 348, revenue: 31.2, ebit: 3.2, eps: 3.78 } },
      { user: 4, values: { deliveries: 358, revenue: 32.0, ebit: 3.5, eps: 4.02 } },
      { user: 5, values: { deliveries: 365, revenue: 32.7, ebit: 3.7, eps: 4.18 } },
    ],
  },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection;

  await db.collection('consensusevents').deleteMany({});
  await db.collection('consensusforecasts').deleteMany({});

  for (const ev of EVENTS) {
    const { forecasts, ...eventData } = ev;
    const inserted = await db.collection('consensusevents').insertOne(eventData);
    const eventId = inserted.insertedId;

    for (const fc of forecasts) {
      await db.collection('consensusforecasts').insertOne({
        event: eventId,
        user:  new mongoose.Types.ObjectId(AUTHORS[fc.user % AUTHORS.length]),
        values: fc.values,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    console.log(`  ${ev.company} ${ev.period}: ${forecasts.length} forecasts`);
  }

  console.log(`\nDone. Seeded ${EVENTS.length} events.`);
  await mongoose.disconnect();
}
run();
