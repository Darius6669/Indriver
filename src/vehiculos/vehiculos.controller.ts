import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { VehiculosService } from './vehiculos.service';

@Controller('vehiculos')
export class VehiculosController {
  constructor(private readonly vehiculosService: VehiculosService) {}

  @Post('vehiculo/registrar')
  @HttpCode(HttpStatus.CREATED)
  async registrarVehiculo(@Body() CreateVehiculodto) {
    return this.vehiculosService.RegistrarVehiculo(CreateVehiculodto);
  }


  @Get('vehiculo/todos')
  @HttpCode(HttpStatus.OK)
  async ObtenerVehiculos() {
    return this.vehiculosService.ObtenerVehiculos();
  }


  @Get('vehiculo/filter')
  @HttpCode(HttpStatus.OK)
  async ObtenerVehiculosId(@Body('placa') placa :string){
    return this.vehiculosService.ObtenerVehiculoPorId(placa);
  }

  @Delete('vehiculo/eliminar')
  @HttpCode(HttpStatus.OK)
  async EliminarVehiculo(@Body('placa') placa:string){
    const vehiculo = await this.vehiculosService.ObtenerVehiculoPorId(placa);
    return {
      message: 'Vehiculo eliminado exitosamente',
      vehiculo
    };
  }


  @Patch('vehiculo/actualizar/:placa')
  @HttpCode(HttpStatus.OK)
  async ActualizarVehiculo(@Param('placa') placa : string, @Body() UpdateVehiculodto:any){
    const vehiculo = await this.vehiculosService.ActualizarVehiculo(placa,UpdateVehiculodto);
    // Lógica para actualizar el vehículo utilizando UpdateVehiculodto
    return {
      message: 'Vehiculo actualizado exitosamente',
      vehiculo
    };
  }
  

}
