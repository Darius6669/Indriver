import { 
  IsString, 
  IsEmail, 
  IsNotEmpty, 
  MinLength, 
  MaxLength,
  IsInt,
  IsOptional,
  Matches,
  IsBoolean
} from 'class-validator';


export class UpdateUsuarioDTO{  

    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    @MaxLength(50)
    username ?: string;

    @IsString()
    @IsNotEmpty()
    contrasena ?: string;

    @IsString()
    @IsNotEmpty()
    rol ?: string;

    @IsBoolean()
    @IsNotEmpty()
    status ?: boolean;

    @IsString()
    @IsNotEmpty()
    @MaxLength(8)
    @Matches(/^[0-9]+$/, { message: 'La cédula debe contener solo números' })
    cedula_id ?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    cooperativa_id ?: string;

}