import { IsInt, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator'

export class CreateRutasDto {
// Define las propiedades necesarias para la creación de una ruta

@IsInt()
@IsNotEmpty()
numero_ruta: string;


@IsString()
@IsNotEmpty()
@MaxLength(50)
nombre : string;


@IsString()
@IsNotEmpty()
descripcion : string;


@IsInt()
@IsNotEmpty()
tarifa : number;


@IsString()
@IsNotEmpty()
@MaxLength(50)
@Matches(/^[0-9]+$/, { message: 'La cédula debe contener solo números' })
cooperativa_id : string;


@IsInt()
@IsNotEmpty()
origen_id : number;

@IsInt()
@IsNotEmpty()
destino_id : number;

}