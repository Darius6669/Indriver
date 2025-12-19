import { Module } from '@nestjs/common';
import { ViajesService } from './viajes.service';
import { ViajesController } from './viajes.controller';

@Module({
  controllers: [ViajesController],
  providers: [ViajesService],
})
export class ViajesModule {}
