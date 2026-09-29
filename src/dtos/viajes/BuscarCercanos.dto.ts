import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, Max, Min } from 'class-validator';

/**
 * Query de `GET /viajes/Tracking/Cercanos`: "buses cerca de mi".
 *
 * Ojo con el ValidationPipe global: tiene forbidNonWhitelisted, asi que
 * cualquier param que no este declarado aqui hace que el request entero
 * rebote con 400. Eso es a proposito, no un bug.
 */
export class BuscarCercanosDto {
  /** Mi latitud. */
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lactitud!: number;

  /** Mi longitud. */
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud!: number;

  /** Radio de busqueda en metros. Default 1000, tope 50 km. */
  @Type(() => Number)
  @IsNumber()
  @Min(50)
  @Max(50_000)
  radio?: number = 1000;

  /** Cuantos buses devolver como maximo. Default 20, tope 100. */
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limite?: number = 20;

  /**
   * Si viene en true, solo los buses con el socket conectado.
   *
   * El @Transform a mano es obligatorio: en un query string todo llega como
   * texto, y Boolean("false") es TRUE en JavaScript. Sin esto, mandar
   * ?soloOnline=false te traeria los buses sin conexion.
   *
   * El decorador @IsBoolean no es cosmetico: el ValidationPipe global usa
   * whitelist, que borra toda propiedad sin decorador de validacion.
   */
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  soloOnline?: boolean = false;
}
