import { Test, TestingModule } from '@nestjs/testing';
import { CoperativaService } from './coperativa.service';

describe('CoperativaService', () => {
  let service: CoperativaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoperativaService],
    }).compile();

    service = module.get<CoperativaService>(CoperativaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
