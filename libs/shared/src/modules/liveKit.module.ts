import { Module } from '@nestjs/common';
import { LivekitService } from '../services/liveKit.service';

@Module({
  providers: [LivekitService],
  exports: [LivekitService],
})
export class LivekitModule {}
