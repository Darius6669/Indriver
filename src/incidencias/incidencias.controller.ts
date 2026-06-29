import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { IncidenciasService } from './incidencias.service';

@Controller('incidencias')
export class IncidenciasController {
  constructor(private readonly incidenciasService: IncidenciasService) {}

    @Post('/Crear-Incidencias')
    @HttpCode(HttpStatus.CREATED)
    async CrearIncidencias(@Body() CreateIncidencias){
      const Incidencias = await this.incidenciasService.CrearIncidencia(CreateIncidencias);
      return{
        message : "Se ha Creado Exitosamente la Incidencia*",
        control: Incidencias
      }
    }

    @Get('/Obtener-Incidencias')
    @HttpCode(HttpStatus.OK)
    async Obtener_Incidencias(){
      const Incidencias = await this.incidenciasService.ObtenerIncidencias();
      return{
        message : "Estas son las Incidencias Registradas*",
        control : Incidencias
      }
    }

    @Get('/Obtener-Incidencias/:id')
    @HttpCode(HttpStatus.OK)
    async Obtener_IncidenciasId(@Param('id') id: number){
      const Incidencias = await this.incidenciasService.ObtenerIncidenciasId(id);
      return{
        message : `Incidencia encontrada : ${id}`,
        control : Incidencias
      }
    }

    @Delete('/Eliminar-Incidencias/:id')
    @HttpCode(HttpStatus.OK)
    async Eliminar_Incidencia(@Param('id') id : number){
      const Incidencias = await this.incidenciasService.EliminarIncidencia(id);
      return{
        message : `Incidencia Eliminada : ${id}`,
        control : Incidencias
      }
    }


    @Patch('/Actualizar-Incidencia/:id')
    @HttpCode(HttpStatus.OK)
    async Actualizar_Incidencia(@Param('id') id : number, @Body() UpdateIncidencias){
      const Incidencias = await this.incidenciasService.ActualizarIncidencias(id,UpdateIncidencias);
      return {
        message : `Incidencia Actualizada : ${id}`,
        control : Incidencias
      }
    }

}
