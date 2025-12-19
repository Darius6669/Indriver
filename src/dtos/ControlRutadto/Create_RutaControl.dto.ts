import { IsInt, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator'
export class CreateRutaControlDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50,{ message: 'El campo tipo_control no debe exceder los 50 caracteres' })
    nombre : string;

    @IsString()
    @IsNotEmpty()
    descripcion : string;



    @IsString()
    @IsNotEmpty()
    @MaxLength(50,{ message: 'La ubicacion  no debe exceder los 50 caracteres' })
    ubicacion: string;

    @IsInt()
    @IsNotEmpty()
    lactitud: number;
    


    @IsInt()
    @IsNotEmpty()
    longitud: number;
}
