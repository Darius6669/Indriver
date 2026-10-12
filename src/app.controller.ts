import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/** Controlador raíz: expone el endpoint de prueba/salud en la ruta base. */
@Controller()
export class AppController {
  /** Inyecta AppService para delegar la respuesta del endpoint. */
  constructor(private readonly appService: AppService) {}

  /**
   * GET / -> devuelve un saludo.
   * Se usa como health check básico para verificar que la API responde.
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
