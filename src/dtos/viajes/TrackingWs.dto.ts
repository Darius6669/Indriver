import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Payload de `viaje:start` — el conductor abre un viaje desde el telefono. */
export class IniciarViajeWsDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  id_ruta!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  id_vehiculo!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsOptional()
  @IsDate()
  fecha_inicio?: Date;

  @IsOptional()
  @IsInt()
  incidencia_id?: number | null;
}

/** Payload de `viaje:ubicacion` — el GPS del telefono empujando posicion. */
export class UbicacionWsDto {
  @IsOptional()
  @IsInt()
  id_viaje?: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  /** km/h */
  @IsOptional()
  @IsNumber()
  @Min(0)
  velocidad?: number;

  /** grados 0-359, 0 = norte */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(359)
  rumbo?: number;

  /** radio de precision en metros */
  @IsOptional()
  @IsNumber()
  @Min(0)
  precision?: number;

  /** epoch ms del reloj del telefono */
  @IsOptional()
  @IsNumber()
  ts?: number;
}

/** Payload de `viaje:finalizar` / `viaje:pausa`. */
export class CerrarViajeWsDto {
  @IsOptional()
  @IsInt()
  id_viaje?: number;

  @IsOptional()
  @IsDate()
  fecha_final?: Date;
}

/** Payload de `viaje:reconectar` — el telefono vuelve y retoma su viaje. */
export class ReconectarViajeWsDto {
  @IsInt()
  @IsNotEmpty()
  id_viaje!: number;
}

/** Payload de `suscribir:ruta` — el pasajero dice que ruta quiere mirar. */
export class SuscribirRutaWsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  numero_ruta!: string;
}
