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
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDTO } from 'src/dtos/usuarios/Create_usuario.dto';
import { UpdateUsuarioDTO } from 'src/dtos/usuarios/Update_usuario.dto';

/**
 * Controlador HTTP del recurso "usuarios". Expone las rutas CRUD bajo /usuarios
 * y delega toda la lógica de negocio en UsuariosService.
 */
@Controller('usuarios')
export class UsuariosController {
  // Inyección del servicio de usuarios; la comunicación se hace solo a través de él.
  constructor(private readonly usuariosService: UsuariosService) {}

  /**
   * Crea un usuario nuevo a partir del DTO recibido en el cuerpo.
   * Responde 201 Created con el usuario creado.
   */
  @Post('/Crear-usuario')
  @HttpCode(HttpStatus.CREATED)
  async CrearUsuario(@Body() CreateUsuario: CreateUsuarioDTO) {
    const usuario = await this.usuariosService.CreateUsuario(CreateUsuario);
    return {
      message: 'Se ha Creado Exitosamente el Usuario*',
      control: usuario,
    };
  }

  /** Devuelve la lista completa de usuarios registrados (200 OK). */
  @Get('/Obtener-usuario')
  @HttpCode(HttpStatus.OK)
  async Obtener_Usuarios() {
    const usuario = await this.usuariosService.ObtenerUsuarios();
    return {
      message: 'Se han cargados Exitosamente el Usuario*',
      control: usuario,
    };
  }

  /** Busca y devuelve un usuario por su username tomado de la ruta. */
  @Get('/Obtener-usuario-username/:username')
  @HttpCode(HttpStatus.OK)
  async Obtener_Usuario_Username(@Param('username') username: string) {
    const usuario = await this.usuariosService.ObtenerUsuarioUsername(username);
    return {
      message: 'Se ha cargado Exitosamente el Usuario*',
      control: usuario,
    };
  }

  /** Devuelve los usuarios cuyo nombre de cooperativa coincide parcialmente. */
  @Get('/Obtener-usuarios-cooperativa/:cooperativa')
  @HttpCode(HttpStatus.OK)
  async Obtener_Usuario_Cooperativa(@Param('cooperativa') cooperativa: string) {
    const usuario =
      await this.usuariosService.ObtenerUsuariosCooperativa(cooperativa);
    return {
      message: 'Se ha cargado Exitosamente el Usuario*',
      control: usuario,
    };
  }

  /** Elimina el usuario indicado por username en la ruta. */
  @Delete('/Eliminar-usuario/:username')
  @HttpCode(HttpStatus.OK)
  async Eliminar_Usuario(@Param('username') username: string) {
    const usuario = await this.usuariosService.eliminarUsuario(username);
    return {
      message: 'Se ha Eliminado Exitosamente el Usuario*',
      control: usuario,
    };
  }

  /**
   * Actualiza parcialmente un usuario: el username identifica el recurso en la
   * ruta y el cuerpo trae los campos a modificar.
   */
  @Patch('/Actualizar-usuario/:username')
  @HttpCode(HttpStatus.OK)
  async Actualizar_Usuario(
    @Param('username') username: string,
    @Body() updateusuarioDTO: UpdateUsuarioDTO,
  ) {
    const usuario = await this.usuariosService.actualizarUsuario(
      username,
      updateusuarioDTO,
    );
    return {
      message: 'Se ha Actualizado Exitosamente el Usuario*',
      control: usuario,
    };
  }
}
