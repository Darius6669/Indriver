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

export class UpdateIncidenciasDto{
    @IsString()
    @IsNotEmpty()
    @MinLength(50)
    @MaxLength(500)
    @IsOptional()
    descripcion ?: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(50)
    @MaxLength(500)
    @IsOptional()
    estado ?: string;
}