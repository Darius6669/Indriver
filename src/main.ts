import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Punto de entrada del backend.
 * Crea la app Nest con el módulo raíz, aplica validación global y CORS,
 * habilita el apagado ordenado y deja escuchando HTTP + Socket.IO.
 */
async function bootstrap() {
  // Instancia la aplicación (carga config, conexión a BD y todos los módulos).
  const app = await NestFactory.create(AppModule);

  // Sin esto los @IsNumber()/@IsNotEmpty() de los DTO no se validan nunca
  app.useGlobalPipes(
    new ValidationPipe({
      // Descarta del body las propiedades que no están declaradas en el DTO.
      whitelist: true,
      // Lanza error si llegan propiedades no declaradas (validación estricta).
      forbidNonWhitelisted: true,
      // Convierte el body plano al tipo del DTO automáticamente.
      transform: true,
      // Habilita la conversión implícita de string a number/boolean.
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS mejorado
  app.enableCors({
    origin: true, // Permite cualquier origen
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Necesario para que el gateway pueda hacer flush de sus buffers al apagar
  app.enableShutdownHooks();

  // Puerto desde PORT_APP (llega como string) o 3000 por defecto.
  await app.listen(
    process.env.PORT_APP ? parseInt(process.env.PORT_APP) : 3000,
  );
  const logger = new Logger('Bootstrap');
  logger.log('=================================');
  logger.log(` API + Socket.IO escuchando en ${await app.getUrl()}`);
  logger.log(' Conductores:WS  -> requiere JWT con rol "Conductor"');
  logger.log('=================================');
}
// `void` evita el aviso de promesa flotante al lanzar el bootstrap.
void bootstrap();
