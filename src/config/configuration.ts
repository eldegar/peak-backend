import { CronExpression } from '@nestjs/schedule';

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'stock_price_checker',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  api: {
    prefix: 'v1',
    finnhubApiKey: process.env.FINNHUB_API_KEY || '',
    fetchInterval: process.env.STOCK_FETCH_INTERVAL || CronExpression.EVERY_MINUTE,
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5', 10),
    rateLimitDelay: parseInt(process.env.RATE_LIMIT_DELAY || '1000', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'log',
    format: process.env.LOG_FORMAT || 'json',
  },
});
