import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LicenciasService } from './licencias.service';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/Roles/roles.guard';
import { Roles } from 'src/Roles/roles.decorador';
import { CreateLicenciaDto } from 'src/dtos/licencias/Create_Licencia.dto';
import { UpdateLicenciaDto } from 'src/dtos/licencias/Update_Licencia.dto';

// Ajusta estos imports a como los tengas en tu proyecto


@Controller('licencias')
@UseGuards(JwtAuthGuard, RolesGuard) // Protegemos todo el controlador con JWT y Roles
export class LicenciasController {
  constructor(private readonly licenciasService: LicenciasService) {}

  /**
   * Crear licencia: Solo un Admin puede registrar licencias a nombre de alguien.
   */
  @Post('/Crear-Licencia')
  @Roles(['Admin']) // Solo Admin
  @HttpCode(HttpStatus.CREATED)
  async Crear(@Body() dto: CreateLicenciaDto) {
    const licencia = await this.licenciasService.CreateLicencia(dto);
    return {
      message: 'Licencia creada exitosamente',
      control: licencia,
    };
  }

  /**
   * Listar licencias: Admin y Conductores (quizás un conductor solo debería ver la suya, 
   * pero si lo dejas así, ambos roles pueden listar).
   */
  @Get('/Obtener-Licencias')
  @Roles(['Admin', 'Conductor']) 
  async ObtenerTodas() {
    const licencias = await this.licenciasService.ObtenerLicencias();
    return {
      message: 'Licencias cargadas exitosamente',
      control: licencias,
    };
  }

  /**
   * Obtener licencia por ID.
   */
  @Get('/Obtener-Licencia/:id')
  @Roles(['Admin', 'Conductor'])
  async ObtenerPorId(@Param('id') id: string) {
    const licencia = await this.licenciasService.ObtenerLicenciaId(id);
    return {
      message: `Licencia ${id} encontrada`,
      control: licencia,
    };
  }

  /**
   * Actualizar licencia: Solo Admin.
   */
  @Patch('/Actualizar-Licencia/:id')
  @Roles(['Admin'])
  async Actualizar(@Param('id') id: string, @Body() dto: UpdateLicenciaDto) {
    const licencia = await this.licenciasService.ActualizarLicencia(id, dto);
    return {
      message: `Licencia ${id} actualizada correctamente`,
      control: licencia,
    };
  }

  /**
   * Eliminar licencia: Solo Admin.
   */
  @Delete('/Eliminar-Licencia/:id')
  @Roles(['Admin'])
  async Eliminar(@Param('id') id: string) {
    const licencia = await this.licenciasService.EliminarLicencia(id);
    return {
      message: `Licencia ${id} eliminada correctamente`,
      control: licencia,
    };
  }
}