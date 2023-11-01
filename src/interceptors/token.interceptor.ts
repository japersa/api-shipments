import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs/internal/Observable';
import { TokenService } from '../services/token.service';

@Injectable()
export class TokenInterceptor implements NestInterceptor {
  private logger = new Logger('TokenInterceptor');

  constructor(private readonly tokenService: TokenService) { }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const headers = request.headers;

    try {
      const token = headers['token-api'].toString();
      const client: any = await this.tokenService.getClient(token);
      if (client.Items.length === 0) {
        throw new UnauthorizedException(
          'Token inválido, contacte con el equipo de soporte de Domina para generación del nuevo token.',
        );
      } else {
        request.client = client.Items[0];
      }
      return next.handle();
    } catch (error) {
      this.logger.error(error);
      throw new UnauthorizedException(
        'Token inválido, contacte con el equipo de soporte de Domina para generación del nuevo token.',
      );
    }
  }
}
