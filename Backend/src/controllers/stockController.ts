import { Request, Response } from 'express';
import Stock from '../models/Stock';

export const getStocks = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stocks = await Stock.find().sort({ sector: 1, ticker: 1 }).lean();
    res.json({ stocks });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
