import { Test, TestingModule } from '@nestjs/testing';
import { STOCK_DATA_PROVIDER_TOKEN } from '../constants/stock-provider.constants';
import { StockSymbolDto } from '../dtos/stock-symbol.dto';
import { UpdateMonitoringDto } from '../dtos/update-monitoring.dto';
import { IStockDataProvider } from '../interfaces/stock-data-provider.interface';
import { MonitoringService } from '../monitoring.service';
import { StockController } from '../stock.controller';
import { StockService } from '../stock.service';

describe('StockController', () => {
  let controller: StockController;
  let stockService: jest.Mocked<StockService>;
  let monitoringService: jest.Mocked<MonitoringService>;
  let stockDataProvider: jest.Mocked<IStockDataProvider>;

  const mockStockData = {
    symbol: 'AAPL',
    currentPrice: '150.00',
    lastUpdated: '2023-01-01T10:00:00Z',
    movingAverage: '148.50',
    monitoringStatus: true,
    lastFetch: '2023-01-01T10:00:00Z',
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

  const mockMonitoringConfig = {
    id: 'mock-uuid',
    symbol: 'AAPL',
    isActive: true,
    lastFetch: new Date('2023-01-01T10:00:00Z'),
    createdAt: new Date('2023-01-01T09:00:00Z'),
    updatedAt: new Date('2023-01-01T10:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockController],
      providers: [
        {
          provide: StockService,
          useValue: {
            getStockData: jest.fn(),
            saveStockPrice: jest.fn(),
          },
        },
        {
          provide: MonitoringService,
          useValue: {
            enableMonitoring: jest.fn(),
            deactivateMonitoring: jest.fn(),
            getMonitoringConfiguration: jest.fn(),
          },
        },
        {
          provide: STOCK_DATA_PROVIDER_TOKEN,
          useValue: {
            getQuote: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StockController>(StockController);
    stockService = module.get(StockService);
    monitoringService = module.get(MonitoringService);
    stockDataProvider = module.get(STOCK_DATA_PROVIDER_TOKEN);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStockData', () => {
    it('should return stock data for valid symbol', async () => {
      const symbolDto: StockSymbolDto = { symbol: 'AAPL' };
      stockService.getStockData.mockResolvedValue(mockStockData);

      const result = await controller.getStockData(symbolDto);

      expect(stockService.getStockData).toHaveBeenCalledWith('AAPL');
      expect(result).toEqual(mockStockData);
    });

    it('should throw error when stock data not found', async () => {
      const symbolDto: StockSymbolDto = { symbol: 'INVALID' };
      const error = new Error('Stock not found');
      stockService.getStockData.mockRejectedValue(error);

      await expect(controller.getStockData(symbolDto)).rejects.toThrow('Stock not found');
      expect(stockService.getStockData).toHaveBeenCalledWith('INVALID');
    });

    it('should handle service errors gracefully', async () => {
      const symbolDto: StockSymbolDto = { symbol: 'AAPL' };
      const error = new Error('Service unavailable');
      stockService.getStockData.mockRejectedValue(error);

      await expect(controller.getStockData(symbolDto)).rejects.toThrow('Service unavailable');
    });
  });

  describe('fetchStockPrice', () => {
    it('should fetch and save stock price successfully', async () => {
      const symbolDto: StockSymbolDto = { symbol: 'AAPL' };
      const savedPrice = {
        symbol: 'AAPL',
        price: '150.00',
        timestamp: new Date('2023-01-01T10:00:00Z'),
        createdAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-01T10:00:00Z'),
      };

      stockDataProvider.getQuote.mockResolvedValue(mockQuoteData);
      stockService.saveStockPrice.mockResolvedValue(savedPrice);

      const result = await controller.fetchStockPrice(symbolDto);

      expect(stockDataProvider.getQuote).toHaveBeenCalledWith('AAPL');
      expect(stockService.saveStockPrice).toHaveBeenCalledWith({
        symbol: 'AAPL',
        price: '150',
        timestamp: expect.any(Date),
      });
      expect(result).toEqual({
        symbol: savedPrice.symbol,
        price: savedPrice.price,
        timestamp: savedPrice.timestamp,
      });
    });

    it('should handle invalid symbol error', async () => {
      const symbolDto: StockSymbolDto = { symbol: 'INVALID' };
      const error = new Error('Invalid symbol');
      stockDataProvider.getQuote.mockRejectedValue(error);

      await expect(controller.fetchStockPrice(symbolDto)).rejects.toThrow('Invalid symbol');
      expect(stockDataProvider.getQuote).toHaveBeenCalledWith('INVALID');
    });

    it('should handle upstream API errors', async () => {
      const symbolDto: StockSymbolDto = { symbol: 'AAPL' };
      const error = new Error('API error');
      stockDataProvider.getQuote.mockRejectedValue(error);

      await expect(controller.fetchStockPrice(symbolDto)).rejects.toThrow('API error');
    });

    it('should convert symbol to uppercase', async () => {
      const symbolDto: StockSymbolDto = { symbol: 'aapl' };
      const savedPrice = {
        symbol: 'AAPL',
        price: '150.00',
        timestamp: new Date('2023-01-01T10:00:00Z'),
        createdAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-01T10:00:00Z'),
      };

      stockDataProvider.getQuote.mockResolvedValue(mockQuoteData);
      stockService.saveStockPrice.mockResolvedValue(savedPrice);

      await controller.fetchStockPrice(symbolDto);

      expect(stockService.saveStockPrice).toHaveBeenCalledWith({
        symbol: 'AAPL',
        price: '150',
        timestamp: expect.any(Date),
      });
    });
  });

  describe('updateMonitoring', () => {
    it('should enable monitoring for a symbol', async () => {
      const symbolDto: StockSymbolDto = { symbol: 'AAPL' };
      const updateDto: UpdateMonitoringDto = { isActive: true };

      monitoringService.enableMonitoring.mockResolvedValue(mockMonitoringConfig);

      const result = await controller.updateMonitoring(symbolDto, updateDto);

      expect(monitoringService.enableMonitoring).toHaveBeenCalledWith('AAPL');
      expect(result).toEqual(mockMonitoringConfig);
    });

    it('should disable monitoring for a symbol', async () => {
      const symbolDto: StockSymbolDto = { symbol: 'AAPL' };
      const updateDto: UpdateMonitoringDto = { isActive: false };
      const deactivatedConfig = { ...mockMonitoringConfig, isActive: false };

      monitoringService.deactivateMonitoring.mockResolvedValue(undefined);
      monitoringService.getMonitoringConfiguration.mockResolvedValue(deactivatedConfig);

      const result = await controller.updateMonitoring(symbolDto, updateDto);

      expect(monitoringService.deactivateMonitoring).toHaveBeenCalledWith('AAPL');
      expect(monitoringService.getMonitoringConfiguration).toHaveBeenCalledWith('AAPL');
      expect(result).toEqual({
        symbol: 'AAPL',
        isActive: false,
        lastFetch: mockMonitoringConfig.lastFetch,
      });
    });

    it('should handle monitoring service errors', async () => {
      const symbolDto: StockSymbolDto = { symbol: 'AAPL' };
      const updateDto: UpdateMonitoringDto = { isActive: true };
      const error = new Error('Monitoring service error');

      monitoringService.enableMonitoring.mockRejectedValue(error);

      await expect(controller.updateMonitoring(symbolDto, updateDto)).rejects.toThrow('Monitoring service error');
    });

    it('should handle case where monitoring config is not found after deactivation', async () => {
      const symbolDto: StockSymbolDto = { symbol: 'AAPL' };
      const updateDto: UpdateMonitoringDto = { isActive: false };

      monitoringService.deactivateMonitoring.mockResolvedValue(undefined);
      monitoringService.getMonitoringConfiguration.mockResolvedValue(null);

      await expect(controller.updateMonitoring(symbolDto, updateDto)).rejects.toThrow(
        'Failed to retrieve monitoring configuration after deactivation',
      );
    });
  });
});
