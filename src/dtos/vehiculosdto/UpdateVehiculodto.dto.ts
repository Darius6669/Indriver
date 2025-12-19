import { IsInt,IsISO8601,IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator'

export class UpdateVehiculoDto {

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    placa ?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    modelo ?: string;


    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    color ?:string;
    
    @IsISO8601()
    @IsOptional()
    @IsNotEmpty()
    anofabricacion ?: Date;


    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    cooperativa_id ?: string;
}