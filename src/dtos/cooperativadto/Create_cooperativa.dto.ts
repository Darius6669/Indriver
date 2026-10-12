import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

/**
 * Cuerpo para registrar una nueva cooperativa de transporte.
 */
export class CreateCooperativaDto {
  /**
   * RIF de la cooperativa (identificador fiscal).
   * @IsString exige texto; @IsNotEmpty obliga a enviarlo; @MaxLength(50)
   * limita a 50 caracteres; @Matches(^[0-9]+$) exige solo digitos.
   * Nota: el mensaje habla de "cedula" porque fue reutilizado.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[VvEeJjPpGgCc]-\d{8}-\d$/, {
    message:
      'El RIF debe tener el formato L-12345678-9 (letra válida: V, E, J, P, G o C, seguida de 8 dígitos, un guion y un dígito verificador)',
  })
  rif_cooperativa: string;

  /**
   * Nombre de la cooperativa.
   * @IsString exige texto; @IsNotEmpty obliga a enviarlo; @MaxLength(50)
   * limita a 50 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nombre: string;

  /**
   * Ubicacion o sede de la cooperativa.
   * @IsString exige texto; @IsNotEmpty obliga a enviarla; @MaxLength(50)
   * limita a 50 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  ubicacion: string;

  /**
   * Descripcion libre de la cooperativa.
   * @IsString exige texto y @IsNotEmpty obliga a enviarla.
   */
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  /**
   * Horario de operacion (texto libre, ej. "6am - 9pm").
   * @IsString exige texto y @IsNotEmpty obliga a enviarlo.
   */
  @IsString()
  @IsNotEmpty()
  horario: string;
}
