import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator'
export class updatePuntoControl {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50,{ message: 'El campo tipo_control no debe exceder los 50 caracteres' })
    nombre : string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    descripcion ?: string;


    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50,{ message: 'La ubicacion  no debe exceder los 50 caracteres' })
    ubicacion ?: string;


    @IsOptional()
    @IsInt()
    @IsNotEmpty()
    lactitud ?: number;
    

    @IsOptional()
    @IsInt()
    @IsNotEmpty()
    longitud ?: number;
}