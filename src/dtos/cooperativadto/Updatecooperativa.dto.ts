import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Cuerpo para actualizar (parcialmente) una cooperativa.
 * Todos los campos son opcionales.
 */
export class UpdateCooperativaDto {
  /**
   * Nuevo RIF de la cooperativa.
   * @IsOptional permite omitirlo; @IsString y @IsNotEmpty validan texto no
   * vacio; @MaxLength(50) limita a 50 caracteres; @Matches(^[0-9]+$) exige
   * solo digitos.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[0-9]+$/, { message: 'La cédula debe contener solo números' })
  rif_cooperativa?: string;

  /**
   * Nuevo nombre de la cooperativa.
   * @IsOptional permite omitirlo; @IsString y @IsNotEmpty validan texto no
   * vacio; @MaxLength(50) limita a 50 caracteres.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nombre?: string;

  /**
   * Nueva ubicacion de la cooperativa.
   * @IsOptional permite omitirla; @IsString y @IsNotEmpty validan texto no
   * vacio; @MaxLength(50) limita a 50 caracteres.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  ubicacion?: string;

  /**
   * Nueva descripcion de la cooperativa.
   * @IsOptional permite omitirla; @IsString y @IsNotEmpty validan texto no
   * vacio.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  descripcion?: string;

  /**
   * Nuevo horario de operacion.
   * @IsOptional permite omitirlo; @IsString y @IsNotEmpty validan texto no
   * vacio.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  horario?: string;
}
