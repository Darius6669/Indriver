import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ViajesService } from './viajes.service';

@Controller('viajes')
export class ViajesController {
  constructor(private readonly viajesService: ViajesService) {}

  @Post('/Crear-Viaje')
  @HttpCode(HttpStatus.CREATED)
  async CrearViaje(@Body() CreateViajes){
    const viaje = await this.viajesService.CreateViajes(CreateViajes)
    return{
      message : "Se ha Creado Exitosamente el Viaje*",
      control: viaje
    }
  }

  @Get('/Obtener-Viaje')
  @HttpCode(HttpStatus.OK)
  async Obtener_Viajes(){
    const viaje = await this.viajesService.ObtenerViajes()
    return{
      message : "Se han cargados Exitosamente el Viaje*",
      control: viaje
    }
  }

  @Get('/Obtener-viaje-Id/:id')
  @HttpCode(HttpStatus.OK)
  async Obtener_viajes_ID(@Param('id') id : number){
    const viaje = await this.viajesService.ObtenerVijesId(id)
    return{
      message : `viaje encontrado : ${id}`,
      control: viaje
    }
  }

  @Delete('/Elimnar-viaje/:id')
  @HttpCode(HttpStatus.OK)
  async Eliminar_viaje(@Param('id') id: number){
    const viaje = await this.viajesService.EliminarViajeID(id)
    return{
      message : `viaje encontrado : ${id} ha sido elimado correctamente`,
      control: viaje
    }
  }

  @Patch('/Actualizar-viaje/:id')
  @HttpCode(HttpStatus.OK)
  async Actualizar_Viaje(@Param('id') id : number , @Body() UpdateViaje){
    const viaje = await this.viajesService.ActualizarViaje(id,UpdateViaje)
    return{
      message : `viaje encontrado identificador: ${id} ha sido actualizado correctamente`,
      control: viaje
    }
  }

}
