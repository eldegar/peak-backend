import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

interface ExceptionResponse {
  message?: string | string[];
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    let message: string;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as ExceptionResponse;
      if (responseObj.message) {
        message = Array.isArray(responseObj.message) ? responseObj.message.join(', ') : responseObj.message;
      } else {
        message = exception.message;
      }
    } else {
      message = exception.message;
    }

    // Log the exception with context
    this.logger.error(`HTTP Exception: ${message}`, {
      statusCode: status,
      path: request.url,
      method: request.method,
      userAgent: request.get('User-Agent'),
      timestamp: new Date().toISOString(),
    });

    response.status(status).json(message);
  }
}
