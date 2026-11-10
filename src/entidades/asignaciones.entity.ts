import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { RutaEntity } from './ruta.entity';
import { UsuariosEntity } from './Usuarios.entity';
import { ViajesEntity } from './Viajes.entity';
import { VehiculosEntity } from './vehiculos.entity';

/**
 * Tabla intermedia que registra la asignación de un vehículo y un conductor 
 * a una ruta y un viaje específico.
 */
@Entity('asignacion')
export class AsignacionEntity {
  /** PK autogenerada (id_asignacion) de la tabla `asignacion`. */
  @PrimaryGeneratedColumn()
  id_asignacion!: number;

  /** Fecha en la que se realizó la asignación. */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @IsNotEmpty()
  fecha_asignacion!: Date;

  /** Fecha en la que terminó la asignación (null si sigue activa). */
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  fecha_fin_asignacion!: Date | null;

  // ==================================================================
  // RELACIONES (Protegidas contra borrados accidentales)
  // ==================================================================

  /** Relación N:1 con RutaEntity (FK ruta_id). */
  @ManyToOne(() => RutaEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ruta_id' })
  ruta!: RutaEntity;

  /** Relación N:1 con UsuariosEntity (FK user_id). */
  @ManyToOne(() => UsuariosEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  usuario!: UsuariosEntity;

  /** Relación N:1 con ViajesEntity (FK id_viaje). */
  @ManyToOne(() => ViajesEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_viaje' })
  viaje!: ViajesEntity;

  /** Relación N:1 con VehiculosEntity (FK vehiculo_placa). */
  @ManyToOne(() => VehiculosEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vehiculo_placa' })
  vehiculo!: VehiculosEntity;
}