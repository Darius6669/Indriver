import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateRutaControlDto } from 'src/dtos/ControlRutadto/Create_RutaControl.dto';
import { updatePuntoControl } from 'src/dtos/ControlRutadto/UpdateControlRuta.dto';
import { ControlRutaEntity } from 'src/entidades/ControlRuta.entity';
import { Repository } from 'typeorm';

/**
 * Servicio de negocio del recurso "puntos-control".
 * Administra las entidades ControlRutaEntity (puntos de origen/destino de rutas).
 */
@Injectable()
export class PuntosControlService {
  constructor(
    @InjectRepository(ControlRutaEntity)
    private ControlRepository: Repository<ControlRutaEntity>,
  ) {}

  /**
   * Comprueba si existe un punto de control con ese nombre.
   * @param nombre Nombre a consultar.
   * @returns true si existe, false en caso contrario.
   */
  async Verificar_Punto_Control(nombre: string): Promise<boolean> {
    const control = await this.ControlRepository.findOne({
      where: { nombre: nombre },
    });
    if (control) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Obtiene todos los puntos de control.
   * @returns Arreglo con todos los puntos de control.
   */
  async Obtener_Todos_puntos(): Promise<ControlRutaEntity[]> {
    return await this.ControlRepository.find();
  }

  /**
   * Crea un punto de control a partir del DTO.
   * @param CreateRutaControldto Datos del nuevo punto de control.
   * @returns El punto de control guardado.
   */
  async Crear_Punto_control(
    CreateRutaControldto: CreateRutaControlDto,
  ): Promise<ControlRutaEntity> {
    // Se instancia la entidad y se copian los campos del DTO.
    const control = new ControlRutaEntity();
    control.nombre = CreateRutaControldto.nombre;
    control.descripcion = CreateRutaControldto.descripcion;
    control.ubicacion = CreateRutaControldto.ubicacion;
    control.lactitud = CreateRutaControldto.lactitud;
    control.longitud = CreateRutaControldto.longitud;
    return this.ControlRepository.save(control);
  }

  /**
   * Obtiene un punto de control por su nombre.
   * @param nombre Nombre del punto de control.
   * @returns El punto de control encontrado.
   * @throws NotFoundException si no existe.
   */
  async Obtener_Punto_Control_ID(nombre: string): Promise<ControlRutaEntity> {
    const control = await this.ControlRepository.findOne({
      where: { nombre: nombre },
    });
    if (!control) {
      throw new NotFoundException(
        `Este Punto de control no se encuentra registrado ${nombre} no encontrado.`,
      );
    }

    return control;
  }

  /**
   * Elimina un punto de control por su nombre.
   * @param nombre Nombre del punto de control.
   * @returns El punto de control eliminado.
   */
  async Eliminar_Punto_control(nombre: string): Promise<ControlRutaEntity> {
    // Reutiliza la búsqueda que ya lanza NotFoundException si no existe.
    const control = await this.Obtener_Punto_Control_ID(nombre);
    return await this.ControlRepository.remove(control);
  }

  /**
   * Actualiza parcialmente un punto de control.
   * Solo sobrescribe los campos enviados en el DTO.
   * @param UpdatePuntoControl DTO con los campos a modificar.
   * @returns El punto de control actualizado.
   */
  async Actualizar_Punto_Control(
    UpdatePuntoControl: updatePuntoControl,
  ): Promise<ControlRutaEntity> {
    const control = await this.Obtener_Punto_Control_ID(
      UpdatePuntoControl.nombre,
    );
    const aux = control;
    // Operador ?? conserva el valor actual cuando el DTO no trae ese campo.
    aux.nombre = UpdatePuntoControl.nombre ?? control.nombre;
    aux.descripcion = UpdatePuntoControl.descripcion ?? control.descripcion;
    aux.ubicacion = UpdatePuntoControl.ubicacion ?? control.ubicacion;
    aux.lactitud = UpdatePuntoControl.lactitud ?? control.lactitud;
    aux.longitud = UpdatePuntoControl.longitud ?? control.longitud;
    return await this.ControlRepository.save(aux);
  }
}
