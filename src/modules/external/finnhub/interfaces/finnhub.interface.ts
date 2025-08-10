export interface IFinnhubQuoteResponse {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

export interface IFinnhubErrorResponse {
  error: string;
}

export interface IFinnhubClient {
  getQuote(symbol: string): Promise<IFinnhubQuoteResponse>;
  handleApiErrors(error: any): never;
}
