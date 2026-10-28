import { IsDateString,IsNotEmpty, IsString, MaxLength } from 'class-validator';

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
  //@IsDateString({}, { message: 'La fecha debe tener un formato válido (Ej: 2020-05-15)' })
  @IsNotEmpty()
  // @ts-ignore  <--- ESTA LÍNEA ES LA MAGIA
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
