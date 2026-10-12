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
import { VehiculosService } from './vehiculos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Ajusta la ruta según tu estructura
import { RolesGuard } from '../Roles/roles.guard';
import { Roles } from '../Roles/roles.decorador';
import { CreateVehiculosDto } from 'src/dtos/vehiculosdto/Create_Vehiculos.dto';
import { UpdateVehiculoDto } from 'src/dtos/vehiculosdto/UpdateVehiculodto.dto';
/**
 * Controlador HTTP del recurso "vehiculos". Protegido con JWT y RolesGuard.
 * Los roles permitidos son Admin, Superadmin y Conductor. Rutas bajo /vehiculos.
 */
@Controller('vehiculos')
@UseGuards(JwtAuthGuard, RolesGuard) // Aplica autenticación y autorización a todas las rutas
@Roles(['Admin', 'Superadmin', 'Conductor']) // Especifica los roles permitidos para acceder a estas rutas
export class VehiculosController {
  // Inyección del servicio de vehículos.
  constructor(private readonly vehiculosService: VehiculosService) {}

  /** Registra un vehículo nuevo (201 Created). */
  @Post('vehiculo/registrar')
  @HttpCode(HttpStatus.CREATED)
  async registrarVehiculo(@Body() CreateVehiculodto: CreateVehiculosDto) {
    return this.vehiculosService.RegistrarVehiculo(CreateVehiculodto);
  }

  /** Devuelve todos los vehículos con su cooperativa relacionada (200 OK). */
  @Get('vehiculo/todos')
  @HttpCode(HttpStatus.OK)
  async ObtenerVehiculos() {
    return this.vehiculosService.ObtenerVehiculos();
  }

  /** Busca un vehículo por placa; recibe la placa en el cuerpo (200 OK). */
  @Get('vehiculo/filter')
  @HttpCode(HttpStatus.OK)
  async ObtenerVehiculosId(@Body('placa') placa: string) {
    return this.vehiculosService.ObtenerVehiculoPorId(placa);
  }

  /** Elimina el vehículo por placa (en cuerpo) y retorna mensaje + vehículo (200 OK). */
  @Delete('vehiculo/eliminar')
  @HttpCode(HttpStatus.OK)
  async EliminarVehiculo(@Body('placa') placa: string) {
    const vehiculo = await this.vehiculosService.ObtenerVehiculoPorId(placa);
    return {
      message: 'Vehiculo eliminado exitosamente',
      vehiculo,
    };
  }

  /** Actualiza parcialmente un vehículo: placa por parámetro de ruta (200 OK). */
  @Patch('vehiculo/actualizar/:placa')
  @HttpCode(HttpStatus.OK)
  async ActualizarVehiculo(
    @Param('placa') placa: string,
    @Body() UpdateVehiculodto: UpdateVehiculoDto,
  ) {
    const vehiculo = await this.vehiculosService.ActualizarVehiculo(
      placa,
      UpdateVehiculodto,
    );
    // Se devuelve confirmación con el vehículo actualizado.
    return {
      message: 'Vehiculo actualizado exitosamente',
      vehiculo,
    };
  }
}
