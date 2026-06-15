import { IsOptional, IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class UpdatePersonaDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    nombre?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    apellido?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    telefono?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    email?: string;

    @IsOptional()
    @IsNumber()
    @IsNotEmpty()
    edad?: number;

}