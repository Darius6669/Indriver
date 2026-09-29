import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IsEmail, IsNotEmpty, IsOptional, Min, Max } from 'class-validator';
import { VehiculosEntity } from './vehiculos.entity';
import { RutaEntity } from './ruta.entity';
import { IncidenciasEntity } from './Incidencias.entity';
import { UsuariosEntity } from './Usuarios.entity';
import { ViajeUbicacionEntity } from './ViajeUbicacion.entity';

@Entity('viaje')
export class ViajesEntity {
  @PrimaryGeneratedColumn()
  id_viaje!: number;

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

  @Column({ type: 'double precision' })
  @IsNotEmpty()
  lactitud!: number;

  @Column({ type: 'double precision' })
  @IsNotEmpty()
  longitud!: number;

  @ManyToOne(() => UsuariosEntity, (usuario) => usuario.viajes)
  @JoinColumn({ name: 'user_id' })
  usuario!: UsuariosEntity;

  @ManyToOne(() => IncidenciasEntity, (incidencia) => incidencia.viajes, {
    nullable: true,
  })
  @JoinColumn({ name: 'incidencia_id' })
  incidencia?: IncidenciasEntity | null;

  @ManyToOne(() => VehiculosEntity, (vehiculo) => vehiculo.viajes)
  @JoinColumn({ name: 'vehiculo_id' })
  vehiculo!: VehiculosEntity;

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
