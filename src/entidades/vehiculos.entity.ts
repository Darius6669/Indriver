import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { CooperativaEntity } from './cooperativa.entity';
import { ViajesEntity } from './Viajes.entity';

/**
 * Vehiculo (unidad) de la flota de una cooperativa.
 *
 * Mapea la tabla `vehiculos`. Su PK es la placa. Pertenece a una cooperativa
 * y puede ejecutar muchos viajes.
 */
@Entity('vehiculos')
export class VehiculosEntity {
  /** PK natural (placa, max 50 caracteres); identifica el vehiculo. */
  @PrimaryColumn({ type: 'varchar', length: 50 })
  @IsNotEmpty()
  placa!: string;

  /** Modelo del vehiculo (columna `modelo`, max 50 caracteres). */
  @Column({ type: 'varchar', length: 50 })
  @IsNotEmpty()
  modelo!: string;

  /** Color del vehiculo (columna `color`, max 50 caracteres). */
  @Column({ type: 'varchar', length: 50 })
  @IsNotEmpty()
  color!: string;

  /** Fecha de fabricacion (columna `anofabricacion`, timestamp). */
  @Column({ type: 'timestamp' })
  @IsNotEmpty()
  anofabricacion!: Date;

  /**
   * Relacion N:1 con `CooperativaEntity`: cooperativa duenia del vehiculo.
   * FK `cooperativa_id` en esta tabla.
   */
  @ManyToOne(() => CooperativaEntity, (cooperativa) => cooperativa.unidad)
  @JoinColumn({ name: 'cooperativa_id' })
  cooperativa!: CooperativaEntity;

  /**
   * Relacion 1:N con `ViajesEntity`: viajes realizados con este vehiculo
   * (FK `viaje.vehiculo_id`). Lado inverso de esa FK.
   */
  @OneToMany(() => ViajesEntity, (viaje) => viaje.vehiculo)
  viajes!: ViajesEntity[];
}
