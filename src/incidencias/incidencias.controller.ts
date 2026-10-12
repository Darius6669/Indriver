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
import { IncidenciasService } from './incidencias.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Ajusta la ruta según tu estructura
import { RolesGuard } from '../Roles/roles.guard';
import { Roles } from '../Roles/roles.decorador';
import { CreateIncidenciasDto } from 'src/dtos/indenciasdto/Create_incidencias.dto';
import { UpdateIncidenciasDto } from 'src/dtos/indenciasdto/Update_incidencias.dto';

/**
 * Controlador HTTP del recurso "incidencias".
 * Expone el CRUD de incidencias ligadas a viajes.
 * Protegido por JWT y roles 'Admin', 'Superadmin' y 'Conductor'.
 */
@Controller('incidencias')
@UseGuards(JwtAuthGuard, RolesGuard) // Aplica autenticación y autorización a todas las rutas
@Roles(['Admin', 'Superadmin', 'Conductor'])
export class IncidenciasController {
  constructor(private readonly incidenciasService: IncidenciasService) {}

  /**
   * Crea una incidencia.
   * @param CreateIncidencias Datos de la incidencia.
   * @returns Mensaje y la incidencia creada.
   */
  @Post('/Crear-Incidencias')
  @HttpCode(HttpStatus.CREATED)
  async CrearIncidencias(@Body() CreateIncidencias: CreateIncidenciasDto) {
    const Incidencias =
      await this.incidenciasService.CrearIncidencia(CreateIncidencias);
    return {
      message: 'Se ha Creado Exitosamente la Incidencia*',
      control: Incidencias, // Clave "control" usada de forma uniforme por el cliente.
    };
  }

  /**
   * Lista todas las incidencias registradas.
   * @returns Mensaje y el arreglo de incidencias.
   */
  @Get('/Obtener-Incidencias')
  @HttpCode(HttpStatus.OK)
  async Obtener_Incidencias() {
    const Incidencias = await this.incidenciasService.ObtenerIncidencias();
    return {
      message: 'Estas son las Incidencias Registradas*',
      control: Incidencias,
    };
  }

  /**
   * Obtiene una incidencia por su id.
   * @param id Identificador de la incidencia.
   * @returns Mensaje y la incidencia encontrada.
   */
  @Get('/Obtener-Incidencias/:id')
  @HttpCode(HttpStatus.OK)
  async Obtener_IncidenciasId(@Param('id') id: number) {
    const Incidencias = await this.incidenciasService.ObtenerIncidenciasId(id);
    return {
      message: `Incidencia encontrada : ${id}`,
      control: Incidencias,
    };
  }

  /**
   * Elimina una incidencia por su id.
   * @param id Identificador de la incidencia a eliminar.
   * @returns Mensaje y la incidencia eliminada.
   */
  @Delete('/Eliminar-Incidencias/:id')
  @HttpCode(HttpStatus.OK)
  async Eliminar_Incidencia(@Param('id') id: number) {
    const Incidencias = await this.incidenciasService.EliminarIncidencia(id);
    return {
      message: `Incidencia Eliminada : ${id}`,
      control: Incidencias,
    };
  }

  /**
   * Actualiza una incidencia existente.
   * @param id Identificador de la incidencia a actualizar.
   * @param UpdateIncidencias DTO con los campos a modificar.
   * @returns Mensaje y la incidencia actualizada.
   */
  @Patch('/Actualizar-Incidencia/:id')
  @HttpCode(HttpStatus.OK)
  async Actualizar_Incidencia(
    @Param('id') id: number,
    @Body() UpdateIncidencias: UpdateIncidenciasDto,
  ) {
    const Incidencias = await this.incidenciasService.ActualizarIncidencias(
      id,
      UpdateIncidencias,
    );
    return {
      message: `Incidencia Actualizada : ${id}`,
      control: Incidencias,
    };
  }
}
