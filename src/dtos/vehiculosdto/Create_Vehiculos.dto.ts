import { IsInt, IsISO8601, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator'

export class CreateVehiculosDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    placa : string;


    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    modelo : string;


    
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    color :string;

    @IsISO8601()
    @IsNotEmpty()
    anofabricacion : Date;


    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    cooperativa_id : string;


}