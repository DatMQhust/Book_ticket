import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorator';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const serverSecret = this.configService.get<string>('LOAD_TEST_SECRET');
    const requestSecret = request.headers['x-load-test-secret'];
    if (serverSecret && serverSecret === requestSecret) {
      const mockUserId = request.headers['x-mock-user-id'];
      request.user = {
        id: mockUserId || 'load-test-user',
        role: 'user',
      };
      return true;
    }
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(err, user) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      console.log('JWT Auth Guard Error:', err);
      throw err || new UnauthorizedException('Token expired or invalid');
    }
    return user;
  }
}
