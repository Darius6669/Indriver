import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateRutasDto } from 'src/dtos/rutasdto/Create_Rutas.dto';
import { UpdateRutaDto } from 'src/dtos/rutasdto/Updatedto.dto';
import { ControlRutaEntity } from 'src/entidades/ControlRuta.entity';
import { CooperativaEntity } from 'src/entidades/cooperativa.entity';
import { RutaEntity } from 'src/entidades/ruta.entity';
import { Repository } from 'typeorm';

/**
 * Servicio de negocio del recurso "rutas".
 * Encapsula el acceso a los repositorios de rutas, cooperativas y puntos de
 * control, y valida las referencias antes de persistir.
 */
@Injectable()
export class RutasService {
  constructor(
    @InjectRepository(RutaEntity)
    private rutaRepository: Repository<RutaEntity>,
    @InjectRepository(CooperativaEntity)
    private cooperativaRepository: Repository<CooperativaEntity>,
    @InjectRepository(ControlRutaEntity)
    private controlRepository: Repository<ControlRutaEntity>,
  ) {}

  /**
   * Crea una ruta validando que existan la cooperativa y el punto de origen.
   * @param createRutadto Datos de la nueva ruta.
   * @returns La ruta guardada.
   * @throws NotFoundException si la cooperativa o el origen no existen.
   */
  async crearRuta(createRutadto: CreateRutasDto): Promise<RutaEntity> {
    // Se resuelven primero las relaciones (cooperativa y punto de control origen).
    const cooperativa = await this.cooperativaRepository.findOne({
      where: { rif_cooperativa: createRutadto.cooperativa_id },
    });

    const origen = await this.controlRepository.findOne({
      where: { id_control: createRutadto.origen_id },
    });

    if (!cooperativa) {
      throw new NotFoundException(
        `Usuario con ID ${createRutadto.cooperativa_id} no encontrado.`,
      );
    }

    if (!origen) {
      throw new NotFoundException(
        `Control de ruta de origen o destino no encontrado.`,
      );
    }
    // Se construye la entidad a mano para asignar las relaciones ya resueltas.
    const nuevaRuta = new RutaEntity();
    nuevaRuta.numero_ruta = createRutadto.numero_ruta;
    nuevaRuta.nombre = createRutadto.nombre;
    nuevaRuta.descripcion = createRutadto.descripcion;
    nuevaRuta.tarifa = createRutadto.tarifa;
    nuevaRuta.origen = origen;
    nuevaRuta.cooperativa = cooperativa;
    return this.rutaRepository.save(nuevaRuta);
  }

  /**
   * Lista todas las rutas incluyendo su cooperativa.
   * @returns Arreglo de rutas con la relación 'cooperativa' cargada.
   */
  async obtenerrutas(): Promise<RutaEntity[]> {
    // Se cargan las relaciones para evitar respuestas con cooperativa vacía.
    return this.rutaRepository.find({ relations: ['cooperativa'] });
  }

  /**
   * Busca una ruta por su número.
   * @param numero_ruta Clave primaria de la ruta.
   * @returns La ruta encontrada con su cooperativa.
   * @throws NotFoundException si no existe.
   */
  async obtenerRutaPorId(numero_ruta: string): Promise<RutaEntity> {
    const ruta = await this.rutaRepository.find({
      where: { numero_ruta },
      relations: ['cooperativa'],
    });
    if (!ruta) {
      throw new NotFoundException(
        `Ruta con numero ${numero_ruta} no encontrada.`,
      );
    }
    return ruta;
  }

  /**
   * Elimina una ruta por su número.
   * @param numero_ruta Clave primaria de la ruta.
   * @returns La ruta eliminada.
   * @throws NotFoundException si no existe.
   */
  async eliminarRuta(numero_ruta: string): Promise<RutaEntity> {
    const ruta = await this.rutaRepository.findOne({ where: { numero_ruta } });
    if (!ruta) {
      throw new NotFoundException(
        `Ruta con numero ${numero_ruta} no encontrada.`,
      );
    }
    return await this.rutaRepository.remove(ruta);
  }

  /**
   * Actualiza parcialmente una ruta existente.
   * Solo cambia los campos presentes en el DTO; las relaciones se revalidan.
   * @param numero_ruta Clave primaria de la ruta a actualizar.
   * @param updateRutaDto Campos opcionales a modificar.
   * @returns La ruta actualizada.
   * @throws NotFoundException si la ruta o alguna relación referenciada no existe.
   */
  async actualizarRuta(
    numero_ruta: string,
    updateRutaDto: UpdateRutaDto,
  ): Promise<RutaEntity> {
    const ruta = await this.rutaRepository.findOne({ where: { numero_ruta } });

    if (!ruta) {
      throw new NotFoundException(
        `Ruta con numero ${numero_ruta} no encontrada.`,
      );
    }

    // Si se envía cooperativa_id, se revalida antes de reasignar la relación.
    if (updateRutaDto.cooperativa_id) {
      const cooperativa = await this.cooperativaRepository.findOne({
        where: { rif_cooperativa: updateRutaDto.cooperativa_id },
      });
      if (!cooperativa) {
        throw new NotFoundException(
          `Cooperativa con ID ${updateRutaDto.cooperativa_id} no encontrada.`,
        );
      }
      ruta.cooperativa = cooperativa;
    }

    // Si se envía origen_id, se revalida el punto de control de origen.
    if (updateRutaDto.origen_id) {
      const origen = await this.controlRepository.findOne({
        where: { id_control: updateRutaDto.origen_id },
      });
      if (!origen) {
        throw new NotFoundException(
          `Control de ruta de origen con ID ${updateRutaDto.origen_id} no encontrado.`,
        );
      }
      ruta.origen = origen;
    }

    // Operador ?? aplica el valor nuevo solo si viene definido; si no, conserva el actual.
    ruta.numero_ruta = updateRutaDto.numero_ruta ?? ruta.numero_ruta;
    ruta.nombre = updateRutaDto.nombre ?? ruta.nombre;
    ruta.descripcion = updateRutaDto.descripcion ?? ruta.descripcion;
    ruta.tarifa = updateRutaDto.tarifa ?? ruta.tarifa;
    return await this.rutaRepository.save(ruta);
  }
}
