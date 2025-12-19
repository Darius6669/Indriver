import { Controller } from '@nestjs/common';
import { ViajesService } from './viajes.service';

@Controller('viajes')
export class ViajesController {
  constructor(private readonly viajesService: ViajesService) {}
}
