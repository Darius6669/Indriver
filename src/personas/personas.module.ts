import { Module } from '@nestjs/common';
import { PersonasService } from './personas.service';
import { PersonasController } from './personas.controller';
import {TypeOrmModule} from '@nestjs/typeorm';
import { PersonaEntity } from 'src/entidades/persona.entity';
@Module({
  imports: [TypeOrmModule.forFeature([PersonaEntity])],
  controllers: [PersonasController],
  providers: [PersonasService],
})
export class PersonasModule {}
