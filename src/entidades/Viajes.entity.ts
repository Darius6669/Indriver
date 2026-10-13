import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { VehiculosEntity } from './vehiculos.entity';
import { RutaEntity } from './ruta.entity';
import { IncidenciasEntity } from './Incidencias.entity';
import { UsuariosEntity } from './Usuarios.entity';
import { ViajeUbicacionEntity } from './ViajeUbicacion.entity';

/**
 * Viaje: ejecucion concreta de una ruta por un conductor con un vehiculo.
 *
 * Mapea la tabla `viaje`. Enlaza usuario, vehiculo, ruta e (opcionalmente) una
 * incidencia. La posicion inicial del viaje se guarda aqui; la ultima posicion
 * conocida se actualiza en `viaje_ubicacion`.
 */
@Entity('viaje')
export class ViajesEntity {
  /** PK autogenerada (id_viaje) de la tabla `viaje`. */
  @PrimaryGeneratedColumn()
  id_viaje!: number;

  /** Fecha/hora de inicio del viaje (columna `fecha_inicio`, timestamp). */
  @Column({ type: 'timestamp' })
  @IsNotEmpty()
  fecha_inicio!: Date;

  /**
   * NULL mientras el viaje sigue en curso. Es la forma de consultar los viajes
   * activos: `WHERE fecha_final IS NULL`. Requiere el ALTER TABLE del script
   * sql/001_crear_viaje_ubicacion.sql.
   */
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  fecha_final!: Date | null;

  /** Latitud del punto inicial del viaje (columna `lactitud`, doble precision). */
  @Column({ type: 'double precision' })
  @IsNotEmpty()
  lactitud!: number;

  /** Longitud del punto inicial del viaje (columna `longitud`, doble precision). */
  @Column({ type: 'double precision' })
  @IsNotEmpty()
  longitud!: number;

  /**
   * Relacion N:1 con `UsuariosEntity`: conductor/usuario que realiza el viaje.
   * FK `user_id` en esta tabla.
   */
  @ManyToOne(() => UsuariosEntity, (usuario) => usuario.viajes)
  @JoinColumn({ name: 'user_id' })
  usuario!: UsuariosEntity;

  /**
   * Relacion N:1 opcional con `IncidenciasEntity`: incidencia asociada al viaje.
   * FK `incidencia_id` (nullable) en esta tabla.
   */
  @ManyToOne(() => IncidenciasEntity, (incidencia) => incidencia.viajes, {
    nullable: true,
  })
  @JoinColumn({ name: 'incidencia_id' })
  incidencia?: IncidenciasEntity | null;

  /**
   * Relacion N:1 con `VehiculosEntity`: vehiculo usado en el viaje.
   * FK `vehiculo_id` en esta tabla.
   */
  @ManyToOne(() => VehiculosEntity, (vehiculo) => vehiculo.viajes)
  @JoinColumn({ name: 'vehiculo_id' })
  vehiculo!: VehiculosEntity;

  /**
   * Relacion N:1 con `RutaEntity`: ruta que se esta ejecutando.
   * FK `ruta_id` (ahora INTEGER) en esta tabla.
   */
  @ManyToOne(() => RutaEntity, (ruta) => ruta.viajes)
  @JoinColumn({ name: 'ruta_id' })
  ruta!: RutaEntity;

  /**
   * Historial completo del recorrido. La ultima posicion conocida vive en
   * lactitud/longitud de esta misma fila; aqui queda la traza.
   */
  @OneToMany(() => ViajeUbicacionEntity, (ubicacion) => ubicacion.viaje)
  ubicaciones!: ViajeUbicacionEntity[];
}