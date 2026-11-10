import { Type } from 'class-transformer';
import {
  IsNumber,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

/**
 * Cuerpo para crear un punto de control de ruta (checkpoint).
 * Representa un lugar fisico por donde pasa una ruta.
 */
export class CreateRutaControlDto {
  /**
   * Nombre del punto de control.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50, {
    message: 'El campo nombre no debe exceder los 50 caracteres',
  })
  nombre: string;

  /**
   * Descripcion libre del punto de control.
   */
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  /**
   * Ubicacion de referencia del punto (texto legible).
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: 'La ubicacion no debe exceder los 50 caracteres' })
  ubicacion: string;

  /**
   * Latitud del punto de control (admite decimales).
   */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 }, { message: 'lactitud debe ser un número decimal' })
  @Min(-90, { message: 'lactitud debe ser mayor o igual a -90' })
  @Max(90, { message: 'lactitud debe ser menor o igual a 90' })
  @IsNotEmpty()
  lactitud: number;

  /**
   * Longitud del punto de control (admite decimales).
   */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 }, { message: 'longitud debe ser un número decimal' })
  @Min(-180, { message: 'longitud debe ser mayor o igual a -180' })
  @Max(180, { message: 'longitud debe ser menor o igual a 180' })
  @IsNotEmpty()
  longitud: number;
}
