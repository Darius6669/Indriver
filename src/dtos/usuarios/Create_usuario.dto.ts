import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsInt,
  Matches,
  IsBoolean,
} from 'class-validator';

/**
 * Cuerpo para crear un usuario del sistema.
 */
export class CreateUsuarioDTO {
  /**
   * Identificador del usuario.
   * @IsInt exige entero y @IsNotEmpty obliga a enviarlo.
   */
  @IsInt()
  @IsNotEmpty()
  id_usuario!: number;

  /**
   * Nombre de usuario para iniciar sesion.
   * @IsString exige texto; @IsNotEmpty obliga a enviarlo;
   * @MinLength(5)/@MaxLength(50) exigen entre 5 y 50 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(50)
  username!: string;

  /**
   * Contrasena del usuario.
   * @IsString exige texto y @IsNotEmpty obliga a enviarla.
   */
  @IsString()
  @IsNotEmpty()
  contrasena!: string;

  /**
   * Rol o perfil de permisos (ej. "admin", "conductor").
   * @IsString exige texto y @IsNotEmpty obliga a enviarlo.
   */
  @IsString()
  @IsNotEmpty()
  rol!: string;

  /**
   * Estado activo/inactivo del usuario.
   * @IsBoolean exige booleano y @IsNotEmpty obliga a enviarlo.
   */
  @IsBoolean()
  @IsNotEmpty()
  status!: boolean;

  /**
   * Cedula de la persona asociada al usuario.
   * @IsString exige texto; @IsNotEmpty obliga a enviarla; @MaxLength(8)
   * limita a 8 caracteres; @Matches(^[0-9]+$) exige solo digitos.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  @Matches(/^[0-9]+$/, { message: 'La cédula debe contener solo números' })
  cedula_id!: string;

  /**
   * Cooperativa a la que pertenece el usuario.
   * @IsString exige texto; @IsNotEmpty obliga a enviarla; @MaxLength(50)
   * limita a 50 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cooperativa_id!: string;
}
