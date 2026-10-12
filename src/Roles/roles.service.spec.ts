import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';

/** Pruebas del RolesService; solo verifica su instanciación. */
describe('RolesService', () => {
  let service: RolesService;

  // Monta el módulo con el servicio y obtiene su instancia.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesService],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  // Comprueba que el servicio quedó correctamente instanciado.
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
