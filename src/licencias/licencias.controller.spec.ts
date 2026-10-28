import { Test, TestingModule } from '@nestjs/testing';
import { LicenciasController } from './licencias.controller';
import { LicenciasService } from './licencias.service';

describe('LicenciasController', () => {
  let controller: LicenciasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LicenciasController],
      providers: [LicenciasService],
    }).compile();

    controller = module.get<LicenciasController>(LicenciasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
