import { Test, TestingModule } from '@nestjs/testing';
import { IncidenciasController } from './incidencias.controller';
import { IncidenciasService } from './incidencias.service';

describe('IncidenciasController', () => {
  let controller: IncidenciasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncidenciasController],
      providers: [IncidenciasService],
    }).compile();

    controller = module.get<IncidenciasController>(IncidenciasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
