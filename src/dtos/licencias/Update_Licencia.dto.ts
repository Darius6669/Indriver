import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Cuerpo para actualizar (parcialmente) una licencia.
 */
export class UpdateLicenciaDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  licencia?: string;

  @IsDateString()
  @IsOptional()
  fechav?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  tipo_licencia?: string;

  @IsString()
  @IsOptional()
  username?: string;
}