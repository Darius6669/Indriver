import { Column, Entity, OneToOne, PrimaryColumn } from 'typeorm';
import { IsEmail, IsNotEmpty, Min, Max } from 'class-validator';
import { UsuariosEntity } from './Usuarios.entity';

/**
 * Datos personales de una persona (identidad civil).
 *
 * Mapea la tabla `persona`. Se separa de `usuario` para no mezclar credenciales
 * de acceso con la informacion personal. Su PK es la cedula.
 */
@Entity('persona')
export class PersonaEntity {
  /** PK natural (cedula, max 50 caracteres). Identifica a la persona. */
  @PrimaryColumn({ type: 'varchar', length: 50 })
  @IsNotEmpty()
  cedula!: string;

  /** Nombre de la persona (columna `nombre`, max 50 caracteres). */
  @Column({ type: 'varchar', length: 50 })
  @IsNotEmpty()
  nombre!: string;

  /** Apellido de la persona (columna `apellido`, max 50 caracteres). */
  @Column({ type: 'varchar', length: 50 })
  @IsNotEmpty()
  apellido!: string;

  /** Correo electronico validado (columna `email`, max 50 caracteres). */
  @Column({ type: 'varchar', length: 50 })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  /** Telefono de contacto (columna `telefono`, max 12 caracteres). */
  @Column({ type: 'varchar', length: 12 })
  @IsNotEmpty()
  telefono!: string;

  /** Edad en anios entre 18 y 130 (columna `edad`, entero). */
  @Column({ type: 'int' })
  @IsNotEmpty()
  @Min(18)
  @Max(130)
  edad!: number;

  /**
   * Relacion 1:1 inversa con `UsuariosEntity`: la persona puede tener una cuenta
   * de usuario. La FK (`cedula_id`) vive en la tabla `usuario`.
   */
  @OneToOne(() => UsuariosEntity, (usuario) => usuario.persona)
  usuarios!: UsuariosEntity;
}
