import { IsDateString, IsOptional } from 'class-validator';

export class UpdateAsignacionDto {
  @IsDateString()
  @IsOptional()
  fecha_fin_asignacion?: string;
}