import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncidenciasEntity } from 'src/entidades/Incidencias.entity';
import { CreateIncidenciasDto } from 'src/dtos/indenciasdto/Create_incidencias.dto';
import { UpdateIncidenciasDto } from 'src/dtos/indenciasdto/Update_incidencias.dto';

/**
 * Servicio de negocio del recurso "incidencias".
 * Encapsula las operaciones CRUD sobre IncidenciasEntity.
 */
@Injectable()
export class IncidenciasService {
  constructor(
    @InjectRepository(IncidenciasEntity)
    private incidenciasRepository: Repository<IncidenciasEntity>,
  ) {}

  /**
   * Crea y guarda una incidencia.
   * @param createIncidenciasDto Datos de la nueva incidencia.
   * @returns La incidencia persistida.
   */
  async CrearIncidencia(
    createIncidenciasDto: CreateIncidenciasDto,
  ): Promise<IncidenciasEntity> {
    // create() instancia la entidad a partir del DTO; save() la persiste.
    const Incidencias = this.incidenciasRepository.create(createIncidenciasDto);
    return this.incidenciasRepository.save(Incidencias);
  }

  /**
   * Comprueba si existe una incidencia con ese id.
   * @param id Identificador a verificar.
   * @returns true si existe, false si no.
   */
  async VerificarId(id: number): Promise<boolean> {
    const Incidencias = await this.incidenciasRepository.findOne({
      where: { incidencias_id: id },
    });
    if (Incidencias) {
      return true;
    }
    return false;
  }

  /**
   * Lista todas las incidencias.
   * @returns Arreglo de incidencias.
   */
  async ObtenerIncidencias(): Promise<IncidenciasEntity[]> {
    return await this.incidenciasRepository.find();
  }

  /**
   * Busca una incidencia por su id.
   * @param id Identificador de la incidencia.
   * @returns La incidencia encontrada.
   * @throws NotFoundException si no existe.
   */
  async ObtenerIncidenciasId(id: number): Promise<IncidenciasEntity> {
    const Incidencias = await this.incidenciasRepository.findOne({
      where: { incidencias_id: id },
    });
    if (!Incidencias) {
      throw new NotFoundException(`Incidencia con id ${id} no encontrada.`);
    }
    return Incidencias;
  }

  /**
   * Elimina una incidencia por su id.
   * @param id Identificador de la incidencia.
   * @returns La incidencia eliminada.
   */
  async EliminarIncidencia(id: number): Promise<IncidenciasEntity> {
    // ObtenerIncidenciasId valida la existencia antes de eliminar.
    return await this.incidenciasRepository.remove(
      await this.ObtenerIncidenciasId(id),
    );
  }

  /**
   * Actualiza parcialmente una incidencia.
   * @param id Identificador de la incidencia.
   * @param updateIncidenciasDto Campos a modificar.
   * @returns La incidencia actualizada.
   * @throws NotFoundException si no existe.
   */
  async ActualizarIncidencias(
    id: number,
    updateIncidenciasDto: UpdateIncidenciasDto,
  ): Promise<IncidenciasEntity> {
    const Incidencias = await this.ObtenerIncidenciasId(id);
    // La rama if es siempre verdadera tras la búsqueda exitosa; se conserva por claridad.
    if (Incidencias) {
      // ?? conserva el valor actual si el DTO no trae el campo.
      Incidencias.descripcion =
        updateIncidenciasDto.descripcion ?? Incidencias.descripcion;
      Incidencias.estado = updateIncidenciasDto.estado ?? Incidencias.estado;
      return await this.incidenciasRepository.save(Incidencias);
    }
    throw new NotFoundException(`Incidencia con id ${id} no encontrada.`);
  }
}
