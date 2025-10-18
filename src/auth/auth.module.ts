import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './passport/local-strategy';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import * as ms from 'ms';
@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: ms(configService.get('JWT_EXPIRATION_TIME')),
        },
      }),
    }),
  ],
  providers: [AuthService, LocalStrategy],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
