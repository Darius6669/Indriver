import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PersonasService } from './personas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Ajusta la ruta según tu estructura
import { RolesGuard } from '../Roles/roles.guard';
import { Roles } from '../Roles/roles.decorador';
import { CreatePersonaDto } from 'src/dtos/personadto/Create_persona.dto';
import { UpdatePersonaDto } from 'src/dtos/personadto/Updatedto_Persona.dto';

/**
 * Controlador HTTP del recurso "personas". Todas sus rutas están protegidas por
 * autenticación JWT y solo son accesibles para los roles Admin y Superadmin.
 */
@Controller('personas')
@UseGuards(JwtAuthGuard, RolesGuard) // Aplica autenticación y autorización a todas las rutas
@Roles(['Admin', 'Superadmin']) // Solo estos roles pueden acceder a cualquier endpoint de este controlador
export class PersonasController {
  // Inyección del servicio de personas, única vía hacia la capa de negocio.
  constructor(private readonly personasService: PersonasService) {}

  /** Registra una persona nueva a partir del cuerpo. Responde 201 Created. */
  @Post('/Registrar')
  @HttpCode(HttpStatus.CREATED)
  async RegistrarPersona(@Body() CreatePersona: CreatePersonaDto) {
    return this.personasService.Crear_Persona(CreatePersona);
  }

  /** Devuelve el listado completo de personas. */
  @Get('/Todos')
  @HttpCode(HttpStatus.OK)
  async Obtener_Persona() {
    return this.personasService.ObtenerPersonas();
  }

  /** Busca una persona por su cédula, tomada de la ruta. */
  @Get('Id/:cedula')
  @HttpCode(HttpStatus.OK)
  async Obtener_personaID(@Param('cedula') cedula: string) {
    return this.personasService.ObtenerPersonaPorId(cedula);
  }

  /** Elimina la persona identificada por la cédula de la ruta. */
  @Delete('Delete/:cedula')
  @HttpCode(HttpStatus.OK)
  async Eliminar_PersonaID(@Param('cedula') cedula: string) {
    return this.personasService.eliminarPersona(cedula);
  }

  /** Actualiza parcialmente la persona identificada por la cédula de la ruta. */
  @Patch('Update/:cedula')
  @HttpCode(HttpStatus.OK)
  async Update_Persona(
    @Param('cedula') cedula: string,
    @Body() UpdatePersona: UpdatePersonaDto,
  ) {
    return this.personasService.ActualizarPersona(cedula, UpdatePersona);
  }
}
