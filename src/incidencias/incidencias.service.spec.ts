import { Test, TestingModule } from '@nestjs/testing';
import { IncidenciasService } from './incidencias.service';

describe('IncidenciasService', () => {
  let service: IncidenciasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IncidenciasService],
    }).compile();

    service = module.get<IncidenciasService>(IncidenciasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
