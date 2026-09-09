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

@Controller('personas')
@UseGuards(JwtAuthGuard, RolesGuard) // Aplica autenticación y autorización a todas las rutas
@Roles(['Admin', 'Superadmin']) // Solo estos roles pueden acceder a cualquier endpoint de este controlador
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @Post('/Registrar')
  @HttpCode(HttpStatus.CREATED)
  async RegistrarPersona(@Body() CreatePersona) {
    return this.personasService.Crear_Persona(CreatePersona);
  }

  @Get('/Todos')
  @HttpCode(HttpStatus.OK)
  async Obtener_Persona() {
    return this.personasService.ObtenerPersonas();
  }

  @Get('Id/:cedula')
  @HttpCode(HttpStatus.OK)
  async Obtener_personaID(@Param('cedula') cedula: string) {
    return this.personasService.ObtenerPersonaPorId(cedula);
  }

  @Delete('Delete/:cedula')
  @HttpCode(HttpStatus.OK)
  async Eliminar_PersonaID(@Param('cedula') cedula: string) {
    return this.personasService.eliminarPersona(cedula);
  }

  @Patch('Update/:cedula')
  @HttpCode(HttpStatus.OK)
  async Update_Persona(@Param('cedula') cedula: string, @Body() UpdatePersona) {
    return this.personasService.ActualizarPersona(cedula, UpdatePersona);
  }
}