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

@Controller('rutas')
@UseGuards(JwtAuthGuard, RolesGuard) // Aplica autenticación y autorización a todas las rutas
@Roles(['Admin', 'Superadmin']) 
export class RutasController {
  constructor(private readonly rutasService: RutasService) {}

  @Post('destino/crear')
  @HttpCode(HttpStatus.CREATED)
  async crearRuta(@Body() createRutadto) {
    return this.rutasService.crearRuta(createRutadto);
  }

  @Get('destino/obtener')
  @HttpCode(HttpStatus.OK)
  async obtenerRutas() {
    return this.rutasService.obtenerrutas();
  }

  @Post('destino/filter')
  @HttpCode(HttpStatus.OK)
  async obtenerRutaPorId(@Body('numero_ruta') numero_ruta: string) {
    return this.rutasService.obtenerRutaPorId(numero_ruta);
  }

  @Post('destino/eliminar')
  @HttpCode(HttpStatus.OK)
  async eliminarRuta(@Body('numero_ruta') numero_ruta: string) {
    return this.rutasService.eliminarRuta(numero_ruta);
  }

  @Patch('destino/actualizar')
  @HttpCode(HttpStatus.OK)
  async actualizarRuta(
    @Body('numero_ruta') numero_ruta: string,
    @Body() UpdateRutaDto: any,
  ) {
    return this.rutasService.actualizarRuta(numero_ruta, UpdateRutaDto);
  }
}
