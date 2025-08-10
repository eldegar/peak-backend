export interface IMovingAverageResult {
  symbol: string;
  periods: number;
  average: string | null;
  dataPointsUsed: number;
}
