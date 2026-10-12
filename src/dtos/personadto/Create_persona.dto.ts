import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsInt,
  Matches,
} from 'class-validator';

/**
 * Cuerpo para registrar una persona (pasajero o conductor).
 */
export class CreatePersonaDto {
  /**
   * Cedula de identidad de la persona.
   * @IsString exige texto; @IsNotEmpty obliga a enviarla;
   * @MinLength(8)/@MaxLength(20) exigen entre 8 y 20 caracteres;
   * @Matches(^[0-9]+$) exige solo digitos.
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^[0-9]+$/, { message: 'La cédula debe contener solo números' })
  cedula!: string;

  /**
   * Nombre de la persona.
   * @IsString exige texto; @IsNotEmpty obliga a enviarlo; @MaxLength(50)
   * limita a 50 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nombre!: string;

  /**
   * Apellido de la persona.
   * @IsString exige texto; @IsNotEmpty obliga a enviarlo; @MaxLength(50)
   * limita a 50 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  apellido!: string;

  /**
   * Correo electronico.
   * @IsEmail valida formato de correo; @IsNotEmpty obliga a enviarlo;
   * @MaxLength(50) limita a 50 caracteres.
   */
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(50)
  email!: string;

  /**
   * Telefono de contacto.
   * @IsString exige texto; @IsNotEmpty obliga a enviarlo; @MaxLength(50)
   * limita a 50 caracteres.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  telefono!: string;

  /**
   * Edad de la persona.
   * @IsInt exige entero y @IsNotEmpty obliga a enviarla.
   */
  @IsInt()
  @IsNotEmpty()
  edad!: number;
}
