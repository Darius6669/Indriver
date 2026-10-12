import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsInt,
  IsOptional,
  IsDate,
  IsNumber,
} from 'class-validator';

/**
 * Cuerpo para crear un nuevo viaje.
 */
export class CreateViajesDto {
  /**
   * Identificador del viaje.
   * @IsInt exige entero. No lleva @IsNotEmpty, pero es obligatorio por tipo.
   */
  @IsInt()
  id_viaje!: number;

  /**
   * Fecha/hora de inicio del viaje.
   * @IsDate exige una fecha valida y @IsNotEmpty obliga a enviarla.
   */
  @IsDate()
  @IsNotEmpty()
  fecha_inicio!: Date;

  /**
   * Fecha/hora de finalizacion del viaje.
   * @IsDate exige fecha valida; @IsOptional permite omitirla (viaje aun en
   * curso).
   */
  @IsDate()
  @IsOptional()
  fecha_final!: Date;

  /**
   * Latitud inicial del viaje.
   * @IsNumber exige numero y @IsNotEmpty obliga a enviarla.
   */
  @IsNumber()
  @IsNotEmpty()
  lactitud!: number;

  /**
   * Longitud inicial del viaje.
   * @IsNumber exige numero y @IsNotEmpty obliga a enviarla.
   */
  @IsNumber()
  @IsNotEmpty()
  longitud!: number;

  /**
   * Usuario (conductor) que realiza el viaje.
   * @IsNumber exige numero y @IsNotEmpty obliga a enviarlo.
   */
  @IsNumber()
  @IsNotEmpty()
  id_user!: number;

  /**
   * Vehiculo asignado al viaje.
   * @IsString exige texto; @IsNotEmpty obliga a enviarlo;
   * @MinLength(10)/@MaxLength(100) exigen entre 10 y 100 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(100)
  id_vehiculo!: string;

  /**
   * Ruta que sigue el viaje.
   * @IsString exige texto; @IsNotEmpty obliga a enviarla;
   * @MinLength(10)/@MaxLength(100) exigen entre 10 y 100 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(100)
  id_ruta!: string;

  /**
   * Incidencia asociada al viaje (opcional).
   * @IsNumber exige numero; @IsNotEmpty y @IsOptional permiten omitirla o
   * enviarla nula.
   */
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  incidencia_id?: number | null;
}
