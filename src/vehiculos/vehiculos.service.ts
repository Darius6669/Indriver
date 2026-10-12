import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateVehiculosDto } from 'src/dtos/vehiculosdto/Create_Vehiculos.dto';
import { UpdateVehiculoDto } from 'src/dtos/vehiculosdto/UpdateVehiculodto.dto';
import { CooperativaEntity } from 'src/entidades/cooperativa.entity';
import { VehiculosEntity } from 'src/entidades/vehiculos.entity';
import { Repository } from 'typeorm';

/**
 * Servicio de vehículos. Gestiona el CRUD de VehiculosEntity y valida la
 * relación N:1 con CooperativaEntity. Carga la relación cooperativa cuando es
 * necesario para devolver información completa.
 */
@Injectable()
export class VehiculosService {
  // Repositorios TypeORM para vehículos y para cooperativas (validación de FK).
  constructor(
    @InjectRepository(VehiculosEntity)
    private vehiculoRepository: Repository<VehiculosEntity>,
    @InjectRepository(CooperativaEntity)
    private CooperativaRepository: Repository<CooperativaEntity>,
  ) {}

  /** Devuelve todos los vehículos, incluyendo la cooperativa a la que pertenecen. */
  async ObtenerVehiculos(): Promise<VehiculosEntity[]> {
    return this.vehiculoRepository.find({ relations: ['cooperativa'] });
  }

  /** Busca un vehículo por placa y carga su relación con cooperativa. */
  async ObtenerVehiculoPorId(placa: string): Promise<VehiculosEntity> {
    const vehiculo = await this.vehiculoRepository.findOne({
      where: { placa },
      relations: ['cooperativa'],
    });
    if (!vehiculo) {
      throw new NotFoundException(`Vehiculo ${placa} no encontrada.`);
    }
    return vehiculo;
  }

  /** Indica si existe un vehículo con esa placa (true/false). */
  async verificarVehiculo(placa: string): Promise<boolean> {
    const vehiculo = await this.vehiculoRepository.findOne({
      where: { placa },
    });
    return !!vehiculo;
  }

  /**
   * Verifica que exista una cooperativa con el RIF dado. Lanza NotFoundException
   * si no se encuentra y devuelve la entidad si existe.
   */
  async verificarCooperativa(
    rif_cooperativa: string,
  ): Promise<CooperativaEntity> {
    const cooperativa = await this.CooperativaRepository.findOne({
      where: { rif_cooperativa },
    });
    if (!cooperativa) {
      throw new NotFoundException(
        `Cooperativa con rif ${rif_cooperativa} no encontrada.`,
      );
    }
    return cooperativa;
  }

  /**
   * Registra un vehículo nuevo. Valida que no exista la placa y que exista la
   * cooperativa referenciada; luego crea la entidad, asigna la relación y la persiste.
   */
  async RegistrarVehiculo(
    CreateVehiculodto: CreateVehiculosDto,
  ): Promise<VehiculosEntity> {
    const placa = await this.verificarVehiculo(CreateVehiculodto.placa);
    const cooperativa = await this.verificarCooperativa(
      CreateVehiculodto.cooperativa_id,
    );

    if (placa) {
      throw new NotFoundException(
        `Vehiculo con placa ${CreateVehiculodto.placa} ya registrado.`,
      );
    }
    const nuevoVehiculo = new VehiculosEntity();
    nuevoVehiculo.placa = CreateVehiculodto.placa;
    nuevoVehiculo.modelo = CreateVehiculodto.modelo;
    nuevoVehiculo.color = CreateVehiculodto.color;
    nuevoVehiculo.anofabricacion = CreateVehiculodto.anofabricacion;
    nuevoVehiculo.cooperativa = cooperativa;
    return this.vehiculoRepository.save(nuevoVehiculo);
  }

  /**
   * Elimina un vehículo. Reutiliza ObtenerVehiculoPorId para asegurar que existe
   * antes de borrarlo.
   */
  async EliminarVehiculo(placa: string): Promise<VehiculosEntity> {
    const vehiculo = await this.ObtenerVehiculoPorId(placa);
    return this.vehiculoRepository.remove(vehiculo);
  }

  /**
   * Actualiza parcialmente un vehículo. Si la placa cambia, se valida que no
   * exista previamente y se actualiza el registro con una consulta directa para
   * reflejar ese cambio de clave (lógica original). Luego carga el vehículo,
   * asigna cooperativa si viene nueva y aplica los demás campos con ??.
   */
  async ActualizarVehiculo(
    placa: string,
    updateVehiculodto: UpdateVehiculoDto,
  ): Promise<VehiculosEntity> {
    // Si viene una nueva placa distinta, se valida unicidad y se renombra primero.
    if (updateVehiculodto.placa && updateVehiculodto.placa !== placa) {
      const placaExiste = await this.verificarVehiculo(updateVehiculodto.placa);
      if (placaExiste) {
        throw new NotFoundException(
          `Vehiculo con placa ${updateVehiculodto.placa} ya registrado.`,
        );
      }

      // Actualización directa de la clave primaria "placa".
      await this.vehiculoRepository.update(placa, {
        placa: updateVehiculodto.placa,
      });
      placa = updateVehiculodto.placa;
    }

    const vehiculo = await this.ObtenerVehiculoPorId(placa);

    // Si cambia la cooperativa, se valida y reasigna la relación.
    if (updateVehiculodto.cooperativa_id) {
      const cooperativa = await this.verificarCooperativa(
        updateVehiculodto.cooperativa_id,
      );
      vehiculo.cooperativa = cooperativa;
      // Se elimina el campo temporal del DTO para no afectar el resto de asignaciones.
      delete updateVehiculodto.cooperativa_id;
    }

    // Asignaciones parciales: solo sobrescriben si el valor viene definido.
    vehiculo.modelo = updateVehiculodto.modelo ?? vehiculo.modelo;
    vehiculo.color = updateVehiculodto.color ?? vehiculo.color;
    vehiculo.anofabricacion =
      updateVehiculodto.anofabricacion ?? vehiculo.anofabricacion;
    return this.vehiculoRepository.save(vehiculo);
  }
}
