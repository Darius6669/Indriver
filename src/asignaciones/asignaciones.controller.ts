import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AsignacionesService } from './asignaciones.service';
import { RolesGuard } from 'src/Roles/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/Roles/roles.decorador';
import { CreateAsignacionDto } from 'src/dtos/Asignaciones/create-asignacion.dto';
import { UpdateAsignacionDto } from 'src/dtos/Asignaciones/update-asignacion.dto';

@Controller('asignaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AsignacionesController {
  constructor(private readonly asignacionesService: AsignacionesService) {}

  @Post('/Crear')
  @Roles(['Admin', 'Superadmin']) // Solo un admin puede asignar rutas y buses
  @HttpCode(HttpStatus.CREATED)
  async Crear(@Body() dto: CreateAsignacionDto) {
    const asignacion = await this.asignacionesService.CrearAsignacion(dto);
    return {
      message: 'Asignación creada exitosamente',
      control: asignacion, // Al crear, no importa que devuelva el objeto, porque el frontend lo necesita
    };
  }

  @Get('/Obtener-Todas')
   @Roles(['Admin', 'Superadmin'])
  @HttpCode(HttpStatus.OK)
  async ObtenerTodas() {
    const asignaciones = await this.asignacionesService.ObtenerAsignaciones();
    return {
      message: 'Asignaciones cargadas',
      control: asignaciones,
    };
  }

  @Get('/Obtener-Por-Usuario/:username')
   @Roles(['Admin', 'Superadmin', 'Conductor'])
  @HttpCode(HttpStatus.OK)
  async ObtenerPorUsuario(@Param('username') username: string) {
    const asignaciones = await this.asignacionesService.ObtenerAsignacionesPorUsuario(username);
    return {
      message: `Asignaciones activas del conductor ${username}`,
      control: asignaciones,
    };
  }

  @Patch('/Actualizar/:id')
   @Roles(['Admin', 'Superadmin'])
  @HttpCode(HttpStatus.OK)
  async Actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAsignacionDto,
  ) {
    const asignacion = await this.asignacionesService.ActualizarAsignacion(id, dto);
    return {
      message: `Asignación ${id} actualizada`,
      control: asignacion,
    };
  }
}