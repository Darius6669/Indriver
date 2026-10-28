import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { IncidenciasEntity } from 'src/entidades/Incidencias.entity';
import { ViajesEntity } from 'src/entidades/Viajes.entity';
import { RutaEntity } from 'src/entidades/ruta.entity';
import { UsuariosEntity } from 'src/entidades/Usuarios.entity';
import { VehiculosEntity } from 'src/entidades/vehiculos.entity';
import { CreateViajesDto } from 'src/dtos/viajes/Create_Viajes.dto';
import { UpdateViajesDto } from 'src/dtos/viajes/UpdateViajes.dto';
import { ViajeUbicacionEntity } from 'src/entidades/ViajeUbicacion.entity';
import { WebsocketService } from 'src/websocket/websocket.service';

export interface ViajeActivoDTO {
  id_viaje: number;
  fecha_inicio: Date;
  lactitud: number;
  longitud: number;
  usuario: { user_id: number; username: string } | null;
  vehiculo: { placa: string } | null;
  ruta: { numero_ruta: string; nombre: string } | null;
}

export interface BusCercanoDTO {
  id_viaje: number;
  lat: number;
  lng: number;
  distancia_m: number;
  online: boolean;
  posicion_en_vivo: boolean;
  velocidad: number | null;
  rumbo: number | null;
  ts_actualizacion: number;
  placa: string | null;
  numero_ruta: string | null;
  nombre_ruta: string | null;
  username: string | null;
}

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
    private readonly trackingService: WebsocketService,
  ) {}

  /**
   * Verifica que la placa del vehiculo exista en la tabla vehiculos.
   */
  async ValidarVehiculos(placa: string): Promise<boolean> {
    const vehiculo = await this.vehiculosRepository.findOne({
      where: { placa: placa },
    });
    return !!vehiculo;
  }

  /**
   * Verifica que el id de incidencia exista en la tabla incidencias.
   */
  async ValidarIncidencias(incidencias_id: number): Promise<boolean> {
    const incidencias = await this.IncidenciasRepository.findOne({
      where: { incidencias_id: incidencias_id },
    });
    return !!incidencias;
  }

    /** Busca la ruta por su numero_ruta y la devuelve (o null si no existe). */
  async ValidarRuta(numero_ruta: string): Promise<RutaEntity | null> {
    return await this.rutaRepository.findOne({
      where: { numero_ruta: numero_ruta },
    });
  }

  /** Busca al usuario por su username y lo devuelve (o null si no existe). */
  async ValidarUser(username: string): Promise<UsuariosEntity | null> {
    return await this.usuariosRepository.findOne({
      where: { username: username },
    });
  }

    /**
   * Crea un viaje tras validar sus referencias (ruta, usuario, vehiculo e
   * incidencia opcional). Si la placa ya tiene un viaje abierto, devuelve ESE
   * viaje en vez de duplicarlo: esa es la invariante "1 abierto por placa".
   */
  async CreateViajes(createViajesdto: CreateViajesDto): Promise<ViajesEntity> {
    // 1. Buscar las entidades completas usando los textos legibles
    const rutaEncontrada = await this.ValidarRuta(createViajesdto.id_ruta);
    const usuarioEncontrado = await this.ValidarUser(createViajesdto.username); // <-- Usamos username
    const vehiculoValido = await this.ValidarVehiculos(createViajesdto.id_vehiculo);

    // 2. Validar que todo exista en la base de datos
    if (!rutaEncontrada || !usuarioEncontrado || !vehiculoValido) {
      throw new NotFoundException('Ruta, usuario o vehículo no existen');
    }

    // 3. Validar incidencia solo si existe el campo y no es null/undefined
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

    // 4. Un solo viaje ABIERTO por vehiculo. Si ya hay uno, se devuelve ESE.
    const abierto = await this.buscarViajeAbierto(createViajesdto.id_vehiculo);
    if (abierto) return abierto;

    // 5. Crear el viaje pasando los OBJETOS COMPLETOS (para que TypeORM sea feliz)
    const viaje = this.viajesRepository.create({
      fecha_inicio: createViajesdto.fecha_inicio,
      fecha_final: createViajesdto.fecha_final,
      lactitud: createViajesdto.lactitud,
      longitud: createViajesdto.longitud,
      
      usuario: usuarioEncontrado, // <--- Objeto completo
      vehiculo: { placa: createViajesdto.id_vehiculo },
      ruta: rutaEncontrada,       // <--- Objeto completo
      
      incidencia: createViajesdto.incidencia_id
        ? { incidencias_id: createViajesdto.incidencia_id }
        : null,
    });

    try {
      const crear = await this.viajesRepository.save(viaje);
      return await this.ObtenerVijesId(crear.id_viaje);
    } catch (error) {
      // Carrera: dos peticiones pasaron el chequeo a la vez y el indice
      // unico (23505) rechazo la segunda. Se devuelve el viaje del ganador.
      if (this.esViolacionUnica(error)) {
        const ganador = await this.buscarViajeAbierto(
          createViajesdto.id_vehiculo,
        );
        if (ganador) return ganador;
      }
      throw error;
    }
  }
  
  private async buscarViajeAbierto(placa: string): Promise<ViajesEntity | null> {
    const abierto = await this.viajesRepository.findOne({
      where: { vehiculo: { placa }, fecha_final: IsNull() },
      relations: ['usuario', 'vehiculo', 'ruta', 'incidencia'],
      order: { id_viaje: 'DESC' },
    });
    return abierto ?? null;
  }

  private esViolacionUnica(error: unknown): boolean {
    const codigo =
      (error as { code?: string })?.code ??
      (error as { driverError?: { code?: string } })?.driverError?.code;
    return codigo === '23505';
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

      // Si actualizan el usuario, buscamos por username (asumiendo que el UpdateDto también cambió a username)
      if (updateviajeDto.usuario !== undefined) {
        const user = await this.usuariosRepository.findOne({ where: { username: updateviajeDto.usuario.toString() } });
        if (user) viaje.usuario = user;
      }

      if (updateviajeDto.id_vehiculo !== undefined) {
        viaje.vehiculo = { placa: updateviajeDto.id_vehiculo } as VehiculosEntity;
      }

      // Si actualizan la ruta, buscamos por numero_ruta
      if (updateviajeDto.id_ruta !== undefined) {
        const ruta = await this.rutaRepository.findOne({ where: { numero_ruta: updateviajeDto.id_ruta } });
        if (ruta) viaje.ruta = ruta;
      }

      if (updateviajeDto.incidencia_id !== undefined) {
        viaje.incidencia = { incidencias_id: updateviajeDto.incidencia_id } as IncidenciasEntity;
      }
      
      const update = await this.viajesRepository.save(viaje);
      return await this.ObtenerVijesId(update.id_viaje);
    }
    throw new NotFoundException(`El viaje con id ${id_viaje} no encontrado.`);
  }

  // ==================================================================
  //  TRACKING (Se mantiene igual)
  // ==================================================================

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

  async ObtenerUltimaUbicacion(id_viaje: number) {
    const viaje = await this.viajesRepository.findOne({ where: { id_viaje } });
    if (!viaje) throw new NotFoundException(`El viaje con id ${id_viaje} no existe.`);
    
    const ubicacion = await this.ubicacionesRepository.findOne({ where: { id_viaje } });
    return {
      id_viaje: viaje.id_viaje,
      lat: ubicacion?.lactitud ?? viaje.lactitud,
      lng: ubicacion?.longitud ?? viaje.longitud,
      en_curso: viaje.fecha_final === null,
      fecha_inicio: viaje.fecha_inicio,
      fecha_final: viaje.fecha_final,
    };
  }

  async ObtenerUbicacion(id_viaje: number) {
    const viaje = await this.viajesRepository.findOne({ where: { id_viaje } });
    if (!viaje) throw new NotFoundException(`El viaje con id ${id_viaje} no existe.`);
    
    const ubicacion = await this.ubicacionesRepository.findOne({ where: { id_viaje } });
    return {
      id_viaje,
      en_curso: viaje.fecha_final === null,
      existe_ubicacion: ubicacion !== null,
      ubicacion: ubicacion ? {
            id: ubicacion.id,
            lactitud: ubicacion.lactitud,
            longitud: ubicacion.longitud,
            velocidad: ubicacion.velocidad ?? null,
            rumbo: ubicacion.rumbo ?? null,
            precision: ubicacion.precision ?? null,
            recorded_at: ubicacion.recorded_at,
          } : null,
    };
  }

  async ObtenerRecorrido(id_viaje: number, horas = 6) {
    const existe = await this.viajesRepository.findOne({ where: { id_viaje } });
    if (!existe) throw new NotFoundException(`El viaje con id ${id_viaje} no existe.`);

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

  async RegistrarUbicacionManual(id_viaje: number, lactitud: number, longitud: number) {
    await this.ubicacionesRepository.upsert(
      { id_viaje, lactitud, longitud, recorded_at: new Date() },
      ['id_viaje'],
    );
    return await this.ObtenerUltimaUbicacion(id_viaje);
  }

  async ObtenerViajesCercanos(
    lactitud: number, longitud: number, radioM = 1000, limite = 20, soloOnline = false,
  ): Promise<BusCercanoDTO[]> {
    const radio = Math.min(50_000, Math.max(50, radioM));
    const max = Math.min(100, Math.max(1, limite));

    const dLat = radio / 111_320;
    const cos = Math.cos((lactitud * Math.PI) / 180);
    const dLng = radio / (111_320 * Math.max(Math.abs(cos), 0.0175));

    const candidatos = await this.viajesRepository
      .createQueryBuilder('viaje')
      .leftJoin('viaje.usuario', 'usuario')
      .leftJoin('viaje.vehiculo', 'vehiculo')
      .leftJoin('viaje.ruta', 'ruta')
      .leftJoin('viaje.ubicaciones', 'ubicacion')
      .select('viaje.id_viaje', 'id_viaje')
      .addSelect('COALESCE(ubicacion.lactitud, viaje.lactitud)', 'lat')
      .addSelect('COALESCE(ubicacion.longitud, viaje.longitud)', 'lng')
      .addSelect('usuario.username', 'username')
      .addSelect('vehiculo.placa', 'placa')
      .addSelect('ruta.numero_ruta', 'numero_ruta')
      .addSelect('ruta.nombre', 'nombre_ruta')
      .where('viaje.fecha_final IS NULL')
      .andWhere(
        'COALESCE(ubicacion.lactitud, viaje.lactitud) BETWEEN :latMin AND :latMax',
        { latMin: lactitud - dLat, latMax: lactitud + dLat },
      )
      .andWhere(
        'COALESCE(ubicacion.longitud, viaje.longitud) BETWEEN :lngMin AND :lngMax',
        { lngMin: longitud - dLng, lngMax: longitud + dLng },
      )
      .limit(max * 3)
      .getRawMany<{
        id_viaje: number;
        lat: number;
        lng: number;
        username: string | null;
        placa: string | null;
        numero_ruta: string | null;
        nombre_ruta: string | null;
      }>();

    const vivos = this.trackingService.posicionesVivas();
    const cerca: BusCercanoDTO[] = [];

    for (const c of candidatos) {
      const idViaje = Number(c.id_viaje);
      const vivo = vivos.get(idViaje);
      const lat = vivo?.ultima_ubicacion.lat ?? Number(c.lat);
      const lng = vivo?.ultima_ubicacion.lng ?? Number(c.lng);
      const enVivo = vivo !== undefined;

      if (soloOnline && !vivo?.online) continue;

      const distancia = this.distanciaMetros(lactitud, longitud, lat, lng);
      if (distancia > radio) continue;

      cerca.push({
        id_viaje: idViaje,
        lat,
        lng,
        distancia_m: Math.round(distancia),
        online: vivo?.online ?? false,
        posicion_en_vivo: enVivo,
        velocidad: vivo?.ultima_ubicacion.velocidad ?? null,
        rumbo: vivo?.ultima_ubicacion.rumbo ?? null,
        ts_actualizacion: vivo?.ultima_ubicacion.ts ?? 0,
        placa: vivo?.placa ?? c.placa ?? null,
        numero_ruta: vivo?.numero_ruta ?? c.numero_ruta ?? null,
        nombre_ruta: c.nombre_ruta ?? null,
        username: vivo?.username ?? c.username ?? null,
      });
    }

    cerca.sort((a, b) => a.distancia_m - b.distancia_m);
    return cerca.slice(0, max);
  }

  private distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const rad = (d: number) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(a)));
  }
}