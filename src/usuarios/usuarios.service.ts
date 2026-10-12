import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUsuarioDTO } from 'src/dtos/usuarios/Create_usuario.dto';
import { UpdateUsuarioDTO } from 'src/dtos/usuarios/Update_usuario.dto';
import { UsuariosEntity } from 'src/entidades/Usuarios.entity';
import { PersonaEntity } from 'src/entidades/persona.entity';
import { CooperativaEntity } from 'src/entidades/cooperativa.entity';
import * as bcrypt from 'bcrypt';

/**
 * Fila "cruda" que devuelve la consulta de usuarios por cooperativa. No es una
 * entidad: son columnas aplanadas de persona + cooperativa + usuario.
 */
export interface UsuarioCooperativaRow {
  persona_nombre: string;
  persona_apellido: string;
  persona_cedula: string;
  cooperativa_nombre: string;
  cooperativa_rif: string;
  username: string;
}

/**
 * Servicio de usuarios. Contiene la lógica de negocio para crear, consultar,
 * actualizar y eliminar usuarios, además de las validaciones de las entidades
 * relacionadas (persona y cooperativa) y el manejo de contraseñas con bcrypt.
 */
@Injectable()
export class UsuariosService {
  // Repositorios TypeORM inyectados para operar sobre cada tabla relacionada.
  constructor(
    @InjectRepository(UsuariosEntity)
    private usuariosRepository: Repository<UsuariosEntity>,
    @InjectRepository(PersonaEntity)
    private personaRepository: Repository<PersonaEntity>,
    @InjectRepository(CooperativaEntity)
    private cooperativaRepository: Repository<CooperativaEntity>,
  ) {}

  /**
   * Verifica que exista una persona con la cédula dada.
   * Lanza NotFoundException si no está registrada; si existe, la devuelve.
   */
  async ValidarPersona(cedula: string): Promise<PersonaEntity> {
    const persona = await this.personaRepository.findOne({
      where: { cedula: cedula },
    });
    if (!persona) {
      throw new NotFoundException(
        `La persona con cédula ${cedula} no esta registrada.`,
      );
    }
    return persona;
  }

  /**
   * Verifica que exista una cooperativa con el RIF dado.
   * Lanza NotFoundException si no está registrada; si existe, la devuelve.
   */
  async ValidarCooperativa(
    rif_cooperativa: string,
  ): Promise<CooperativaEntity> {
    const cooperativa = await this.cooperativaRepository.findOne({
      where: { rif_cooperativa: rif_cooperativa },
    });
    if (!cooperativa) {
      throw new NotFoundException(
        `La cooperativa con rif ${rif_cooperativa} no esta registrada.`,
      );
    }
    return cooperativa;
  }

  /**
   * Igual que ObtenerUsuarioUsername pero usando HttpException(404) en lugar
   * de NotFoundException. Se conserva tal cual por compatibilidad.
   */
  async validarUsuario(username: string): Promise<UsuariosEntity> {
    const usuario = await this.usuariosRepository.findOne({
      where: { username: username },
    });
    if (!usuario) {
      throw new HttpException(
        `El usuario con username ${username} no esta registrado.`,
        404,
      );
    }
    return usuario;
  }

  /** Indica si ya existe un usuario con ese username (true/false). */
  async ExisteUsuario(username: string): Promise<boolean> {
    const usuario = await this.usuariosRepository.findOne({
      where: { username: username },
    });
    // El doble negador convierte la entidad (o null) en un booleano.
    return !!usuario;
  }

  /**
   * Genera un salt aleatorio y aplica el hash bcrypt a la contraseña.
   * El salt se guarda implícitamente dentro del propio hash resultante.
   */
  async EncriptarPassword(password: string): Promise<string> {
    const salto = await bcrypt.genSalt(10);
    const contrasenaEncriptada = await bcrypt.hash(password, salto);
    return contrasenaEncriptada;
  }

  /**
   * Crea un usuario nuevo validando primero que existan la persona y la
   * cooperativa referenciadas y que el username no esté duplicado. Encripta la
   * contraseña, activa el status y persiste la entidad.
   */
  async CreateUsuario(
    createUsuarioDTO: CreateUsuarioDTO,
  ): Promise<UsuariosEntity> {
    const persona = await this.ValidarPersona(createUsuarioDTO.cedula_id);
    const cooperativa = await this.ValidarCooperativa(
      createUsuarioDTO.cooperativa_id,
    );
    const Existe = await this.ExisteUsuario(createUsuarioDTO.username);
    if (Existe) {
      // El username ya está tomado; se rechaza la creación.
      throw new NotFoundException(
        `El usuario con username ${createUsuarioDTO.username} ya esta registrado tambien podria usar su correo electronico.`,
      );
    } else {
      // Con persona y cooperativa validadas se construye y guarda la entidad.
      if (persona && cooperativa) {
        const Usuario = new UsuariosEntity();
        Usuario.username = createUsuarioDTO.username;
        Usuario.contrasena = await this.EncriptarPassword(
          createUsuarioDTO.contrasena,
        );
        Usuario.rol = createUsuarioDTO.rol;
        Usuario.status = true;
        Usuario.persona = persona;
        Usuario.cooperativa = cooperativa;
        return this.usuariosRepository.save(Usuario);
      } else {
        // Defensivo: si alguna validación no lanzó, se informa aquí.
        throw new NotFoundException(
          `La persona con cédula ${createUsuarioDTO.cedula_id} o la cooperativa con rif ${createUsuarioDTO.cooperativa_id} no estan registradas.`,
        );
      }
    }
  }

