import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenciasService } from './licencias.service';
import { LicenciasController } from './licencias.controller';
import { LicenciaEntity } from 'src/entidades/Licencia.entity'; // Ajusta ruta
import { UsuariosEntity } from 'src/entidades/Usuarios.entity'; // Ajusta ruta

@Module({
  imports: [
    // Registramos las entidades que usará el servicio
    TypeOrmModule.forFeature([LicenciaEntity, UsuariosEntity]),
  ],
  controllers: [LicenciasController],
  providers: [LicenciasService],
})
export class LicenciasModule {}