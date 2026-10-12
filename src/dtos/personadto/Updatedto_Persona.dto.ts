import { IsOptional, IsString, IsNumber, IsNotEmpty } from 'class-validator';

/**
 * Cuerpo para actualizar (parcialmente) una persona.
 * Todos los campos son opcionales.
 */
export class UpdatePersonaDto {
  /**
   * Nuevo nombre.
   * @IsOptional permite omitirlo; @IsString y @IsNotEmpty validan texto no
   * vacio.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  /**
   * Nuevo apellido.
   * @IsOptional permite omitirlo; @IsString y @IsNotEmpty validan texto no
   * vacio.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  apellido?: string;

  /**
   * Nuevo telefono de contacto.
   * @IsOptional permite omitirlo; @IsString y @IsNotEmpty validan texto no
   * vacio.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  telefono?: string;

  /**
   * Nuevo correo electronico.
   * @IsOptional permite omitirlo; @IsString y @IsNotEmpty validan texto no
   * vacio.
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  email?: string;

  /**
   * Nueva edad.
   * @IsOptional permite omitirla; @IsNumber exige numero; @IsNotEmpty la
   * obliga si se envia el campo.
   */
  @IsOptional()
  @IsNumber()
  @IsNotEmpty()
  edad?: number;
}
