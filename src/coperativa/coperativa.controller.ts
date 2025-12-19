import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { CooperativaService } from './coperativa.service';
import { CreateCooperativaDto } from 'src/dtos/cooperativadto/Create_cooperativa.dto';
import { UpdateCooperativaDto } from 'src/dtos/cooperativadto/Updatecooperativa.dto';

@Controller('cooperativa')
export class CoperativaController {
  constructor(private readonly cooperativaService: CooperativaService) {}


  @Post('cooperativas/crear')
  @HttpCode(HttpStatus.CREATED)
  async crearCooperativa(@Body() createcooperativadto) {
    return this.cooperativaService.CrearCooperativa(createcooperativadto);
  }

  @Get('cooperativas/todas')
  @HttpCode(HttpStatus.OK)
  async obtenerCooperativas() {
    return this.cooperativaService.ObtenerCooperativas();
  }

  @Post('cooperativas/filter')
  @HttpCode(HttpStatus.OK)
  async obtenerCooperativaPorRif(@Body('rif_cooperativa') rif_cooperativa: string) {
    return this.cooperativaService.ObtenercooperativaPorRif(rif_cooperativa);
  }


  @Delete('cooperativas/eliminar')
  @HttpCode(HttpStatus.OK)
  async EliminarCooperativa(@Body('rif_cooperativa') rif_cooperativa :string){
    return this.cooperativaService.EliminarCooperativa(rif_cooperativa);
  }


  @Patch('cooperativas/actualizar')
  @HttpCode(HttpStatus.OK)
  async ActualizarCooperativa(@Body('rif_cooperativa') rif_cooperativa : string ,@Body() updateCooperativadto: any){
    return this.cooperativaService.ActualizarCooperativa(rif_cooperativa,updateCooperativadto);
  }
    
}
