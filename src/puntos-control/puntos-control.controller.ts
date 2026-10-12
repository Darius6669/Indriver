import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { PuntosControlService } from './puntos-control.service';
import { CreateRutaControlDto } from 'src/dtos/ControlRutadto/Create_RutaControl.dto';
import { updatePuntoControl } from 'src/dtos/ControlRutadto/UpdateControlRuta.dto';
/**
 * Controlador HTTP del recurso "puntos-control".
 * Gestiona los puntos de control (origen/destino) de las rutas.
 * Nota: a diferencia de otros controladores, aquí no se aplican guards.
 */
@Controller('puntos-control')
export class PuntosControlController {
  constructor(private readonly puntosControlService: PuntosControlService) {}

  /**
   * Crea un punto de control.
   * @param createRutaControlDto Datos del punto de control.
   * @returns Mensaje y el punto de control creado.
   */
  @Post('punto-controles/crear')
  @HttpCode(HttpStatus.CREATED)
  async Crear_Punto_control(
    @Body() createRutaControlDto: CreateRutaControlDto,
  ) {
    const control =
      await this.puntosControlService.Crear_Punto_control(createRutaControlDto);
    return {
      message: 'Punto de control creado exitosamentes',
      control: control, // Alias "control" usado por el cliente para leer la entidad.
    };
  }

  /**
   * Lista todos los puntos de control.
   * @returns Mensaje y la colección completa de puntos.
   */
  @Get('punto-controles/todas')
  @HttpCode(HttpStatus.OK)
  async Obtener_todos_puntos_Control() {
    const Puntos_controles =
      await this.puntosControlService.Obtener_Todos_puntos();
    return {
      message: 'Lista de todos Los puntos de control de todas las rutas',
      Control: Puntos_controles, // Nota: aquí la clave va con mayúscula ("Control").
    };
  }

  /**
   * Busca un punto de control por su nombre.
   * @param nombre Nombre del punto de control.
   * @returns Mensaje y el punto de control encontrado.
   */
  @Get('punto-controles/filter/:nombre')
  @HttpCode(HttpStatus.OK)
  async Obtener_Punto_Control_Id(@Param('nombre') nombre: string) {
    const Puntos_control =
      await this.puntosControlService.Obtener_Punto_Control_ID(nombre);
    return {
      message: `Los puntos de control Perteneciente a la ruta: ${nombre}`,
      control: Puntos_control,
    };
  }

  /**
   * Elimina un punto de control por su nombre.
   * @param nombre Nombre del punto de control a eliminar.
   * @returns Mensaje y el punto de control eliminado.
   */
  @Delete('punto-controles/eliminar/:nombre')
  @HttpCode(HttpStatus.OK)
  async Eliminar_Punto_Control(@Param('nombre') nombre: string) {
    const control =
      await this.puntosControlService.Eliminar_Punto_control(nombre);
    return {
      message: `Los puntos de control Perteneciente a la ruta a sido Eliminado: ${nombre}`,
      control: control,
    };
  }

  /**
   * Actualiza un punto de control.
   * @param UpdateControlRuta DTO con los campos a modificar.
   * @returns Mensaje y el punto de control actualizado.
   */
  @Patch('punto-controles/actualizar')
  @HttpCode(HttpStatus.OK)
  async Actualizar_Punto_Control(
    @Body() UpdateControlRuta: updatePuntoControl,
  ) {
    const control =
      await this.puntosControlService.Actualizar_Punto_Control(
        UpdateControlRuta,
      );
    return {
      message: `Los puntos de control Perteneciente a la ruta a sido actualizado: ${UpdateControlRuta.nombre}`,
      control: control,
    };
  }
}
