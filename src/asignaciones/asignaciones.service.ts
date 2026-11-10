import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { UsuariosEntity } from 'src/entidades/Usuarios.entity';
import { VehiculosEntity } from 'src/entidades/vehiculos.entity';
import { RutaEntity } from 'src/entidades/ruta.entity';
import { ViajesEntity } from 'src/entidades/Viajes.entity';
import { CreateAsignacionDto } from 'src/dtos/Asignaciones/create-asignacion.dto';
import { UpdateAsignacionDto } from 'src/dtos/Asignaciones/update-asignacion.dto';
import { AsignacionEntity } from 'src/entidades/asignaciones.entity';

@Injectable()
export class AsignacionesService {
  constructor(
    @InjectRepository(AsignacionEntity)
    private asignacionRepository: Repository<AsignacionEntity>,
    @InjectRepository(UsuariosEntity)
    private usuariosRepository: Repository<UsuariosEntity>,
    @InjectRepository(VehiculosEntity)
    private vehiculosRepository: Repository<VehiculosEntity>,
    @InjectRepository(RutaEntity)
    private rutaRepository: Repository<RutaEntity>,
    @InjectRepository(ViajesEntity)
    private viajesRepository: Repository<ViajesEntity>,
  ) {}

  /** Crea una nueva asignación vinculando las 4 entidades. */
  async CrearAsignacion(dto: CreateAsignacionDto): Promise<AsignacionEntity> {
    // 1. Buscar las entidades
    const usuario = await this.usuariosRepository.findOne({ where: { username: dto.username } });
    const vehiculo = await this.vehiculosRepository.findOne({ where: { placa: dto.vehiculo_placa } });
    const ruta = await this.rutaRepository.findOne({ where: { numero_ruta: dto.numero_ruta } });
    const viaje = await this.viajesRepository.findOne({ where: { id_viaje: dto.id_viaje } });

    // 2. Validar que existan
    if (!usuario) throw new NotFoundException(`El usuario ${dto.username} no existe.`);
    if (!vehiculo) throw new NotFoundException(`El vehículo ${dto.vehiculo_placa} no existe.`);
    if (!ruta) throw new NotFoundException(`La ruta ${dto.numero_ruta} no existe.`);
    if (!viaje) throw new NotFoundException(`El viaje con ID ${dto.id_viaje} no existe.`);

    // 3. Crear y guardar
    const nuevaAsignacion = this.asignacionRepository.create({
      usuario,
      vehiculo,
      ruta,
      viaje,
    });

    return await this.asignacionRepository.save(nuevaAsignacion);
  }

  /** Obtiene todas las asignaciones (para el admin), limpiando los IDs. */
  async ObtenerAsignaciones() {
    return await this.asignacionRepository
      .createQueryBuilder('asignacion')
      .leftJoin('asignacion.usuario', 'usuario')
      .leftJoin('asignacion.vehiculo', 'vehiculo')
      .leftJoin('asignacion.ruta', 'ruta')
      .leftJoin('asignacion.viaje', 'viaje')
      .select([
        'asignacion.id_asignacion',
        'asignacion.fecha_asignacion',
        'asignacion.fecha_fin_asignacion',
        'usuario.username',
        'vehiculo.placa',
        'vehiculo.modelo',
        'ruta.numero_ruta',
        'ruta.nombre',
        'viaje.fecha_inicio',
        'viaje.fecha_final',
      ])
      .orderBy('asignacion.fecha_asignacion', 'DESC')
      .getMany();
  }

  /** Busca asignaciones activas de un conductor específico. */
  async ObtenerAsignacionesPorUsuario(username: string) {
    return await this.asignacionRepository
      .createQueryBuilder('asignacion')
      .leftJoin('asignacion.usuario', 'usuario')
      .leftJoin('asignacion.vehiculo', 'vehiculo')
      .leftJoin('asignacion.ruta', 'ruta')
      .select([
        'asignacion.id_asignacion',
        'asignacion.fecha_asignacion',
        'usuario.username',
        'vehiculo.placa',
        'vehiculo.modelo',
        'ruta.numero_ruta',
        'ruta.nombre',
      ])
      .where('LOWER(usuario.username) = LOWER(:username)', { username })
      .andWhere('asignacion.fecha_fin_asignacion IS NULL') // Solo las activas
      .getMany();
  }

  /** Actualiza la fecha de finalización de una asignación. */
  async ActualizarAsignacion(id_asignacion: number, dto: UpdateAsignacionDto): Promise<AsignacionEntity> {
    const asignacion = await this.asignacionRepository.findOne({ where: { id_asignacion } });
    if (!asignacion) throw new NotFoundException(`La asignación ${id_asignacion} no existe.`);

    if (dto.fecha_fin_asignacion) {
      asignacion.fecha_fin_asignacion = new Date(dto.fecha_fin_asignacion);
    }

    return await this.asignacionRepository.save(asignacion);
  }
}