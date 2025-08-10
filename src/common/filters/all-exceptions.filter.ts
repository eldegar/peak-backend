import { ErrorResponseDto } from '@app/common/dto/error-response.dto';
import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ExceptionResponse {
  message?: string | string[];
  errorCode?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let details: Record<string, any> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Set appropriate error codes based on exception type
      if (exception instanceof NotFoundException) {
        errorCode = 'NOT_FOUND';
      } else if (exception instanceof UnauthorizedException) {
        errorCode = 'UNAUTHORIZED';
      } else if (exception instanceof ForbiddenException) {
        errorCode = 'FORBIDDEN';
      } else if (exception instanceof ConflictException) {
        errorCode = 'CONFLICT';
      } else if (exception instanceof BadRequestException) {
        errorCode = 'BAD_REQUEST';
      }

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as ExceptionResponse;

        // Handle structured error responses (like validation errors)
        if (responseObj.message) {
          message = Array.isArray(responseObj.message) ? responseObj.message.join(', ') : responseObj.message;
        }

        // Allow custom error codes to override the default ones
        if (responseObj.errorCode) {
          errorCode = responseObj.errorCode;
        }

        // Extract additional details for validation errors
        if (exception instanceof BadRequestException && responseObj.message) {
          errorCode = 'VALIDATION_ERROR';
          details = {
            validationErrors: Array.isArray(responseObj.message) ? responseObj.message : [responseObj.message],
          };
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        if (exception instanceof BadRequestException) {
          errorCode = 'VALIDATION_ERROR';
          details = {
            validationErrors: [exceptionResponse],
          };
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorCode = 'UNEXPECTED_ERROR';
    }

    // Log the exception with appropriate severity
    const logContext = {
      statusCode: status,
      errorCode,
      path: request.url,
      method: request.method,
      userAgent: request.get('User-Agent'),
      timestamp: new Date().toISOString(),
      stack: exception instanceof Error && status >= HttpStatus.INTERNAL_SERVER_ERROR ? exception.stack : undefined,
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`HTTP Exception: ${message}`, logContext);
    } else if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(`HTTP Exception: ${message}`, logContext);
    } else {
      this.logger.log(`HTTP Exception: ${message}`, logContext);
    }

    const errorResponse = new ErrorResponseDto(errorCode, message, details);

    response.status(status).json(errorResponse);
  }
}
