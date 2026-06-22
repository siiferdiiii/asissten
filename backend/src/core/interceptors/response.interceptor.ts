import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  warnings?: unknown[];
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((value) => {
        // If handler already returns { data, meta, warnings }, pass through
        if (
          value !== null &&
          typeof value === 'object' &&
          'data' in (value as object)
        ) {
          return value as unknown as ApiResponse<T>;
        }
        return { data: value };
      }),
    );
  }
}
