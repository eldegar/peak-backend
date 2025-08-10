import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryFailedError } from 'typeorm';
import { STOCK_DATA_PROVIDER_TOKEN } from '../constants/stock-provider.constants';
import { StockMonitoring } from '../entities/stock-monitoring.entity';
import { IStockDataProvider } from '../interfaces/stock-data-provider.interface';
import { MonitoringService } from '../monitoring.service';

describe('MonitoringService', () => {
  let service: MonitoringService;
  let stockDataProvider: jest.Mocked<IStockDataProvider>;
  const mockStockMonitoring: StockMonitoring = {
    id: 'mock-uuid',
    symbol: 'AAPL',
    isActive: true,
    lastFetch: new Date('2023-01-01T10:00:00Z'),
    createdAt: new Date('2023-01-01T09:00:00Z'),
    updatedAt: new Date('2023-01-01T10:00:00Z'),
  };

  const mockQuoteData = {
    symbol: 'AAPL',
    currentPrice: 150.0,
    change: 2.5,
    changePercent: 1.69,
    high: 152.0,
    low: 148.0,
    open: 149.0,
    previousClose: 147.5,
    timestamp: new Date('2023-01-01T10:00:00Z'),
  };

  beforeEach(async () => {
    const mockDataSource = {
      createEntityManager: jest.fn().mockReturnValue({
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: STOCK_DATA_PROVIDER_TOKEN,
          useValue: {
            getQuote: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    stockDataProvider = module.get(STOCK_DATA_PROVIDER_TOKEN);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enableMonitoring', () => {
    it('should enable monitoring for a new symbol', async () => {
      const symbol = 'AAPL';
      stockDataProvider.getQuote.mockResolvedValue(mockQuoteData);
      service.findOne = jest.fn().mockResolvedValue(null);
      service.create = jest.fn().mockReturnValue(mockStockMonitoring);
      service.save = jest.fn().mockResolvedValue(mockStockMonitoring);

      const result = await service.enableMonitoring(symbol);

      expect(stockDataProvider.getQuote).toHaveBeenCalledWith('AAPL');
      expect(service.create).toHaveBeenCalledWith({
        symbol: 'AAPL',
        isActive: true,
        lastFetch: undefined,
      });
      expect(service.save).toHaveBeenCalled();
      expect(result).toEqual({
        symbol: 'AAPL',
        isActive: true,
        lastFetch: mockStockMonitoring.lastFetch,
      });
    });

    it('should handle duplicate key constraint error', async () => {
      const symbol = 'AAPL';
      const duplicateError = new QueryFailedError(
        'INSERT',
        [],
        new Error('duplicate key value violates unique constraint'),
      );

      stockDataProvider.getQuote.mockResolvedValue(mockQuoteData);
      service.findOne = jest.fn().mockResolvedValue(null);
      service.create = jest.fn().mockReturnValue(mockStockMonitoring);
      service.save = jest.fn().mockRejectedValue(duplicateError);

      await expect(service.enableMonitoring(symbol)).rejects.toThrow(ConflictException);
    });
  });

  describe('getMonitoredSymbols', () => {
    it('should return all active monitoring configurations', async () => {
      const activeMonitoringConfigs = [mockStockMonitoring];
      service.find = jest.fn().mockResolvedValue(activeMonitoringConfigs);

      const result = await service.getMonitoredSymbols();

      expect(service.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'ASC' },
      });
      expect(result).toEqual(activeMonitoringConfigs);
    });
  });

  describe('updateMonitoringStatus', () => {
    it('should update monitoring status for existing configuration', async () => {
      const symbol = 'AAPL';
      const updatedMonitoring = { ...mockStockMonitoring, isActive: false };

      service.findOne = jest.fn().mockResolvedValue(mockStockMonitoring);
      service.save = jest.fn().mockResolvedValue(updatedMonitoring);

      const result = await service.updateMonitoringStatus(symbol, false);

      expect(service.findOne).toHaveBeenCalledWith({
        where: { symbol: 'AAPL' },
      });
      expect(service.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
        }),
      );
      expect(result).toEqual(updatedMonitoring);
    });

    it('should throw BadRequestException when monitoring configuration not found', async () => {
      const symbol = 'INVALID';

      service.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.updateMonitoringStatus(symbol, true)).rejects.toThrow(BadRequestException);
      await expect(service.updateMonitoringStatus(symbol, true)).rejects.toThrow(
        "No monitoring configuration found for symbol 'INVALID'",
      );
    });
  });

  describe('deactivateMonitoring', () => {
    it('should deactivate monitoring for a symbol', async () => {
      const symbol = 'AAPL';
      const deactivatedMonitoring = { ...mockStockMonitoring, isActive: false };

      service.findOne = jest.fn().mockResolvedValue(mockStockMonitoring);
      service.save = jest.fn().mockResolvedValue(deactivatedMonitoring);

      await service.deactivateMonitoring(symbol);

      expect(service.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
        }),
      );
    });
  });

  describe('getActiveMonitoringConfigs', () => {
    it('should return active monitoring configurations', async () => {
      const activeConfigs = [mockStockMonitoring];
      service.find = jest.fn().mockResolvedValue(activeConfigs);

      const result = await service.getActiveMonitoringConfigs();

      expect(service.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'ASC' },
      });
      expect(result).toEqual(activeConfigs);
    });
  });
});
