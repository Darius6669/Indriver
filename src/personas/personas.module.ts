import { Module } from '@nestjs/common';
import { PersonasService } from './personas.service';
import { PersonasController } from './personas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonaEntity } from 'src/entidades/persona.entity';
/**
 * Módulo de personas. Registra el repositorio de PersonaEntity para que el
 * servicio pueda inyectarlo y declara su controlador y proveedor.
 */
@Module({
  imports: [TypeOrmModule.forFeature([PersonaEntity])],
  controllers: [PersonasController],
  providers: [PersonasService],
})
export class PersonasModule {}
