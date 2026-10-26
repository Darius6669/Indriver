import { IsISO8601, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Cuerpo para registrar un nuevo vehiculo (bus).
 */
export class CreateVehiculosDto {
  /**
   * Placa del vehiculo.
   * @IsString exige texto; @IsNotEmpty obliga a enviarla; @MaxLength(50)
   * limita a 50 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  placa: string;

  /**
   * Modelo del vehiculo.
   * @IsString exige texto; @IsNotEmpty obliga a enviarlo; @MaxLength(50)
   * limita a 50 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  modelo: string;

  /**
   * Color del vehiculo.
   * @IsString exige texto; @IsNotEmpty obliga a enviarlo; @MaxLength(50)
   * limita a 50 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  color: string;

  /**
   * Ano de fabricacion del vehiculo.
   * @IsISO8601 exige fecha en formato ISO 8601; @IsNotEmpty obliga a
   * enviarla.
   */
  //@IsISO8601()
  @IsNotEmpty()
  anofabricacion: Date;

  /**
   * Cooperativa a la que pertenece el vehiculo.
   * @IsString exige texto; @IsNotEmpty obliga a enviarla; @MaxLength(50)
   * limita a 50 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cooperativa_id: string;
}
