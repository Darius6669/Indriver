import { Test, TestingModule } from '@nestjs/testing';
import { PuntosControlController } from './puntos-control.controller';
import { PuntosControlService } from './puntos-control.service';

describe('PuntosControlController', () => {
  let controller: PuntosControlController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PuntosControlController],
      providers: [PuntosControlService],
    }).compile();

    controller = module.get<PuntosControlController>(PuntosControlController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
