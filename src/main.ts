import { AppModule } from '@app/app.module';
import { AllExceptionsFilter } from '@app/common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from '@app/common/filters/http-exception.filter';
import { LoggingInterceptor } from '@app/common/interceptors/logging.interceptor';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter(), new AllExceptionsFilter());

  app.useGlobalInterceptors(new LoggingInterceptor());

  const apiPrefix = configService.get<string>('api.prefix') || 'v1';
  app.setGlobalPrefix(apiPrefix);

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Stock Price Checker API')
    .setDescription(
      `Advanced Stock Price Checker API with real-time stock monitoring, comprehensive metrics, and Finnhub integration`,
    )
    .setVersion('1.0')
    .addTag('Health', 'Application health monitoring endpoints')
    .addTag('Stock', 'Stock price data and monitoring operations')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Stock Price Checker API Documentation',

    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
    },
  });

  const port = configService.get<number>('port') || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
}
void bootstrap();
