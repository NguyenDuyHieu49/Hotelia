import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || exception.message;
      code = this.getCode(status);
    } else if ((exception as { name?: string })?.name === 'CastError') {
      // A malformed id in the URL (e.g. /hotels/abc) is the caller's mistake, not a server fault.
      status = HttpStatus.BAD_REQUEST;
      message = 'Mã định danh không hợp lệ';
      code = this.getCode(status);
    } else {
      // Keep details in the server log only; the client gets the generic message above.
      this.logger.error(exception instanceof Error ? exception.stack ?? exception.message : String(exception));
    }

    response.status(status).json({
      success: false,
      error: { code, message, statusCode: status, path: request.url, timestamp: new Date().toISOString() },
    });
  }

  private getCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN',
      404: 'NOT_FOUND', 409: 'CONFLICT', 422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS', 500: 'INTERNAL_ERROR', 502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return map[status] || 'UNKNOWN_ERROR';
  }
}
