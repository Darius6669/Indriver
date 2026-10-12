import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsInt,
  IsOptional,
  IsDate,
  IsNumber,
} from 'class-validator';

/**
 * Cuerpo para actualizar (parcialmente) un viaje.
 * Todos los campos son opcionales.
 */
export class UpdateViajesDto {
  /**
   * Identificador del viaje.
   * @IsInt exige entero; @IsOptional permite omitirlo.
   */
  @IsInt()
  @IsOptional()
  id_viaje?: number;

  /**
   * Nueva fecha de inicio.
   * @IsDate exige fecha valida; @IsNotEmpty y @IsOptional permiten
   * omitirla.
   */
  @IsDate()
  @IsNotEmpty()
  @IsOptional()
  fecha_inicio?: Date;

  /**
   * Nueva fecha de finalizacion.
   * @IsDate exige fecha valida; @IsOptional permite omitirla.
   */
  @IsDate()
  @IsOptional()
  fecha_final?: Date;

  /**
   * Nueva latitud.
   * @IsNumber exige numero; @IsNotEmpty y @IsOptional permiten omitirla.
   */
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  lactitud?: number;

  /**
   * Nueva longitud.
   * @IsInt exige entero; @IsNotEmpty y @IsOptional permiten omitirla.
   */
  @IsInt()
  @IsNotEmpty()
  @IsOptional()
  longitud?: number;

  /**
   * Nuevo usuario asociado.
   * @IsNumber exige numero; @IsNotEmpty y @IsOptional permiten omitirlo.
   */
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  usuario?: number;

  /**
   * Nuevo vehiculo asociado.
   * @IsString exige texto; @IsNotEmpty y @IsOptional permiten omitirlo;
   * @MinLength(10)/@MaxLength(100) exigen entre 10 y 100 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(100)
  @IsOptional()
  id_vehiculo?: string;

  /**
   * Nueva ruta asociada.
   * @IsString exige texto; @IsNotEmpty y @IsOptional permiten omitirla;
   * @MinLength(10)/@MaxLength(100) exigen entre 10 y 100 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(100)
  @IsOptional()
  id_ruta?: string;

  /**
   * Nueva incidencia asociada.
   * @IsInt exige entero; @IsNotEmpty y @IsOptional permiten omitirla.
   */
  @IsInt()
  @IsNotEmpty()
  @IsOptional()
  incidencia_id?: number;
}
