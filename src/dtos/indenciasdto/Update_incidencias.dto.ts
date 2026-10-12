import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

/**
 * Cuerpo para actualizar (parcialmente) una incidencia.
 * Todos los campos son opcionales.
 */
export class UpdateIncidenciasDto {
  /**
   * Nueva descripcion de la incidencia.
   * @IsString y @IsNotEmpty validan texto no vacio; @MinLength(50)/
   * @MaxLength(500) exigen entre 50 y 500 caracteres; @IsOptional permite
   * omitir el campo.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(50)
  @MaxLength(500)
  @IsOptional()
  descripcion?: string;

  /**
   * Nuevo estado de la incidencia.
   * @IsString y @IsNotEmpty validan texto no vacio; @MinLength(50)/
   * @MaxLength(500) exigen entre 50 y 500 caracteres; @IsOptional permite
   * omitir el campo.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(50)
  @MaxLength(500)
  @IsOptional()
  estado?: string;
}
