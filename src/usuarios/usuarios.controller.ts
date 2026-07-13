import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post('/Crear-usuario')
  @HttpCode(HttpStatus.CREATED)
  async CrearUsuario(@Body() CreateUsuario){
    const usuario = await this.usuariosService.CreateUsuario(CreateUsuario)
    return{
      message : "Se ha Creado Exitosamente el Usuario*",
      control: usuario
    }

  }

  @Get('/Obtener-usuario')
  @HttpCode(HttpStatus.OK)
  async Obtener_Usuarios(){
    const usuario = await this.usuariosService.ObtenerUsuarios()
    return{
      message : "Se han cargados Exitosamente el Usuario*",
      control: usuario
    }
  }

  @Get('/Obtener-usuario-username/:username')
  @HttpCode(HttpStatus.OK)
  async Obtener_Usuario_Username(@Param('username') username: string){
    const usuario = await this.usuariosService.ObtenerUsuarioUsername(username)
    return{
      message : "Se ha cargado Exitosamente el Usuario*",
      control: usuario
    }
  }

  @Delete('/Eliminar-usuario/:username')
  @HttpCode(HttpStatus.OK)
  async Eliminar_Usuario(@Param('username') username: string){
    const usuario = await this.usuariosService.eliminarUsuario(username)
    return{
      message : "Se ha Eliminado Exitosamente el Usuario*",
      control: usuario
    }
  }

  @Patch('/Actualizar-usuario/:username')
  @HttpCode(HttpStatus.OK)
  async Actualizar_Usuario(@Param('username') username: string, @Body() updateusuarioDTO){
    const usuario = await this.usuariosService.actualizarUsuario(username, updateusuarioDTO)
    return{
      message : "Se ha Actualizado Exitosamente el Usuario*",
      control: usuario
    }
  }


}
