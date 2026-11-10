import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RutasService } from './rutas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../Roles/roles.guard';
import { Roles } from '../Roles/roles.decorador';
import { CreateRutasDto } from 'src/dtos/rutasdto/Create_Rutas.dto';
import { UpdateRutaDto } from 'src/dtos/rutasdto/Updatedto.dto';

@Controller('rutas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(['Admin', 'Superadmin'])
export class RutasController {
  constructor(private readonly rutasService: RutasService) {}

  @Post('destino/crear')
  @HttpCode(HttpStatus.CREATED)
  async crearRuta(@Body() createRutadto: CreateRutasDto) {
    return this.rutasService.crearRuta(createRutadto);
  }

  @Get('destino/obtener')
  @HttpCode(HttpStatus.OK)
  async obtenerRutas() {
    return this.rutasService.obtenerrutas();
  }

  @Get('destino/filter/:numero_ruta')
  @HttpCode(HttpStatus.OK)
  async obtenerRutaPorId(@Param('numero_ruta') numero_ruta: string) {
    return this.rutasService.obtenerRutaPorId(numero_ruta);
  }

  // NUEVO ENDPOINT: Buscar ruta con sus paradas
  @Get('destino/paradas/:numero_ruta')
  @HttpCode(HttpStatus.OK)
  async obtenerRutaConParadas(@Param('numero_ruta') numero_ruta: string) {
    return this.rutasService.obtenerRutaConParadas(numero_ruta);
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
    @Body() updateRutaDto: UpdateRutaDto,
  ) {
    return this.rutasService.actualizarRuta(numero_ruta, updateRutaDto);
  }
}