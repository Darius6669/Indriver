import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Cuerpo para actualizar (parcialmente) un vehiculo.
 * Todos los campos son opcionales.
 */
export class UpdateVehiculoDto {
  /**
   * Nueva placa.
   * @IsOptional permite omitirla; @IsString y @IsNotEmpty validan texto no
   * vacio; @MaxLength(50) limita a 50 caracteres.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  placa?: string;

  /**
   * Nuevo modelo.
   * @IsOptional permite omitirlo; @IsString y @IsNotEmpty validan texto no
   * vacio; @MaxLength(50) limita a 50 caracteres.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  modelo?: string;

  /**
   * Nuevo color.
   * @IsOptional permite omitirlo; @IsString y @IsNotEmpty validan texto no
   * vacio; @MaxLength(50) limita a 50 caracteres.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  color?: string;

  /**
   * Nuevo ano de fabricacion.
   * @IsISO8601 exige fecha ISO 8601; @IsOptional permite omitirla;
   * @IsNotEmpty la obliga si se envia el campo.
   */
  @IsISO8601()
  @IsOptional()
  @IsNotEmpty()
  anofabricacion?: Date;

  /**
   * Nueva cooperativa asociada.
   * @IsOptional permite omitirla; @IsString y @IsNotEmpty validan texto no
   * vacio; @MaxLength(50) limita a 50 caracteres.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cooperativa_id?: string;
}
