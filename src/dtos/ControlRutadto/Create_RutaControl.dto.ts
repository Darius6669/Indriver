import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Cuerpo para crear un punto de control de ruta (checkpoint).
 * Representa un lugar fisico por donde pasa una ruta.
 */
export class CreateRutaControlDto {
  /**
   * Nombre del punto de control.
   * @IsString exige texto; @IsNotEmpty obliga a enviarlo; @MaxLength(50)
   * limita su longitud a 50 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50, {
    message: 'El campo tipo_control no debe exceder los 50 caracteres',
  })
  nombre: string;

  /**
   * Descripcion libre del punto de control.
   * @IsString exige texto y @IsNotEmpty obliga a enviarlo.
   */
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  /**
   * Ubicacion de referencia del punto (texto legible).
   * @IsString exige texto; @IsNotEmpty obliga a enviarlo; @MaxLength(50)
   * limita su longitud a 50 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: 'La ubicacion  no debe exceder los 50 caracteres' })
  ubicacion: string;

  /**
   * Latitud del punto de control.
   * @IsInt exige un numero entero (no admite decimales) y @IsNotEmpty
   * obliga a enviarlo.
   */
  @IsInt()
  @IsNotEmpty()
  lactitud: number;

  /**
   * Longitud del punto de control.
   * @IsInt exige un numero entero y @IsNotEmpty obliga a enviarlo.
   */
  @IsInt()
  @IsNotEmpty()
  longitud: number;
}
