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
import { CreateViajesDto } from 'src/dtos/viajes/Create_Viajes.dto';
import { UpdateViajesDto } from 'src/dtos/viajes/UpdateViajes.dto';

/**
 * API REST de viajes y de su tracking.
 *
 * Capa HTTP que delega toda la logica en ViajesService. Cada endpoint responde
 * con la envoltura `{ message, control }` para darle al frontend un contrato
 * uniforme.
 *
 * Reglas de dominio que este controller respeta (las impone el service):
 * - La posicion en vivo se guarda SOLO en viaje_ubicacion (UPSERT por
 *   id_viaje); `viaje.lactitud/longitud` es el punto inicial y no se actualiza
 *   durante el recorrido.
 * - Solo puede existir 1 viaje abierto (fecha_final IS NULL) por placa.
 */
@Controller('viajes')
export class ViajesController {
  /** Inyeccion del servicio que concentra la logica de negocio de viajes. */
  constructor(private readonly viajesService: ViajesService) {}

  /** Crea un viaje con sus datos obligatorios (ruta, usuario, vehiculo). */
  @Post('/Crear-Viaje')
  @HttpCode(HttpStatus.CREATED)
  async CrearViaje(@Body() CreateViajes: CreateViajesDto) {
    const viaje = await this.viajesService.CreateViajes(CreateViajes);
    return {
      message: 'Se ha Creado Exitosamente el Viaje*',
      control: viaje,
    };
  }

  /** Lista el historial completo de viajes, sin ningún filtro. */
  @Get('/Obtener-Viaje')
  @HttpCode(HttpStatus.OK)
  async Obtener_Viajes() {
    const viaje = await this.viajesService.ObtenerViajes();
    return {
      message: 'Se han cargados Exitosamente el Viaje*',
      control: viaje,
    };
  }

  /** Devuelve un viaje puntual con sus relaciones (usuario/vehiculo/ruta). */
  @Get('/Obtener-viaje-Id/:id')
  @HttpCode(HttpStatus.OK)
  async Obtener_viajes_ID(@Param('id') id: number) {
    const viaje = await this.viajesService.ObtenerVijesId(id);
    return {
      message: `viaje encontrado : ${id}`,
      control: viaje,
    };
  }

  /** Elimina fisicamente un viaje por su id. */
  @Delete('/Elimnar-viaje/:id')
  @HttpCode(HttpStatus.OK)
  async Eliminar_viaje(@Param('id') id: number) {
    const viaje = await this.viajesService.EliminarViajeID(id);
    return {
      message: `viaje encontrado : ${id} ha sido elimado correctamente`,
      control: viaje,
    };
  }

  /** Actualiza parcialmente un viaje (Patch con el body opcional). */
  @Patch('/Actualizar-viaje/:id')
  @HttpCode(HttpStatus.OK)
  async Actualizar_Viaje(
    @Param('id') id: number,
    @Body() UpdateViaje: UpdateViajesDto,
  ) {
    const viaje = await this.viajesService.ActualizarViaje(id, UpdateViaje);
    return {
      message: `viaje encontrado identificador: ${id} ha sido actualizado correctamente`,
      control: viaje,
    };
  }

  // ==================================================================
  //  TRACKING
  // ==================================================================

  /** Viajes en curso (fecha_final NULL): la vista principal del mapa. */
  @Get('/Tracking/Viajes-activos')
  @HttpCode(HttpStatus.OK)
  async Obtener_Viajes_Activos() {
    const viajes = await this.viajesService.ObtenerViajesActivos();
    return {
      message: 'Viajes en curso cargados exitosamente',
      control: viajes,
    };
  }

  /**
   * Ultima posicion conocida del viaje. Sale de viaje_ubicacion con la fila
   * del viaje como respaldo si aun no hay punto.
   */
  @Get('/Tracking/Ultima-ubicacion/:id')
  @HttpCode(HttpStatus.OK)
  async Obtener_Ultima_Ubicacion(@Param('id', ParseIntPipe) id: number) {
    const ubicacion = await this.viajesService.ObtenerUltimaUbicacion(id);
    return {
      message: `Ultima posicion conocida del viaje ${id}`,
      control: ubicacion,
    };
  }

  /** Fila cruda de viaje_ubicacion con telemetria (velocidad, rumbo, GPS). */
  @Get('/Tracking/Ubicacion/:id')
  @HttpCode(HttpStatus.OK)
  async Obtener_Ubicacion(@Param('id', ParseIntPipe) id: number) {
    const ubicacion = await this.viajesService.ObtenerUbicacion(id);
    return {
      message: `Fila de viaje_ubicacion del viaje ${id}`,
      control: ubicacion,
    };
  }

  /** Traza del recorrido (polilinea para el mapa) en una ventana de horas. */
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

  /** Buses en curso dentro de un radio, ordenados de mas cerca a mas lejos. */
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

  /**
   * Registro manual de posicion por REST: fallback cuando el socket no pudo
   * enviar (movil sin datos, bateria plana). El socket sigue siendo la via
   * principal.
   */
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
