import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncidenciasEntity } from 'src/entidades/Incidencias.entity';
import { ViajesEntity } from 'src/entidades/Viajes.entity';
import { RutaEntity } from 'src/entidades/ruta.entity';
import { UsuariosEntity } from 'src/entidades/Usuarios.entity';
import { VehiculosEntity } from 'src/entidades/vehiculos.entity';
import { CreateViajesDto } from 'src/dtos/viajes/Create_Viajes.dto';
import { UpdateViajesDto } from 'src/dtos/viajes/UpdateViajes.dto';
import { ViajeUbicacionEntity } from 'src/entidades/ViajeUbicacion.entity';
import { WebsocketService } from 'src/websocket/websocket.service';

/** Vista plana de un viaje en curso: lo minimo que necesita el mapa. */
export interface ViajeActivoDTO {
  id_viaje: number;
  fecha_inicio: Date;
  lactitud: number;
  longitud: number;
  usuario: { user_id: number; username: string } | null;
  vehiculo: { placa: string } | null;
  ruta: { numero_ruta: string; nombre: string } | null;
}

/** Un bus que cae dentro del radio pedido, ya ordenado por cercanía. */
export interface BusCercanoDTO {
  id_viaje: number;
  lat: number;
  lng: number;
  distancia_m: number;
  /** true = hay socket conectado y la posicion viene del GPS al instante. */
  online: boolean;
  /** true = las coordenadas vienen de memoria, no de la fila del viaje. */
  posicion_en_vivo: boolean;
  velocidad: number | null;
  rumbo: number | null;
  /** Cuando se recibio ese punto por ultima vez. */
  ts_actualizacion: number;
  placa: string | null;
  numero_ruta: string | null;
  nombre_ruta: string | null;
  username: string | null;
}

/** Radio medio terrestre en metros. */
const R_TIERRA_M = 6_371_000;

@Injectable()
export class ViajesService {
  constructor(
    @InjectRepository(ViajesEntity)
    private viajesRepository: Repository<ViajesEntity>,
    @InjectRepository(RutaEntity)
    private rutaRepository: Repository<RutaEntity>,
    @InjectRepository(UsuariosEntity)
    private usuariosRepository: Repository<UsuariosEntity>,
    @InjectRepository(VehiculosEntity)
    private vehiculosRepository: Repository<VehiculosEntity>,
    @InjectRepository(IncidenciasEntity)
    private IncidenciasRepository: Repository<IncidenciasEntity>,
    @InjectRepository(ViajeUbicacionEntity)
    private ubicacionesRepository: Repository<ViajeUbicacionEntity>,
    // Solo para enriquecer con la posicion al instante y el flag `online`.
    // Vive en memoria; la BD se refresca cada 30s.
    private readonly trackingService: WebsocketService,
  ) {}

  async ValidarRuta(numero_ruta: string): Promise<boolean> {
    const ruta = await this.rutaRepository.findOne({
      where: { numero_ruta: numero_ruta },
    });
    if (ruta) {
      return true;
    }
    return false;
  }

  async ValidarUser(id_user: number): Promise<boolean> {
    const user = await this.usuariosRepository.findOne({
      where: { user_id: id_user },
    });
    if (user) {
      return true;
    }
    return false;
  }

  async ValidarVehiculos(placa: string): Promise<boolean> {
    const vehiculo = await this.vehiculosRepository.findOne({
      where: { placa: placa },
    });
    if (vehiculo) {
      return true;
    }
    return false;
  }

  async ValidarIncidencias(incidencias_id: number): Promise<boolean> {
    const incidencias = await this.IncidenciasRepository.findOne({
      where: { incidencias_id: incidencias_id },
    });
    if (incidencias) {
      return true;
    }
    return false;
  }

