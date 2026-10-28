import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IsNotEmpty } from 'class-validator';
import { ViajesEntity } from './Viajes.entity';
import { PersonaEntity } from './persona.entity';
import { CooperativaEntity } from './cooperativa.entity';
import { LicenciaEntity } from './Licencia.entity';
import { Exclude } from 'class-transformer';

/**
 * Cuenta de acceso al sistema (credenciales + rol).
 *
 * Mapea la tabla `usuario`. Se vincula 1:1 con una persona (datos civiles),
 * pertenece a una cooperativa y puede tener muchos viajes asociados.
 */
@Entity('usuario')
export class UsuariosEntity {
  /** PK autogenerada (user_id) de la tabla `usuario`. */
  @PrimaryGeneratedColumn()
  user_id!: number;

  /** Nombre de usuario para login (columna `username`, max 50 caracteres). */
  @Column()
  username!: string;

  @Column()
  @Exclude() //
  contrasena!: string;

  @Column()
  status!: boolean;

  @Column()
  @Exclude() //
  rol!: string;

  /**
   * Relacion 1:N con `ViajesEntity`: viajes del usuario (FK `viaje.user_id`).
   * Lado inverso de esa FK.
   */
  @OneToMany(() => ViajesEntity, (viaje) => viaje.usuario)
  viajes!: ViajesEntity[];

  /**
   * Relacion 1:1 con `PersonaEntity`: datos personales del usuario.
   * FK `cedula_id` en esta tabla (columna de union).
   */
  @OneToOne(() => PersonaEntity, (persona) => persona.usuarios)
  @JoinColumn({ name: 'cedula_id' })
  persona!: PersonaEntity;

  /**
   * Relacion N:1 con `CooperativaEntity`: cooperativa a la que pertenece el
   * usuario. FK `cooperativa_id` en esta tabla.
   */
  @ManyToOne(() => CooperativaEntity, (cooperativa) => cooperativa.usuarios)
  @JoinColumn({ name: 'cooperativa_id' })
  cooperativa!: CooperativaEntity;

  /**
   * Relacion 1:N con `LicenciaEntity`: licencias que posee este usuario.
   */
  @OneToMany(() => LicenciaEntity, (licencia) => licencia.usuario)
  licencias!: LicenciaEntity[];
}
