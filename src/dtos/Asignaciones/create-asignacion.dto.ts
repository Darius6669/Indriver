import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAsignacionDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  vehiculo_placa!: string;

  @IsString()
  @IsNotEmpty()
  numero_ruta!: string;

  @IsInt()
  @IsNotEmpty()
  id_viaje!: number;
}