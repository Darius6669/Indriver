import { IsInt, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator'


export class CreateCooperativaDto {

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @Matches(/^[0-9]+$/, { message: 'La cédula debe contener solo números' })
    rif_cooperativa : string;


    
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    nombre : string;


    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    ubicacion : string;

    @IsString()
    @IsNotEmpty()
    descripcion : string;


    
    @IsString()
    @IsNotEmpty()
    horario : string;

}