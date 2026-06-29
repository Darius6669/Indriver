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

export class CreateViajesDto{
    @IsInt()
    id_viaje !: number;

    @IsDate()
    @IsNotEmpty()
    fecha_inicio !: Date;

    @IsDate()
    @IsOptional()
    fecha_final !: Date;

    @IsNumber()
    @IsNotEmpty()
    lactitud !: number;

    @IsNumber()
    @IsNotEmpty()
    longitud !: number;

    @IsNumber()
    @IsNotEmpty()
    id_user !: number;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(100)
    id_vehiculo !: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(100)
    id_ruta !: string;


    @IsNumber()
    @IsNotEmpty()
    @IsOptional()
    incidencia_id ?: number | null;;

}