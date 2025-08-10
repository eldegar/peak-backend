import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USERNAME: Joi.string().default('postgres'),
  DATABASE_PASSWORD: Joi.string().default('password'),
  DATABASE_NAME: Joi.string().default('stock_price_checker'),
  FINNHUB_API_KEY: Joi.string().required(),
  STOCK_FETCH_INTERVAL: Joi.string().optional(),
  MAX_CONCURRENT_REQUESTS: Joi.number().min(1).max(50).optional(),
  RATE_LIMIT_DELAY: Joi.number().min(0).optional(),
});