  async CreateViajes(createViajesdto: CreateViajesDto): Promise<ViajesEntity> {
    // Validar los campos obligatorios (ruta, usuario, vehículo)
    const rutaValida = await this.ValidarRuta(createViajesdto.id_ruta);
    const userValido = await this.ValidarUser(createViajesdto.id_user);
    const vehiculoValido = await this.ValidarVehiculos(
      createViajesdto.id_vehiculo,
    );

    if (!rutaValida || !userValido || !vehiculoValido) {
      throw new NotFoundException('Ruta, usuario o vehículo no existen');
    }

    // Validar incidencia solo si existe el campo y no es null/undefined
    if (
      createViajesdto.incidencia_id !== undefined &&
      createViajesdto.incidencia_id !== null
    ) {
      const incidenciaValida = await this.ValidarIncidencias(
        createViajesdto.incidencia_id,
      );
      if (!incidenciaValida) {
        throw new NotFoundException('La incidencia no existe');
      }
    }

    const viaje = this.viajesRepository.create({
      fecha_inicio: createViajesdto.fecha_inicio,
      fecha_final: createViajesdto.fecha_final,
      lactitud: createViajesdto.lactitud,
      longitud: createViajesdto.longitud,
      usuario: { user_id: createViajesdto.id_user },
      vehiculo: { placa: createViajesdto.id_vehiculo },
      ruta: { numero_ruta: createViajesdto.id_ruta },
      incidencia: createViajesdto.incidencia_id
        ? { incidencias_id: createViajesdto.incidencia_id }
        : null,
    });
    const crear = await this.viajesRepository.save(viaje);
    return await this.ObtenerVijesId(crear.id_viaje);
  }

  async ObtenerViajes(): Promise<ViajesEntity[]> {
    return await this.viajesRepository.find();
  }

  async ObtenerVijesId(id_viaje: number): Promise<ViajesEntity> {
    const viaje = await this.viajesRepository
      .createQueryBuilder('viaje')
      .leftJoinAndSelect('viaje.usuario', 'usuario')
      .leftJoinAndSelect('viaje.vehiculo', 'vehiculo')
      .leftJoinAndSelect('viaje.ruta', 'ruta')
      .leftJoinAndSelect('viaje.incidencia', 'incidencia')
      .where('viaje.id_viaje = :id_viaje', { id_viaje: id_viaje })
      .select([
        'viaje.id_viaje',
        'viaje.fecha_inicio',
        'viaje.fecha_final',
        'viaje.lactitud',
        'viaje.longitud',
        'usuario.username',
        'vehiculo.placa',
        'ruta.numero_ruta',
        'ruta.nombre',
        'incidencia.descripcion',
      ])
      .getOne();

    if (!viaje) {
      throw new NotFoundException(
        'El viaje a solicitar no se encuentra registrado o vuelva a intentar la búsqueda',
      );
    }
    return viaje;
  }

  async EliminarViajeID(id_viaje: number): Promise<ViajesEntity> {
    return await this.viajesRepository.remove(
      await this.ObtenerVijesId(id_viaje),
    );
  }

  async ActualizarViaje(
    id_viaje: number,
    updateviajeDto: UpdateViajesDto,
  ): Promise<ViajesEntity> {
    const viaje = await this.ObtenerVijesId(id_viaje);
    if (viaje) {
      viaje.fecha_inicio = updateviajeDto.fecha_inicio ?? viaje.fecha_inicio;
      viaje.fecha_final = updateviajeDto.fecha_final ?? viaje.fecha_final;
      viaje.lactitud = updateviajeDto.lactitud ?? viaje.lactitud;
      viaje.longitud = updateviajeDto.longitud ?? viaje.longitud;

      if (updateviajeDto.usuario !== undefined) {
        viaje.usuario = { user_id: updateviajeDto.usuario } as UsuariosEntity;
      }

      if (updateviajeDto.id_vehiculo !== undefined) {
        viaje.vehiculo = {
          placa: updateviajeDto.id_vehiculo,
        } as VehiculosEntity;
      }

      if (updateviajeDto.id_ruta !== undefined) {
        viaje.ruta = { numero_ruta: updateviajeDto.id_ruta } as RutaEntity;
      }

      if (updateviajeDto.incidencia_id !== undefined) {
        viaje.incidencia = {
          incidencias_id: updateviajeDto.incidencia_id,
        } as IncidenciasEntity;
      }
      const update = await this.viajesRepository.save(viaje);
      return await this.ObtenerVijesId(update.id_viaje);
    }
    throw new NotFoundException(`El viaje con id ${id_viaje} no encontrado.`);
  }

