export interface StockQuote {
  symbol: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: Date;
}

export interface IStockDataProvider {
  getQuote(symbol: string): Promise<StockQuote>;
  isHealthy(): Promise<boolean>;
}

export interface StockDataProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  rateLimitPerMinute?: number;
}
