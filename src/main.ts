import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Sin esto los @IsNumber()/@IsNotEmpty() de los DTO no se validan nunca
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
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

  await app.listen(
    process.env.PORT_APP ? parseInt(process.env.PORT_APP) : 3000,
  );
  const logger = new Logger('Bootstrap');
  logger.log('=================================');
  logger.log(` API + Socket.IO escuchando en ${await app.getUrl()}`);
  logger.log(' Conductores:WS  -> requiere JWT con rol "Conductor"');
  logger.log('=================================');
}
void bootstrap();
