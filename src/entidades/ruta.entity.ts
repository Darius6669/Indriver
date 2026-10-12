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
import { ControlRutaEntity } from './ControlRuta.entity';
import { ViajesEntity } from './Viajes.entity';

/**
 * Ruta de transporte ofrecida por una cooperativa.
 *
 * Mapea la tabla `ruta`. Cada ruta pertenece a una cooperativa y tiene un punto
 * de origen (control de ruta). Los viajes se ejecutan sobre una ruta.
 */
@Entity('ruta')
export class RutaEntity {
  /** PK natural (numero_ruta, max 50 caracteres); identifica la ruta. */
  @PrimaryColumn({ type: 'varchar', length: 50 })
  @IsNotEmpty()
  numero_ruta!: string;

  /** Nombre de la ruta (columna `nombre`, max 50 caracteres). */
  @Column({ type: 'varchar', length: 50 })
  @IsNotEmpty()
  nombre!: string;

  /** Descripcion del recorrido (columna `descripcion`, tipo texto). */
  @Column({ type: 'text' })
  @IsNotEmpty()
  descripcion!: string;

  /** Tarifa del pasaje en la ruta (columna `tarifa`, entero). */
  @Column({ type: 'int' })
  @IsNotEmpty()
  tarifa!: number;

  /**
   * Relacion N:1 con `CooperativaEntity`: cooperativa duenia de la ruta.
   * FK `cooperativa_id` en esta tabla.
   */
  @ManyToOne(() => CooperativaEntity, (cooperativa) => cooperativa.rutas)
  @JoinColumn({ name: 'cooperativa_id' })
  cooperativa!: CooperativaEntity;

  /**
   * Relacion N:1 con `ControlRutaEntity`: punto de origen de la ruta.
   * FK `origen_id` en esta tabla.
   */
  @ManyToOne(() => ControlRutaEntity, (controlruta) => controlruta.rutaOrigen)
  @JoinColumn({ name: 'origen_id' })
  origen!: ControlRutaEntity;

  /**
   * Relacion 1:N con `ViajesEntity`: viajes realizados sobre esta ruta
   * (FK `viaje.ruta_id`). Lado inverso de esa FK.
   */
  @OneToMany(() => ViajesEntity, (viaje) => viaje.ruta)
  viajes!: ViajesEntity[];
}
