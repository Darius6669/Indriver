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
 * Historial append-only de ubicaciones de un viaje.
 *
 * Se separa de la tabla `viaje` a proposito: `viaje.lactitud/longitud` guarda
 * solo la ULTIMA posicion conocida y se refresca cada ~30s, mientras que aqui
 * cae un INSERT por cada punto recibido (batcheado) para poder reconstruir la
 * polilinea del recorrido.
 */
@Entity('viaje_ubicacion')
@Index('idx_viaje_ubicacion_viaje_fecha', ['id_viaje', 'recorded_at'])
export class ViajeUbicacionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int' })
  @IsNumber()
  @IsNotEmpty()
  id_viaje!: number;

  @Column({ type: 'double precision' })
  @IsNumber()
  @IsNotEmpty()
  lactitud!: number;

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

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  recorded_at!: Date;

  @ManyToOne(() => ViajesEntity, (viaje) => viaje.ubicaciones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_viaje' })
  viaje!: ViajesEntity;
}
