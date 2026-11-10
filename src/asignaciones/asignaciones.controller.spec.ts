import { Test, TestingModule } from '@nestjs/testing';
import { AsignacionesController } from './asignaciones.controller';
import { AsignacionesService } from './asignaciones.service';

describe('AsignacionesController', () => {
  let controller: AsignacionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsignacionesController],
      providers: [AsignacionesService],
    }).compile();

    controller = module.get<AsignacionesController>(AsignacionesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
