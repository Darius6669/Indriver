import { IsOptional, IsString, IsNumber, IsNotEmpty } from 'class-validator';

/**
 * Cuerpo para actualizar (parcialmente) una ruta.
 * Todos los campos son opcionales.
 */
export class UpdateRutaDto {
  /**
   * Nuevo numero de ruta.
   * @IsOptional permite omitirlo; @IsNotEmpty lo obliga si se envia.
   */
  @IsOptional()
  @IsNotEmpty()
  numero_ruta?: string;

  /**
   * Nuevo nombre de la ruta.
   * @IsOptional permite omitirlo; @IsString y @IsNotEmpty validan texto no
   * vacio.
   */
  @IsOptional()
  @IsString()
  nombre?: string;

  /**
   * Nueva descripcion de la ruta.
   * @IsOptional permite omitirla; @IsString y @IsNotEmpty validan texto no
   * vacio.
   */
  @IsOptional()
  @IsString()
  descripcion?: string;

  /**
   * Nueva tarifa.
   * @IsOptional permite omitirla; @IsNumber exige numero.
   */
  @IsOptional()
  @IsNumber()
  tarifa?: number;

  /**
   * Nuevo punto de origen.
   * @IsOptional permite omitirlo; @IsNumber exige numero.
   */
  @IsOptional()
  @IsNumber()
  origen_id?: number;

  /**
   * Nueva cooperativa asociada.
   * @IsOptional permite omitirla; @IsString exige texto.
   */
  @IsOptional()
  @IsString()
  cooperativa_id?: string;
}
