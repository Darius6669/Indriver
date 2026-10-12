import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsInt,
} from 'class-validator';

/**
 * Cuerpo para reportar una incidencia (averia, accidente, etc.).
 */
export class CreateIncidenciasDto {
  /**
   * Identificador de la incidencia.
   * @IsInt exige entero y @IsNotEmpty obliga a enviarlo.
   */
  @IsInt()
  @IsNotEmpty()
  id_incidencias!: number;

  /**
   * Descripcion detallada de la incidencia.
   * @IsString exige texto; @IsNotEmpty obliga a enviarla;
   * @MinLength(50)/@MaxLength(500) exigen entre 50 y 500 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(50)
  @MaxLength(500)
  descripcion!: string;

  /**
   * Estado de la incidencia (ej. "abierta"/"cerrada").
   * @IsString exige texto; @IsNotEmpty obliga a enviarlo;
   * @MinLength(50)/@MaxLength(500) exigen entre 50 y 500 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(50)
  @MaxLength(500)
  estado!: string;
}
