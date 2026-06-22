import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

interface ValidationErrorDetail {
  field: string;
  message: string;
}

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
  details?: ValidationErrorDetail[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: ValidationErrorDetail[] | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.message;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>;
        message = (body['message'] as string) ?? exception.message;
        error = (body['error'] as string) ?? exception.name;

        // class-validator sends message as string[]
        if (Array.isArray(body['message'])) {
          details = (body['message'] as string[]).map((msg) => ({
            field: '',
            message: msg,
          }));
          message = 'Validation failed';
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    } else {
      this.logger.error('Unknown exception', JSON.stringify(exception));
    }

    const body: ErrorResponseBody = { statusCode, error, message };
    if (details) {
      body.details = details;
    }

    response.status(statusCode).json(body);
  }
}
