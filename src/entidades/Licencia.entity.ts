import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UsuariosEntity } from './Usuarios.entity'; // Ajusta la ruta si es necesario

/**
 * Licencia de conducir de un usuario.
 * Mapea la tabla `licencia`.
 */
@Entity('licencia')
export class LicenciaEntity {
  /** PK natural de la licencia. */
  @PrimaryColumn({ type: 'varchar', length: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  licencia!: string;

  /** Fecha de vencimiento de la licencia. */
  @Column({ type: 'date' })
  @IsDateString()
  @IsNotEmpty()
  fechav!: string; // Lo dejamos como string para facilitar el manejo en JSON

  /** Tipo de licencia (Ej: "5ta", "4ta"). */
  @Column({ type: 'varchar', length: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipo_licencia!: string;

  /**
   * Relacion N:1 con `UsuariosEntity`: usuario duenio de la licencia.
   * FK `user_id` en esta tabla.
   */
  @ManyToOne(() => UsuariosEntity, (usuario) => usuario.licencias) // Si tienes la relacion inversa en Usuarios, la pones aqui
  @JoinColumn({ name: 'user_id' })
  usuario!: UsuariosEntity;
}