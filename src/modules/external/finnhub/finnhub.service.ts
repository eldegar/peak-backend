import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { Cache } from 'cache-manager';
import {
  InvalidSymbolError,
  StockDataProviderError,
  StockDataProviderRateLimitError,
  StockDataProviderUnauthorizedError,
} from '@app/modules/stock/exceptions/stock-provider.exceptions';
import { IFinnhubClient, IFinnhubQuoteResponse } from './interfaces/finnhub.interface';

@Injectable()
export class FinnhubService implements IFinnhubClient {
  private readonly logger = new Logger(FinnhubService.name);
  private readonly httpClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://finnhub.io/api/v1';

  // Symbol validation cache
  private readonly SYMBOL_VALIDATION_TTL = 3600000; // 60 minutes

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.apiKey = this.configService.get<string>('FINNHUB_API_KEY') || '';
    if (!this.apiKey) {
      throw new Error('FINNHUB_API_KEY environment variable is required');
    }

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000, // 10 second request timeout
      headers: {
        'User-Agent': 'stock-price-checker/1.0',
      },
    });
  }

  async getQuote(symbol: string): Promise<IFinnhubQuoteResponse> {
    const cacheKey = `symbol_valid:${symbol}`;
    this.validateSymbolFormat(symbol);

    try {
      const cachedResult = await this.cacheManager.get<boolean>(cacheKey);

      if (cachedResult !== undefined) {
        if (cachedResult === false) {
          throw new InvalidSymbolError(symbol);
        }
        this.logger.debug(`Symbol validation cache hit for ${symbol} - fetching quote data`);
        return this.fetchQuoteData(symbol);
      }

      // Cache miss - validate by fetching quote data
      this.logger.debug(`Symbol validation cache miss for ${symbol} - validating with quote fetch`);

      try {
        const quoteData = await this.fetchQuoteData(symbol);
        // Cache validation success
        await this.cacheManager.set(cacheKey, true, this.SYMBOL_VALIDATION_TTL);
        this.logger.debug(`Symbol ${symbol} is valid - cached validation result`);
        return quoteData;
      } catch (error) {
        if (error instanceof InvalidSymbolError) {
          await this.cacheManager.set(cacheKey, false, this.SYMBOL_VALIDATION_TTL);
          this.logger.debug(`Symbol ${symbol} is invalid - cached result`);
        }
        throw error;
      }
    } catch (cacheError) {
      this.logger.warn(`Failed to check symbol validation cache for ${symbol}`, {
        error: cacheError instanceof Error ? cacheError.message : String(cacheError),
      });

      // Fallback: just fetch the quote data
      return this.fetchQuoteData(symbol);
    }
  }

  private async fetchQuoteData(symbol: string): Promise<IFinnhubQuoteResponse> {
    try {
      const response = await this.httpClient.get<IFinnhubQuoteResponse>('/quote', {
        params: {
          symbol: symbol.toUpperCase(),
          token: this.apiKey,
        },
        timeout: 30000,
      });

      if (!response.data || response.data.c === 0) {
        const error = new InvalidSymbolError(symbol);
        throw error;
      }

      this.logger.debug(`Successfully fetched price for ${symbol}`, {
        symbol,
        price: response.data.c,
      });

      return response.data;
    } catch (error: unknown) {
      // Don't retry if it's already a business logic error
      if (error instanceof InvalidSymbolError) {
        throw error;
      }

      this.handleApiErrors(error, symbol);
    }
  }

  handleApiErrors(error: any, symbol?: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      switch (axiosError.response?.status) {
        case 401:
          throw new StockDataProviderUnauthorizedError('Finnhub');
        case 429:
          throw new StockDataProviderRateLimitError('Finnhub');
        case 403:
          throw new InvalidSymbolError(symbol || 'Unknown symbol');
        default:
          throw new StockDataProviderError(axiosError.message || 'Unknown API error', 'Finnhub');
      }
    }

    throw new StockDataProviderError(error instanceof Error ? error.message : 'Unknown error', 'Finnhub');
  }

  private validateSymbolFormat(symbol: string): void {
    if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
      throw new InvalidSymbolError('Symbol cannot be empty');
    }

    if (symbol.length > 10) {
      throw new InvalidSymbolError('Symbol too long (max 10 characters)');
    }

    if (!/^[A-Za-z0-9.-]+$/.test(symbol)) {
      throw new InvalidSymbolError('Symbol contains invalid characters');
    }
  }
}
