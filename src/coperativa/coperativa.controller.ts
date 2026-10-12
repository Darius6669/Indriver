import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CooperativaService } from './coperativa.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Ajusta la ruta según tu estructura
import { RolesGuard } from '../Roles/roles.guard';
import { Roles } from '../Roles/roles.decorador';
import { CreateCooperativaDto } from 'src/dtos/cooperativadto/Create_cooperativa.dto';
import { UpdateCooperativaDto } from 'src/dtos/cooperativadto/Updatecooperativa.dto';

/**
 * Controlador HTTP del recurso "cooperativa". Protegido con JWT y restringido a
 * los roles Admin y Superadmin. Las rutas utilizan prefijos anidados bajo /cooperativa.
 */
@Controller('cooperativa')
@UseGuards(JwtAuthGuard, RolesGuard) // Aplica autenticación y autorización a todas las rutas
@Roles(['Admin', 'Superadmin'])
export class CoperativaController {
  // Inyección del servicio de cooperativas.
  constructor(private readonly cooperativaService: CooperativaService) {}

  /** Crea una cooperativa nueva (201 Created). */
  @Post('cooperativas/crear')
  @HttpCode(HttpStatus.CREATED)
  async crearCooperativa(@Body() createcooperativadto: CreateCooperativaDto) {
    return this.cooperativaService.CrearCooperativa(createcooperativadto);
  }

  /** Devuelve todas las cooperativas registradas (200 OK). */
  @Get('cooperativas/todas')
  @HttpCode(HttpStatus.OK)
  async obtenerCooperativas() {
    return this.cooperativaService.ObtenerCooperativas();
  }

  /** Busca una cooperativa por su RIF enviado en el cuerpo (200 OK). */
  @Post('cooperativas/filter')
  @HttpCode(HttpStatus.OK)
  async obtenerCooperativaPorRif(
    @Body('rif_cooperativa') rif_cooperativa: string,
  ) {
    return this.cooperativaService.ObtenercooperativaPorRif(rif_cooperativa);
  }

  /** Elimina una cooperativa por su RIF enviado en el cuerpo (200 OK). */
  @Delete('cooperativas/eliminar')
  @HttpCode(HttpStatus.OK)
  async EliminarCooperativa(@Body('rif_cooperativa') rif_cooperativa: string) {
    return this.cooperativaService.EliminarCooperativa(rif_cooperativa);
  }

  /** Actualiza parcialmente una cooperativa usando el RIF del cuerpo (200 OK). */
  @Patch('cooperativas/actualizar')
  @HttpCode(HttpStatus.OK)
  async ActualizarCooperativa(
    @Body('rif_cooperativa') rif_cooperativa: string,
    @Body() updateCooperativadto: UpdateCooperativaDto,
  ) {
    return this.cooperativaService.ActualizarCooperativa(
      rif_cooperativa,
      updateCooperativadto,
    );
  }
}
