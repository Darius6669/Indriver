import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsBoolean,
} from 'class-validator';

/**
 * Cuerpo para actualizar (parcialmente) un usuario.
 * Todos los campos son opcionales.
 */
export class UpdateUsuarioDTO {
  /**
   * Nuevo nombre de usuario.
   * @IsString y @IsNotEmpty validan texto no vacio; @MinLength(5)/
   * @MaxLength(50) exigen entre 5 y 50 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(50)
  username?: string;

  /**
   * Nueva contrasena.
   * @IsString y @IsNotEmpty validan texto no vacio.
   */
  @IsString()
  @IsNotEmpty()
  contrasena?: string;

  /**
   * Nuevo rol.
   * @IsString y @IsNotEmpty validan texto no vacio.
   */
  @IsString()
  @IsNotEmpty()
  rol?: string;

  /**
   * Nuevo estado activo/inactivo.
   * @IsBoolean exige booleano y @IsNotEmpty lo obliga si se envia.
   */
  @IsBoolean()
  @IsNotEmpty()
  status?: boolean;

  /**
   * Nueva cedula asociada.
   * @IsString y @IsNotEmpty validan texto no vacio; @MaxLength(8) limita a
   * 8 caracteres; @Matches(^[0-9]+$) exige solo digitos.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  @Matches(/^[0-9]+$/, { message: 'La cédula debe contener solo números' })
  cedula_id?: string;

  /**
   * Nueva cooperativa asociada.
   * @IsString y @IsNotEmpty validan texto no vacio; @MaxLength(50) limita a
   * 50 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cooperativa_id?: string;
}
