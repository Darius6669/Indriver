import { Test, TestingModule } from '@nestjs/testing';
import { PuntosControlService } from './puntos-control.service';

describe('PuntosControlService', () => {
  let service: PuntosControlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PuntosControlService],
    }).compile();

    service = module.get<PuntosControlService>(PuntosControlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
