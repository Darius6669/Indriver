import { Test, TestingModule } from '@nestjs/testing';
import { CooperativaService } from './coperativa.service';

describe('CooperativaService', () => {
  let service: CooperativaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CooperativaService],
    }).compile();

    service = module.get<CooperativaService>(CooperativaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
