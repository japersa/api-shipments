import { Injectable, Logger as NestLogger } from '@nestjs/common';

@Injectable()
export class LoggerService {
  private readonly logger = new NestLogger();
  private readonly is_enabled = process.env.LOG_ENABLED??true;

  log(message: string) {
    if(this.is_enabled)
      this.logger.log(message);
  }

  error(message: string, trace: string) {
    if(this.is_enabled)
      this.logger.error(message, trace);
  }

  warn(message: string) {
    if(this.is_enabled)
      this.logger.warn(message);
  }

  debug(message: string) {
    if(this.is_enabled)
      this.logger.debug(message);
  }

  verbose(message: string) {
    if(this.is_enabled)
      this.logger.verbose(message);
  }
}