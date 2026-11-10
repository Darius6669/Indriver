import { IsArray, IsInt, IsOptional, IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class UpdateRutaDto {
  @IsOptional()
  @IsNotEmpty()
  numero_ruta?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsNumber()
  tarifa?: number;

  @IsOptional()
  @IsNumber()
  origen_id?: number;

  @IsOptional()
  @IsString()
  cooperativa_id?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  paradas?: number[];
}