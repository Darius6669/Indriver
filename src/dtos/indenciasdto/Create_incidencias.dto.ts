import { 
  IsString, 
  IsEmail, 
  IsNotEmpty, 
  MinLength, 
  MaxLength,
  IsInt,
  IsOptional,
  Matches
} from 'class-validator';

export class CreateIncidenciasDto{

    @IsInt()
    @IsNotEmpty()
    id_incidencias !: number;




    @IsString()
    @IsNotEmpty()
    @MinLength(50)
    @MaxLength(500)
    descripcion !: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(50)
    @MaxLength(500)
    estado !: string;
}