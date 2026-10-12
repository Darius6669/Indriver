import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ViajesEntity } from './Viajes.entity';

/**
 * Posicion actual del viaje.
 *
 * UNA sola fila por viaje (id_viaje es unico): el server la actualiza (UPSERT)
 * con el ultimo punto conocido. Ya no es un historial append-only; la tabla
 * `viaje` guarda el viaje y esta guarda donde esta el bus ahora.
 */
@Entity('viaje_ubicacion')
@Index('ux_viaje_ubicacion_viaje', ['id_viaje'], { unique: true })
@Index('idx_viaje_ubicacion_viaje_fecha', ['id_viaje', 'recorded_at'])
export class ViajeUbicacionEntity {
  /** PK autogenerada tipo UUID (columna `id`). */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * FK al viaje (columna `id_viaje`, entero). Junto con la FK `viaje.id_viaje`,
   * esta columna tiene indice UNIQUE para forzar una sola fila por viaje.
   */
  @Column({ type: 'int' })
  @IsNumber()
  @IsNotEmpty()
  id_viaje!: number;

  /** Latitud actual del bus (columna `lactitud`, doble precision). */
  @Column({ type: 'double precision' })
  @IsNumber()
  @IsNotEmpty()
  lactitud!: number;

  /** Longitud actual del bus (columna `longitud`, doble precision). */
  @Column({ type: 'double precision' })
  @IsNumber()
  @IsNotEmpty()
  longitud!: number;

  /** km/h reportado por el GPS del telefono */
  @Column({ type: 'double precision', nullable: true })
  @IsOptional()
  velocidad?: number | null;

  /** grados (0-359), 0 = norte */
  @Column({ type: 'double precision', nullable: true })
  @IsOptional()
  rumbo?: number | null;

  /** radio de precision en metros */
  @Column({ type: 'double precision', nullable: true })
  @IsOptional()
  precision?: number | null;

  /** Momento en que se registro la posicion (columna `recorded_at`, por defecto la hora actual). */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  recorded_at!: Date;

  /**
   * Relacion N:1 con `ViajesEntity`: viaje al que pertenece esta posicion.
   * FK `id_viaje`; al borrar el viaje la fila se elimina en cascada (CASCADE).
   */
  @ManyToOne(() => ViajesEntity, (viaje) => viaje.ubicaciones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_viaje' })
  viaje!: ViajesEntity;
}
