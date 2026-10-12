import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RutasService } from './rutas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Ajusta la ruta según tu estructura
import { RolesGuard } from '../Roles/roles.guard';
import { Roles } from '../Roles/roles.decorador';
import { CreateRutasDto } from 'src/dtos/rutasdto/Create_Rutas.dto';
import { UpdateRutaDto } from 'src/dtos/rutasdto/Updatedto.dto';

/**
 * Controlador HTTP del recurso "rutas".
 * Expone los endpoints para crear, listar, filtrar, eliminar y actualizar rutas.
 * Toda la clase está protegida: exige JWT válido y rol 'Admin' o 'Superadmin'.
 */
@Controller('rutas')
@UseGuards(JwtAuthGuard, RolesGuard) // Aplica autenticación y autorización a todas las rutas
@Roles(['Admin', 'Superadmin'])
export class RutasController {
  constructor(private readonly rutasService: RutasService) {}

  /**
   * Crea una nueva ruta.
   * @param createRutadto Datos de entrada de la ruta (cooperativa, origen, tarifa, etc.).
   * @returns La ruta persistida.
   */
  @Post('destino/crear')
  @HttpCode(HttpStatus.CREATED)
  async crearRuta(@Body() createRutadto: CreateRutasDto) {
    return this.rutasService.crearRuta(createRutadto);
  }

  /**
   * Obtiene el listado completo de rutas.
   * @returns Arreglo de rutas con su cooperativa asociada.
   */
  @Get('destino/obtener')
  @HttpCode(HttpStatus.OK)
  async obtenerRutas() {
    return this.rutasService.obtenerrutas();
  }

  /**
   * Busca una ruta por su número (clave primaria).
   * Se usa POST con filtro en el body para aceptar la PK como parámetro.
   * @param numero_ruta Número identificador de la ruta.
   * @returns La ruta encontrada.
   */
  @Post('destino/filter')
  @HttpCode(HttpStatus.OK)
  async obtenerRutaPorId(@Body('numero_ruta') numero_ruta: string) {
    return this.rutasService.obtenerRutaPorId(numero_ruta);
  }

  /**
   * Elimina una ruta por su número.
   * @param numero_ruta Número identificador de la ruta a eliminar.
   * @returns La ruta eliminada.
   */
  @Post('destino/eliminar')
  @HttpCode(HttpStatus.OK)
  async eliminarRuta(@Body('numero_ruta') numero_ruta: string) {
    return this.rutasService.eliminarRuta(numero_ruta);
  }

  /**
   * Actualiza parcialmente una ruta.
   * La PK se recibe aparte del DTO porque no debería modificarse.
   * @param numero_ruta Número identificador de la ruta a actualizar.
   * @param updateRutaDto Campos a modificar.
   * @returns La ruta actualizada.
   */
  @Patch('destino/actualizar')
  @HttpCode(HttpStatus.OK)
  async actualizarRuta(
    @Body('numero_ruta') numero_ruta: string,
    @Body() updateRutaDto: UpdateRutaDto,
  ) {
    return this.rutasService.actualizarRuta(numero_ruta, updateRutaDto);
  }
}