  // ==================================================================
  //  TRACKING
  // ==================================================================

  /**
   * Viajes sin fecha_final. Se apoya en el indice parcial
   * idx_viaje_activos del script sql/001.
   */
  async ObtenerViajesActivos(): Promise<ViajeActivoDTO[]> {
    const viajes = await this.viajesRepository
      .createQueryBuilder('viaje')
      .leftJoinAndSelect('viaje.usuario', 'usuario')
      .leftJoinAndSelect('viaje.vehiculo', 'vehiculo')
      .leftJoinAndSelect('viaje.ruta', 'ruta')
      .where('viaje.fecha_final IS NULL')
      .orderBy('viaje.fecha_inicio', 'DESC')
      .getMany();

    return viajes.map((v) => ({
      id_viaje: v.id_viaje,
      fecha_inicio: v.fecha_inicio,
      lactitud: v.lactitud,
      longitud: v.longitud,
      usuario: v.usuario
        ? { user_id: v.usuario.user_id, username: v.usuario.username }
        : null,
      vehiculo: v.vehiculo ? { placa: v.vehiculo.placa } : null,
      ruta: v.ruta
        ? { numero_ruta: v.ruta.numero_ruta, nombre: v.ruta.nombre }
        : null,
    }));
  }

  /**
   * Ultima posicion conocida. Sale de la fila del viaje (refrescada cada 30s
   * por el socket), no del historial: es la consulta barata.
   */
  async ObtenerUltimaUbicacion(id_viaje: number) {
    const viaje = await this.viajesRepository.findOne({
      where: { id_viaje },
    });
    if (!viaje) {
      throw new NotFoundException(`El viaje con id ${id_viaje} no existe.`);
    }
    return {
      id_viaje: viaje.id_viaje,
      lat: viaje.lactitud,
      lng: viaje.longitud,
      en_curso: viaje.fecha_final === null,
      fecha_inicio: viaje.fecha_inicio,
      fecha_final: viaje.fecha_final,
    };
  }

  /**
   * Traza del recorrido para dibujar la polilinea. Sale de viaje_ubicacion,
   * no de la fila del viaje.
   */
  async ObtenerRecorrido(id_viaje: number, horas = 6) {
    const existe = await this.viajesRepository.findOne({
      where: { id_viaje },
    });
    if (!existe) {
      throw new NotFoundException(`El viaje con id ${id_viaje} no existe.`);
    }

    const desde = new Date(Date.now() - horas * 60 * 60 * 1000);
    const puntos = await this.ubicacionesRepository
      .createQueryBuilder('u')
      .where('u.id_viaje = :id_viaje', { id_viaje })
      .andWhere('u.recorded_at >= :desde', { desde })
      .orderBy('u.recorded_at', 'ASC')
      .getMany();

    return {
      id_viaje,
      horas,
      total: puntos.length,
      recorrido: puntos.map((p) => ({
        lat: p.lactitud,
        lng: p.longitud,
        velocidad: p.velocidad,
        rumbo: p.rumbo,
        ts: p.recorded_at,
      })),
    };
  }

  /**
   * Fallback por REST cuando el socket esta caido (movil sin datos, bateria
   * plana). El socket sigue siendo la via principal.
   */
  async RegistrarUbicacionManual(
    id_viaje: number,
    lactitud: number,
    longitud: number,
  ) {
    await this.viajesRepository.update({ id_viaje }, { lactitud, longitud });
    await this.ubicacionesRepository.insert({
      id_viaje,
      lactitud,
      longitud,
      recorded_at: new Date(),
    });
    return await this.ObtenerUltimaUbicacion(id_viaje);
  }

  // ==================================================================
  //  BUSES CERCANOS
  // ==================================================================

