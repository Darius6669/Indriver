import { Injectable } from '@nestjs/common';

/** Servicio raíz con la lógica mínima de ejemplo (endpoint de saludo). */
@Injectable()
export class AppService {
  /** Devuelve el saludo de prueba de la API. */
  getHello(): string {
    return 'Hello mundo!';
  }
}
