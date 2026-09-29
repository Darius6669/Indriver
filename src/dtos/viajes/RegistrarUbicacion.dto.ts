import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';

/** Fallback REST cuando el socket no esta disponible. */
export class RegistrarUbicacionDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsNotEmpty()
  lactitud!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsNotEmpty()
  longitud!: number;
}
