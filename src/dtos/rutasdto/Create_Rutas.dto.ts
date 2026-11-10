import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRutasDto {
  @IsString()
  @IsNotEmpty()
  numero_ruta!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @IsInt()
  @IsNotEmpty()
  tarifa!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  cooperativa_id!: string;

  @IsInt()
  @IsNotEmpty()
  origen_id!: number;

  // EL NUEVO CAMPO PARA LAS PARADAS
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  paradas?: number[];
}