import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LicenciaEntity } from 'src/entidades/Licencia.entity'; // Ajusta tu ruta
import { UsuariosEntity } from 'src/entidades/Usuarios.entity'; // Ajusta tu ruta
import { CreateLicenciaDto } from 'src/dtos/licencias/Create_Licencia.dto';
import { UpdateLicenciaDto } from 'src/dtos/licencias/Update_Licencia.dto';
// Ajusta tu ruta

@Injectable()
export class LicenciasService {
  constructor(
    @InjectRepository(LicenciaEntity)
    private licenciaRepository: Repository<LicenciaEntity>,
    @InjectRepository(UsuariosEntity)
    private usuariosRepository: Repository<UsuariosEntity>,
  ) {}

  /** Busca al usuario por su username y lo devuelve (o null si no existe). */
  private async buscarUsuario(username: string): Promise<UsuariosEntity | null> {
    return await this.usuariosRepository.findOne({
      where: { username: username },
    });
  }

  /** Crea una licencia vinculándola a un usuario por su username. */
  async CreateLicencia(createLicenciaDto: CreateLicenciaDto): Promise<LicenciaEntity> {
    // 1. Verificar si la licencia ya existe (por su PK)
    const existe = await this.licenciaRepository.findOne({
      where: { licencia: createLicenciaDto.licencia },
    });
    if (existe) {
      throw new BadRequestException('Ya existe una licencia con ese número');
    }

    // 2. Buscar el usuario por username
    const usuarioEncontrado = await this.buscarUsuario(createLicenciaDto.username);
    if (!usuarioEncontrado) {
      throw new NotFoundException('El usuario especificado no existe');
    }

    // 3. Crear la entidad con el objeto completo
    const nuevaLicencia = this.licenciaRepository.create({
      licencia: createLicenciaDto.licencia,
      fechav: createLicenciaDto.fechav,
      tipo_licencia: createLicenciaDto.tipo_licencia,
      usuario: usuarioEncontrado, // <--- Objeto completo de TypeORM
    });

    return await this.licenciaRepository.save(nuevaLicencia);
  }

  /** Lista todas las licencias con los datos del usuario. */
  async ObtenerLicencias(): Promise<LicenciaEntity[]> {
    return await this.licenciaRepository.find({
      relations: ['usuario'],
    });
  }

  /** Busca una licencia por su número (PK). */
  async ObtenerLicenciaId(licencia: string): Promise<LicenciaEntity> {
    const lic = await this.licenciaRepository.findOne({
      where: { licencia: licencia },
      relations: ['usuario'],
    });

    if (!lic) {
      throw new NotFoundException(`La licencia con número ${licencia} no existe.`);
    }
    return lic;
  }

  /** Actualiza los datos de una licencia. */
  async ActualizarLicencia(
    licenciaId: string,
    updateLicenciaDto: UpdateLicenciaDto,
  ): Promise<LicenciaEntity> {
    const licencia = await this.ObtenerLicenciaId(licenciaId);

    // Actualizar campos simples
    licencia.fechav = updateLicenciaDto.fechav ?? licencia.fechav;
    licencia.tipo_licencia = updateLicenciaDto.tipo_licencia ?? licencia.tipo_licencia;

    // Si actualizan el dueño, buscamos por el nuevo username
    if (updateLicenciaDto.username !== undefined) {
      const usuarioEncontrado = await this.buscarUsuario(updateLicenciaDto.username);
      if (!usuarioEncontrado) {
        throw new NotFoundException('El nuevo usuario especificado no existe');
      }
      licencia.usuario = usuarioEncontrado;
    }

    return await this.licenciaRepository.save(licencia);
  }

  /** Elimina una licencia. */
  async EliminarLicencia(licenciaId: string): Promise<LicenciaEntity> {
    const licencia = await this.ObtenerLicenciaId(licenciaId);
    return await this.licenciaRepository.remove(licencia);
  }
}