  /** Devuelve todos los usuarios sin relaciones cargadas. */
  async ObtenerUsuarios(): Promise<UsuariosEntity[]> {
    return this.usuariosRepository.find();
  }

  /**
   * Busca un usuario por username. Lanza NotFoundException si no existe.
   */
  async ObtenerUsuarioUsername(username: string): Promise<UsuariosEntity> {
    const usuario = await this.usuariosRepository.findOne({
      where: { username: username },
    });
    if (!usuario) {
      throw new NotFoundException(
        `El usuario con username ${username} no esta registrado.`,
      );
    }
    return usuario;
  }

  /**
   * Consulta con QueryBuilder que devuelve filas aplanadas (join de persona +
   * cooperativa + usuario) filtrando por nombre de cooperativa parcial. Se usa
   * getRawMany porque el resultado no corresponde a una entidad.
   */
  async ObtenerUsuariosCooperativa(
    cooperativa: string,
  ): Promise<UsuarioCooperativaRow[]> {
    const usuarios = await this.usuariosRepository
      .createQueryBuilder('usuario')
      .innerJoin('usuario.persona', 'persona')
      .innerJoin('usuario.cooperativa', 'cooperativa')
      // ILIKE + comodines: coincidencia sin distinguir mayúsculas ni parcial.
      .where('cooperativa.nombre ILIKE :nombre', { nombre: `%${cooperativa}%` })
      .select([
        'persona.nombre AS persona_nombre',
        'persona.apellido AS persona_apellido',
        'persona.cedula AS persona_cedula',
        'cooperativa.nombre AS cooperativa_nombre',
        'cooperativa.rif_cooperativa AS cooperativa_rif',
        'usuario.username AS username',
      ])
      .getRawMany<UsuarioCooperativaRow>();

    if (!usuarios || usuarios.length === 0) {
      throw new NotFoundException(
        'No ya Usuarios registrados con la cooperativa especificada.',
      );
    }
    return usuarios;
  }

  /**
   * Elimina el usuario indicado. Reutiliza ObtenerUsuarioUsername para que
   * lance 404 si no existe antes de intentar borrarlo.
   */
  async eliminarUsuario(username: string): Promise<UsuariosEntity> {
    return this.usuariosRepository.remove(
      await this.ObtenerUsuarioUsername(username),
    );
  }

  /**
   * Actualiza parcialmente un usuario. Si llega contraseña se re-encripta y si
   * llegan cédula y cooperativa juntas se reasignan las relaciones; el resto de
   * campos se sobrescriben solo si vienen en el DTO (operador ?? conserva el
   * valor actual cuando son undefined/null). Al final recarga el usuario.
   */
  async actualizarUsuario(
    username: string,
    updateusuarioDTO: UpdateUsuarioDTO,
  ): Promise<UsuariosEntity> {
    const existeUsuario = await this.ObtenerUsuarioUsername(username);
    if (!existeUsuario) {
      throw new NotFoundException(
        `El usuario con username ${username} no esta registrado.`,
      );
    } else {
      // Solo se re-encripta si el cliente envió una nueva contraseña.
      if (updateusuarioDTO.contrasena) {
        const pass = await this.EncriptarPassword(updateusuarioDTO.contrasena);
        existeUsuario.contrasena = pass ?? existeUsuario.contrasena;
      }
      existeUsuario.username =
        updateusuarioDTO.username ?? existeUsuario.username;
      existeUsuario.status = updateusuarioDTO.status ?? existeUsuario.status;
      // Las relaciones persona/cooperativa se actualizan solo si vienen ambas.
      if (updateusuarioDTO.cedula_id && updateusuarioDTO.cooperativa_id) {
        const persona = await this.ValidarPersona(updateusuarioDTO.cedula_id);
        const cooperativa = await this.ValidarCooperativa(
          updateusuarioDTO.cooperativa_id,
        );
        existeUsuario.persona = persona;
        existeUsuario.cooperativa = cooperativa;
      } else {
        throw new NotFoundException(
          `La persona con cédula ${updateusuarioDTO.cedula_id} o la cooperativa con rif ${updateusuarioDTO.cooperativa_id} no estan registradas.`,
        );
      }

      const update = await this.usuariosRepository.save(existeUsuario);
      // Se recarga desde BD para devolver el estado persistido final.
      return await this.ObtenerUsuarioUsername(update.username);
    }
  }
}
