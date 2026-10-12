import { IsNotEmpty, IsNumber, Max, Min } from 'class-validator';

/** Fallback REST cuando el socket no esta disponible. */
export class RegistrarUbicacionDto {
  /**
   * Latitud reportada por el dispositivo.
   * @IsNumber exige numero; @Min(-90)/@Max(90) limitan al rango valido de
   * latitud; @IsNotEmpty obliga a enviarla.
   */
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsNotEmpty()
  lactitud!: number;

  /**
   * Longitud reportada por el dispositivo.
   * @IsNumber exige numero; @Min(-180)/@Max(180) limitan al rango valido de
   * longitud; @IsNotEmpty obliga a enviarla.
   */
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsNotEmpty()
  longitud!: number;
}
