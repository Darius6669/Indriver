import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // CORS mejorado
  app.enableCors({
    origin: true, // Permite cualquier origen
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });
  
  await app.listen(3000);
  console.log('=================================');
  console.log(' Servidor Socket.IO iniciado');
  console.log('http://localhost:3000');
  console.log('=================================');
}
bootstrap();