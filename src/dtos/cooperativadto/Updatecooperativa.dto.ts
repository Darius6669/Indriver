import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator'

export class UpdateCooperativaDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    @Matches(/^[0-9]+$/, { message: 'La cédula debe contener solo números' })
    rif_cooperativa ?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    nombre ?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    ubicacion ?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    descripcion ?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    horario ?: string;
}