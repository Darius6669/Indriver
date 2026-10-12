import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { ViajesEntity } from './Viajes.entity';

/**
 * Incidencia ocurrida durante un viaje (averia, accidente, retraso, etc.).
 *
 * Mapea la tabla `incidencias`. Cada incidencia puede quedar asociada a varios
 * viajes (un viaje tiene como maximo una incidencia, ver ViajesEntity).
 */
@Entity('incidencias')
export class IncidenciasEntity {
  /** PK autogenerada (incidencias_id) de la tabla `incidencias`. */
  @PrimaryGeneratedColumn()
  incidencias_id!: number;

  /** Descripcion detallada del problema (columna `descripcion`, tipo texto). */
  @Column({ type: 'text' })
  @IsNotEmpty()
  descripcion!: string;

  /** Estado actual de la incidencia (columna `estado`, max 50 caracteres). */
  @Column({ type: 'varchar', length: 50 })
  @IsNotEmpty()
  estado!: string;

  /**
   * Relacion 1:N con `ViajesEntity`: viajes afectados por esta incidencia
   * (FK `viaje.incidencia_id`). Lado inverso de esa FK.
   */
  @OneToMany(() => ViajesEntity, (viaje) => viaje.incidencia)
  viajes!: ViajesEntity[];
}
