import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePersonaDto } from 'src/dtos/personadto/Create_persona.dto';
import { UpdatePersonaDto } from 'src/dtos/personadto/Updatedto_Persona.dto';
import { PersonaEntity } from 'src/entidades/persona.entity';
import { Repository } from 'typeorm';
/**
 * Servicio de personas. Gestiona el CRUD de la entidad Persona, que se
 * relaciona 1:1 con Usuario mediante la cédula.
 */
@Injectable()
export class PersonasService {
  // Repositorio TypeORM de la entidad Persona.
  constructor(
    @InjectRepository(PersonaEntity)
    private personasRepository: Repository<PersonaEntity>,
  ) {}

  /** Indica si ya existe una persona con esa cédula (true) o no (false). */
  async ValidarCedula(cedula: string): Promise<boolean> {
    const persona = await this.personasRepository.findOne({
      where: { cedula: cedula },
    });
    if (persona) {
      return true;
    }
    return false;
  }

  /**
   * Crea una persona nueva. Antes de insertar valida que la cédula no esté ya
   * registrada (se usa NotFoundException aunque semánticamente sea duplicado).
   */
  async Crear_Persona(
    createPersonaDto: CreatePersonaDto,
  ): Promise<PersonaEntity> {
    if (await this.ValidarCedula(createPersonaDto.cedula)) {
      throw new NotFoundException(
        `Esta  ${createPersonaDto.cedula} ya existe.`,
      );
    }
    // create() construye la entidad sin persistirla; save() la inserta.
    const persona = this.personasRepository.create(createPersonaDto);

    return this.personasRepository.save(persona);
  }

  /** Devuelve todas las personas registradas. */
  async ObtenerPersonas(): Promise<PersonaEntity[]> {
    return this.personasRepository.find();
  }

  /** Busca una persona por cédula; lanza NotFoundException si no existe. */
  async ObtenerPersonaPorId(cedula: string): Promise<PersonaEntity> {
    const persona = await this.personasRepository.findOne({
      where: { cedula: cedula },
    });
    if (!persona) {
      throw new NotFoundException(`Esta  ${cedula} no encontrado.`);
    }
    return persona;
  }

  /**
   * Elimina la persona. Reutiliza ObtenerPersonaPorId para asegurar que exista
   * (y lanzar 404 en caso contrario) antes de borrarla.
   */
  async eliminarPersona(cedula: string): Promise<PersonaEntity> {
    return await this.personasRepository.remove(
      await this.ObtenerPersonaPorId(cedula),
    );
  }

  /**
   * Actualiza parcialmente la persona: cada campo se sobrescribe solo si viene
   * en el DTO; en caso contrario se conserva el valor actual (operador ??).
   */
  async ActualizarPersona(
    cedula: string,
    UpdatePersonaDto: UpdatePersonaDto,
  ): Promise<PersonaEntity> {
    const persona = await this.ObtenerPersonaPorId(cedula);
    if (persona) {
      persona.nombre = UpdatePersonaDto.nombre ?? persona.nombre;
      persona.apellido = UpdatePersonaDto.apellido ?? persona.apellido;
      persona.edad = UpdatePersonaDto.edad ?? persona.edad;
      persona.email = UpdatePersonaDto.email ?? persona.email;
      persona.telefono = UpdatePersonaDto.telefono ?? persona.telefono;
      return this.personasRepository.save(persona);
    }
    // Defensivo: ObtenerPersonaPorId ya lanza 404, pero se mantiene el respaldo.
    throw new NotFoundException(`Persona con cédula ${cedula} no encontrada.`);
  }
}
