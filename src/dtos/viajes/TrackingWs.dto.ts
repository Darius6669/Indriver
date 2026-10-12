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
  /**
   * El viaje ya lo creo el REST (POST /viajes/Crear-Viaje). El socket solo lo
   * "enciende": reutiliza este id en vez de insertar una fila nueva.
   */
  @IsInt()
  @IsNotEmpty()
  id_viaje!: number;

  /** Identificador de la ruta que seguira el viaje (1 a 50 caracteres). */
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  id_ruta!: string;

  /** Identificador del vehiculo que realizara el viaje (1 a 50 caracteres). */
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  id_vehiculo!: string;

  /** Latitud del arranque; @Min(-90)/@Max(90) la mantienen en rango valido. */
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  /** Longitud del arranque; @Min(-180)/@Max(180) la mantienen en rango valido. */
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  /** Fecha/hora de inicio; opcional (por defecto la toma el servidor). */
  @IsOptional()
  @IsDate()
  fecha_inicio?: Date;

  /** Incidencia asociada al inicio del viaje; opcional. */
  @IsOptional()
  @IsInt()
  incidencia_id?: number | null;
}

/** Payload de `viaje:ubicacion` — el GPS del telefono empujando posicion. */
export class UbicacionWsDto {
  /** Viaje al que corresponde esta posicion. */
  @IsInt()
  @IsNotEmpty()
  id_viaje!: number;

  /** Latitud actual; @Min(-90)/@Max(90) la mantienen en rango valido. */
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  /** Longitud actual; @Min(-180)/@Max(180) la mantienen en rango valido. */
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
  /** Viaje que se finaliza o pausa. */
  @IsInt()
  @IsNotEmpty()
  id_viaje!: number;

  /** Fecha/hora de cierre; opcional (por defecto la toma el servidor). */
  @IsOptional()
  @IsDate()
  fecha_final?: Date;
}

/** Payload de `viaje:reconectar` — el telefono vuelve y retoma su viaje. */
export class ReconectarViajeWsDto {
  /** Viaje que el conductor retoma tras reconectar. */
  @IsInt()
  @IsNotEmpty()
  id_viaje!: number;
}

/** Payload de `suscribir:ruta` — el pasajero dice que ruta quiere mirar. */
export class SuscribirRutaWsDto {
  /** Numero de ruta a la que el pasajero se suscribe (max 50 caracteres). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  numero_ruta!: string;
}