  /**
   * "Buses cerca de mi": viajes en curso dentro de un radio, de mas cerca a mas
   * lejos.
   *
   * Son dos fuentes de verdad y hay que mezclarlas bien:
   *
   *  1. La BD (WHERE fecha_final IS NULL) es la fuente que sobrevive a un
   *     reinicio, asi que es la base. Pero su posicion esta hasta 30s atrasada.
   *  2. La memoria del socket tiene la posicion al instante y el estado
   *     real de conexion, pero solo conoce los viajes de ESTE proceso.
   *
   * Por eso: la BD acota el terreno, y despues cada fila se corrige con la
   * posicion en vivo si la hay, y se vuelve a medir y a ordenar.
   */
  async ObtenerViajesCercanos(
    lactitud: number,
    longitud: number,
    radioM = 1000,
    limite = 20,
    soloOnline = false,
  ): Promise<BusCercanoDTO[]> {
    const radio = Math.min(50_000, Math.max(50, radioM));
    const max = Math.min(100, Math.max(1, limite));

    // Caja envolvente: antes de calcular haversine se descartan los puntos que
    // ni por musica pueden estar. Sin esto Postgres recorre TODOS los viajes
    // activos por cada consulta. Es un filtro rectangular, no exacto; la
    // precision la pone el haversine de abajo.
    const dLat = radio / 111_320;
    const cos = Math.cos((lactitud * Math.PI) / 180);
    // En los polos el coseno tiende a 0 y la division explota: se topa en 1 grado.
    const dLng = radio / (111_320 * Math.max(Math.abs(cos), 0.0175));

    // Se piden mas filas de las que se van a devolver porque el ajuste con la
    // posicion en vivo puede sacar a alguien del radio, y ese hueco no se
    // rellena con una segunda vuelta a la BD.
    const candidatos = await this.viajesRepository
      .createQueryBuilder('viaje')
      .leftJoinAndSelect('viaje.usuario', 'usuario')
      .leftJoinAndSelect('viaje.vehiculo', 'vehiculo')
      .leftJoinAndSelect('viaje.ruta', 'ruta')
      .select([
        'viaje.id_viaje',
        'viaje.lactitud',
        'viaje.longitud',
        'usuario.username',
        'vehiculo.placa',
        'ruta.numero_ruta',
        'ruta.nombre',
      ])
      .where('viaje.fecha_final IS NULL')
      .andWhere('viaje.lactitud BETWEEN :latMin AND :latMax', {
        latMin: lactitud - dLat,
        latMax: lactitud + dLat,
      })
      .andWhere('viaje.longitud BETWEEN :lngMin AND :lngMax', {
        lngMin: longitud - dLng,
        lngMax: longitud + dLng,
      })
      .limit(max * 3)
      .getMany();

    const vivos = this.trackingService.posicionesVivas();

    const cerca: BusCercanoDTO[] = [];
    for (const v of candidatos) {
      const vivo = vivos.get(v.id_viaje);
      // Si hay sesion en memoria, manda su posicion: la de la fila tiene hasta
      // 30s de retraso y para "cercano" eso ya es otra calle.
      const lat = vivo?.ultima_ubicacion.lat ?? v.lactitud;
      const lng = vivo?.ultima_ubicacion.lng ?? v.longitud;
      const enVivo = vivo !== undefined;

      if (soloOnline && !vivo?.online) continue;

      const distancia = this.distanciaMetros(lactitud, longitud, lat, lng);
      if (distancia > radio) continue;

      cerca.push({
        id_viaje: v.id_viaje,
        lat,
        lng,
        distancia_m: Math.round(distancia),
        online: vivo?.online ?? false,
        posicion_en_vivo: enVivo,
        velocidad: vivo?.ultima_ubicacion.velocidad ?? null,
        rumbo: vivo?.ultima_ubicacion.rumbo ?? null,
        ts_actualizacion: vivo?.ultima_ubicacion.ts ?? 0,
        placa: vivo?.placa ?? v.vehiculo?.placa ?? null,
        numero_ruta: vivo?.numero_ruta ?? v.ruta?.numero_ruta ?? null,
        nombre_ruta: v.ruta?.nombre ?? null,
        username: vivo?.username ?? v.usuario?.username ?? null,
      });
    }

    cerca.sort((a, b) => a.distancia_m - b.distancia_m);
    return cerca.slice(0, max);
  }

  /** Distancia en metros entre dos puntos. Haversine, no Euclidea. */
  private distanciaMetros(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const rad = (d: number) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(a)));
  }
}
