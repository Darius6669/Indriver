import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { RutaEntity } from './ruta.entity';

/**
 * Punto de control / parada que sirve como origen de una o varias rutas.
 *
 * Mapea la tabla `rutacontrol`. Cada registro representa una ubicacion fisica
 * (parada, terminal, hito) desde la cual puede arrancar una ruta.
 */
@Entity('rutacontrol')
export class ControlRutaEntity {
  /** PK autogenerada (id_control) de la tabla `rutacontrol`. */
  @PrimaryGeneratedColumn()
  id_control!: number;

  /** Nombre corto del punto de control (columna `nombre`, max 50 caracteres). */
  @Column({ type: 'varchar', length: 50 })
  @IsNotEmpty()
  nombre!: string;

  /** Descripcion libre del punto de control (columna `descripcion`, texto sin limite). */
  @Column({ type: 'varchar' })
  @IsNotEmpty()
  descripcion!: string;

  /** Referencia textual de la ubicacion (columna `ubicacion`, max 50 caracteres). */
  @Column({ type: 'varchar', length: 50 })
  @IsNotEmpty()
  ubicacion!: string;

  /** Latitud del punto de control (columna `lactitud`, doble precision). */
  @Column({ type: 'double precision' })
  @IsNotEmpty()
  lactitud!: number;

  /** Longitud del punto de control (columna `longitud`, doble precision). */
  @Column({ type: 'double precision' })
  @IsNotEmpty()
  longitud!: number;

  /**
   * Relacion 1:N con `RutaEntity`: un punto de control puede ser el origen
   * (`ruta.origen_id`) de muchas rutas. Lado inverso de la FK definida en RutaEntity.
   */
  @OneToMany(() => RutaEntity, (ruta) => ruta.origen)
  rutaOrigen!: RutaEntity[];
}
