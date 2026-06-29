import { 
  IsString, 
  IsEmail, 
  IsNotEmpty, 
  MinLength, 
  MaxLength,
  IsInt,
  IsOptional,
  Matches,
  IsDate,
  IsNumber
} from 'class-validator';

export class UpdateViajesDto{
    @IsInt()
    @IsOptional()
    id_viaje ?: number;

    @IsDate()
    @IsNotEmpty()
    @IsOptional()
    fecha_inicio ?: Date;

    @IsDate()
    @IsOptional()
    fecha_final ?: Date;

    @IsNumber()
    @IsNotEmpty()
    @IsOptional()
    lactitud ?: number;

    @IsInt()
    @IsNotEmpty()
    @IsOptional()
    longitud ?: number;

    @IsNumber()
    @IsNotEmpty()
    @IsOptional()
    usuario ?: number;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(100)
    @IsOptional()
    id_vehiculo ?: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(100)
    @IsOptional()
    id_ruta ?: string;


    @IsInt()
    @IsNotEmpty()
    @IsOptional()
    incidencia_id ?: number;

}
