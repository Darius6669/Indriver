import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ViajesService } from './viajes.service';
import { RegistrarUbicacionDto } from 'src/dtos/viajes/RegistrarUbicacion.dto';
import { BuscarCercanosDto } from 'src/dtos/viajes/BuscarCercanos.dto';

@Controller('viajes')
export class ViajesController {
  constructor(private readonly viajesService: ViajesService) {}

  @Post('/Crear-Viaje')
  @HttpCode(HttpStatus.CREATED)
  async CrearViaje(@Body() CreateViajes) {
    const viaje = await this.viajesService.CreateViajes(CreateViajes);
    return {
      message: 'Se ha Creado Exitosamente el Viaje*',
      control: viaje,
    };
  }

  @Get('/Obtener-Viaje')
  @HttpCode(HttpStatus.OK)
  async Obtener_Viajes() {
    const viaje = await this.viajesService.ObtenerViajes();
    return {
      message: 'Se han cargados Exitosamente el Viaje*',
      control: viaje,
    };
  }

  @Get('/Obtener-viaje-Id/:id')
  @HttpCode(HttpStatus.OK)
  async Obtener_viajes_ID(@Param('id') id: number) {
    const viaje = await this.viajesService.ObtenerVijesId(id);
    return {
      message: `viaje encontrado : ${id}`,
      control: viaje,
    };
  }

  @Delete('/Elimnar-viaje/:id')
  @HttpCode(HttpStatus.OK)
  async Eliminar_viaje(@Param('id') id: number) {
    const viaje = await this.viajesService.EliminarViajeID(id);
    return {
      message: `viaje encontrado : ${id} ha sido elimado correctamente`,
      control: viaje,
    };
  }

  @Patch('/Actualizar-viaje/:id')
  @HttpCode(HttpStatus.OK)
  async Actualizar_Viaje(@Param('id') id: number, @Body() UpdateViaje) {
    const viaje = await this.viajesService.ActualizarViaje(id, UpdateViaje);
    return {
      message: `viaje encontrado identificador: ${id} ha sido actualizado correctamente`,
      control: viaje,
    };
  }

  // ==================================================================
  //  TRACKING
  // ==================================================================

  @Get('/Tracking/Viajes-activos')
  @HttpCode(HttpStatus.OK)
  async Obtener_Viajes_Activos() {
    const viajes = await this.viajesService.ObtenerViajesActivos();
    return {
      message: 'Viajes en curso cargados exitosamente',
      control: viajes,
    };
  }

  @Get('/Tracking/Ultima-ubicacion/:id')
  @HttpCode(HttpStatus.OK)
  async Obtener_Ultima_Ubicacion(@Param('id', ParseIntPipe) id: number) {
    const ubicacion = await this.viajesService.ObtenerUltimaUbicacion(id);
    return {
      message: `Ultima posicion conocida del viaje ${id}`,
      control: ubicacion,
    };
  }

  @Get('/Tracking/Recorrido/:id')
  @HttpCode(HttpStatus.OK)
  async Obtener_Recorrido(
    @Param('id', ParseIntPipe) id: number,
    @Query('horas') horas?: string,
  ) {
    // Acotado a 24h para que nadie pida un rango que reviente la memoria.
    const ventana = horas ? Math.min(24, Math.max(1, parseInt(horas))) : 6;
    const recorrido = await this.viajesService.ObtenerRecorrido(id, ventana);
    return {
      message: `Recorrido del viaje ${id}`,
      control: recorrido,
    };
  }

  @Get('/Tracking/Cercanos')
  @HttpCode(HttpStatus.OK)
  async Obtener_Viajes_Cercanos(@Query() query: BuscarCercanosDto) {
    const cerca = await this.viajesService.ObtenerViajesCercanos(
      query.lactitud,
      query.longitud,
      query.radio,
      query.limite,
      query.soloOnline,
    );
    return {
      message:
        cerca.length === 0
          ? `No hay buses en un radio de ${query.radio ?? 1000} m`
          : `${cerca.length} bus(es) en un radio de ${query.radio ?? 1000} m`,
      control: {
        origen: {
          lactitud: query.lactitud,
          longitud: query.longitud,
          radio_m: query.radio ?? 1000,
        },
        total: cerca.length,
        // El primero es el mas proximo: el frontend casi siempre solo quiere este.
        mas_cercano: cerca[0] ?? null,
        buses: cerca,
      },
    };
  }

  @Post('/Tracking/Registrar-ubicacion/:id')
  @HttpCode(HttpStatus.OK)
  async Registrar_Ubicacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RegistrarUbicacionDto,
  ) {
    const ubicacion = await this.viajesService.RegistrarUbicacionManual(
      id,
      body.lactitud,
      body.longitud,
    );
    return {
      message: `Ubicacion registrada para el viaje ${id}`,
      control: ubicacion,
    };
  }
}
