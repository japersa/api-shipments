import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method, url, params, query, headers } = request;
    const userAgent = request.get('user-agent') || '';
    const { statusCode } = response;
    const contentLength = response.get('content-length');
    const requestBody = this.sanitizeRequestBody(request.body);

    request.on('close', () => {
      const logMessage = this.createLogMessage(
        method,
        url,
        statusCode,
        userAgent,
        ip,
        requestBody,
        params,
        query,
        headers,
        contentLength
      );
      this.logger.log(logMessage);
    });

    next();
  }

  private createLogMessage(
    method: string,
    url: string,
    statusCode: number,
    userAgent: string,
    ip: string,
    requestBody: any,
    params: any,
    query: any,
    headers: any,
    contentLength: string | number = '',
  ): string {
    const requestLog = `Request: ${method} ${url} ${userAgent} ${ip} - Request Body: ${JSON.stringify(
      requestBody,
    )} - Request Headers: ${JSON.stringify(headers)} - Params: ${JSON.stringify(params)} - Query: ${JSON.stringify(query)}`;
    const responseLog = `Response: ${method} ${url} ${statusCode} ${contentLength} ${userAgent} ${ip}`;
    return `${requestLog} | ${responseLog}`;
  }

  private sanitizeRequestBody(body: any): any {
    // Check if the body contains sensitive data (e.g., password field)
    if (body && body.password) {
      // Omit the password field
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...sanitizedBody } = body;
      return sanitizedBody;
    }
    return body;
  }
}