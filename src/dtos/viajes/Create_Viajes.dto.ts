import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsDateString,
  IsNumber,
} from 'class-validator';

/**
 * Cuerpo para crear un nuevo viaje.
 */
export class CreateViajesDto {

  /**
   * Fecha/hora de inicio del viaje.
   */
  @IsDateString()
  @IsNotEmpty()
  fecha_inicio!: string;

  /**
   * Fecha/hora de finalizacion del viaje.
   */
  @IsDateString()
  @IsOptional()
  fecha_final?: string;

  /**
   * Latitud inicial del viaje.
   */
  @IsNumber()
  @IsNotEmpty()
  lactitud!: number;

  /**
   * Longitud inicial del viaje.
   */
  @IsNumber()
  @IsNotEmpty()
  longitud!: number;

  /**
   * Username del conductor que realiza el viaje.
   */
  @IsString()
  @IsNotEmpty()
  username!: string;

  /**
   * Vehiculo asignado al viaje.
   */
  @IsString()
  @IsNotEmpty()
  id_vehiculo!: string;

  /**
   * Numero de ruta que sigue el viaje (Ej: "RUTA-003").
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  id_ruta!: string;

  /**
   * Incidencia asociada al viaje (opcional).
   */
  @IsNumber()
  @IsOptional()
  incidencia_id?: number | null;
}