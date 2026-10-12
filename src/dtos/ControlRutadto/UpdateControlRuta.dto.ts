import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Cuerpo para actualizar (parcialmente) un punto de control de ruta.
 * Todos los campos son opcionales: solo se actualiza lo que se envie.
 */
export class updatePuntoControl {
  /**
   * Nuevo nombre del punto de control.
   * @IsOptional permite omitirlo; @IsString y @IsNotEmpty validan que, si
   * viene, sea texto no vacio; @MaxLength(50) limita a 50 caracteres.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50, {
    message: 'El campo tipo_control no debe exceder los 50 caracteres',
  })
  nombre: string;

  /**
   * Nueva descripcion del punto de control.
   * @IsOptional permite omitirlo; @IsString y @IsNotEmpty validan texto
   * no vacio si viene.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  descripcion?: string;

  /**
   * Nueva ubicacion de referencia.
   * @IsOptional permite omitirla; @IsString y @IsNotEmpty validan texto no
   * vacio; @MaxLength(50) limita a 50 caracteres.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: 'La ubicacion  no debe exceder los 50 caracteres' })
  ubicacion?: string;

  /**
   * Nueva latitud del punto.
   * @IsOptional permite omitirla; @IsInt exige entero; @IsNotEmpty la
   * obliga si se envia el campo.
   */
  @IsOptional()
  @IsInt()
  @IsNotEmpty()
  lactitud?: number;

  /**
   * Nueva longitud del punto.
   * @IsOptional permite omitirla; @IsInt exige entero; @IsNotEmpty la
   * obliga si se envia el campo.
   */
  @IsOptional()
  @IsInt()
  @IsNotEmpty()
  longitud?: number;
}
