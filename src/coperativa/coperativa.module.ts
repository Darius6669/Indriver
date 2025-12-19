import { Module } from '@nestjs/common';
import { CooperativaService } from './coperativa.service';
import { CoperativaController } from './coperativa.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CooperativaEntity } from 'src/entidades/cooperativa.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CooperativaEntity])],
  controllers: [CoperativaController],
  providers: [CooperativaService],
})
export class CoperativaModule {}
