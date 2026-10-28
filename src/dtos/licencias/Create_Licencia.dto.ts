import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Cuerpo para registrar una nueva licencia.
 */
export class CreateLicenciaDto {
  /**
   * Número de la licencia (Ej: "LIC-12345").
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  licencia!: string;

  /**
   * Fecha de vencimiento de la licencia (formato YYYY-MM-DD).
   */
  @IsDateString()
  @IsNotEmpty()
  fechav!: string;

  /**
   * Tipo de licencia.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipo_licencia!: string;

  /**
   * Username del conductor dueño de la licencia.
   */
  @IsString()
  @IsNotEmpty()
  username!: string;
}