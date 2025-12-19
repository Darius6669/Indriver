import { Body, Controller, Post,HttpCode, HttpStatus, Get, Param, Delete, Patch } from '@nestjs/common';
import { PuntosControlService } from './puntos-control.service';
import { CreateRutaControlDto } from 'src/dtos/ControlRutadto/Create_RutaControl.dto';
@Controller('puntos-control')
export class PuntosControlController {
  constructor(private readonly puntosControlService: PuntosControlService) {}


  @Post('punto-controles/crear')
  @HttpCode(HttpStatus.CREATED)
  async Crear_Punto_control(@Body() CreateRutaControlDto){
    const control = this.puntosControlService.Crear_Punto_control(CreateRutaControlDto);
    return{
      message :"Punto de control creado exitosamentes",
      control : control
    }
  }


  @Get('punto-controles/todas')
  @HttpCode(HttpStatus.OK)
  async Obtener_todos_puntos_Control(){
    const Puntos_controles = await this.puntosControlService.Obtener_Todos_puntos();
    return{
      message : "Lista de todos Los puntos de control de todas las rutas",
      Control :  Puntos_controles,
    }
  }

  @Get('punto-controles/filter/:nombre')
  @HttpCode(HttpStatus.OK)
  async Obtener_Punto_Control_Id(@Param('nombre') nombre : string){
    const Puntos_control = await this.puntosControlService.Obtener_Punto_Control_ID(nombre);
    return{
      message:  `Los puntos de control Perteneciente a la ruta: ${nombre}`,
      control :  Puntos_control
    }

  }


  @Delete('punto-controles/eliminar/:nombre')
  @HttpCode(HttpStatus.OK)
  async Eliminar_Punto_Control(@Param('nombre') nombre: string){
    const control = await this.puntosControlService.Eliminar_Punto_control(nombre);
    return{
      message: `Los puntos de control Perteneciente a la ruta a sido Eliminado: ${nombre}`,
      control :  control
    }
  }

  @Patch('punto-controles/actualizar')
  @HttpCode(HttpStatus.OK)
  async Actualizar_Punto_Control(@Body() UpdateControlRuta : any){
    const control = await this.puntosControlService.Actualizar_Punto_Control(UpdateControlRuta);
    return{
       message: `Los puntos de control Perteneciente a la ruta a sido actualizado: ${UpdateControlRuta.nombre}`,
        control :  control
    }
  }

}
