import {
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * Cuerpo para crear una nueva ruta de transporte.123123
 */
export class CreateRutasDto {
  // Define las propiedades necesarias para la creación de una ruta

  /**
   * Numero identificador de la ruta.
   * @IsInt exige entero y @IsNotEmpty obliga a enviarlo.
   * Nota: el tipo declarado es string aunque la validacion pida entero.
   */
  @IsString()
  @IsNotEmpty()
  numero_ruta!: string;

  /**
   * Nombre de la ruta.
   * @IsString exige texto; @IsNotEmpty obliga a enviarlo; @MaxLength(50)
   * limita a 50 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nombre!: string;

  /**
   * Descripcion del recorrido de la ruta.
   * @IsString exige texto y @IsNotEmpty obliga a enviarla.
   */
  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  /**
   * Tarifa o precio del pasaje.
   * @IsInt exige entero y @IsNotEmpty obliga a enviarla.
   */
  @IsInt()
  @IsNotEmpty()
  tarifa!: number;

  /**
   * Identificador de la cooperativa duena de la ruta.
   * @IsString exige texto; @IsNotEmpty obliga a enviarlo; @MaxLength(50)
   * limita a 50 caracteres; @Matches(^[0-9]+$) exige solo digitos.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[A-Za-z]-\d+-[0-9A-Za-z]$/, { message: 'La cédula debe contener solo letras y números' })
  cooperativa_id!: string;

  /**
   * Identificador del punto de origen de la ruta.
   * @IsInt exige entero y @IsNotEmpty obliga a enviarlo.
   */
  @IsInt()
  @IsNotEmpty()
  origen_id!: number;
}
