import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { RutaEntity } from './ruta.entity';
import { VehiculosEntity } from './vehiculos.entity';
import { UsuariosEntity } from './Usuarios.entity';

/**
 * Cooperativa de transporte: agrupa rutas, vehiculos y usuarios.
 *
 * Mapea la tabla `cooperativa`. Es la entidad raiz de la jerarquia operativa:
 * cada cooperativa posee sus propias rutas, unidades (vehiculos) y usuarios.
 */
@Entity('cooperativa')
export class CooperativaEntity {
  /** PK natural (rif_cooperativa, max 50 caracteres); el RIF identifica la cooperativa. */
  @PrimaryColumn({ type: 'varchar', length: 50 })
  @IsNotEmpty()
  rif_cooperativa!: string;

  /** Nombre de la cooperativa (columna `nombre`, max 50 caracteres). */
  @Column({ type: 'varchar', length: 50 })
  @IsNotEmpty()
  nombre!: string;

  /** Ubicacion o sede de la cooperativa (columna `ubicacion`, max 100 caracteres). */
  @Column({ type: 'varchar', length: 100 })
  @IsNotEmpty()
  ubicacion!: string;

  /** Descripcion libre (columna `descripcion`, texto sin limite). */
  @Column({ type: 'varchar' })
  @IsNotEmpty()
  descripcion!: string;

  /** Horario de operacion (columna `horario`, texto sin limite). */
  @Column({ type: 'varchar' })
  @IsNotEmpty()
  horario!: string;

  /**
   * Relacion 1:N con `RutaEntity`: todas las rutas que pertenecen a esta
   * cooperativa (FK `ruta.cooperativa_id`). Lado inverso de esa FK.
   */
  @OneToMany(() => RutaEntity, (ruta) => ruta.cooperativa)
  rutas!: RutaEntity[];

  /**
   * Relacion 1:N con `VehiculosEntity`: flota de unidades de la cooperativa
   * (FK `vehiculos.cooperativa_id`). Lado inverso de esa FK.
   */
  @OneToMany(() => VehiculosEntity, (vehiculo) => vehiculo.cooperativa)
  unidad!: VehiculosEntity[];

  /**
   * Relacion 1:N con `UsuariosEntity`: usuarios (conductores, admins, etc.)
   * que pertenecen a la cooperativa (FK `usuario.cooperativa_id`).
   */
  @OneToMany(() => UsuariosEntity, (usuario) => usuario.cooperativa)
  usuarios!: UsuariosEntity[];
}
