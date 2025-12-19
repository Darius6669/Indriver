import { Test, TestingModule } from '@nestjs/testing';
import { CoperativaController } from './coperativa.controller';
import { CoperativaService } from './coperativa.service';

describe('CoperativaController', () => {
  let controller: CoperativaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoperativaController],
      providers: [CoperativaService],
    }).compile();

    controller = module.get<CoperativaController>(CoperativaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
