import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TurnstileService } from './services/turnstile.service';

@Module({
  imports: [HttpModule],
  providers: [TurnstileService],
  exports: [TurnstileService],
})
export class CommonModule {}
