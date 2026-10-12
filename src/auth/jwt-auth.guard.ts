import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard que exige un JWT válido en la petición.
 * Delega en la estrategia 'jwt'; úsalo con @UseGuards(JwtAuthGuard).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
