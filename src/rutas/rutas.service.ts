import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateRutasDto } from 'src/dtos/rutasdto/Create_Rutas.dto';
import { UpdateRutaDto } from 'src/dtos/rutasdto/Updatedto.dto';
import { ControlRutaEntity } from 'src/entidades/ControlRuta.entity';
import { CooperativaEntity } from 'src/entidades/cooperativa.entity';
import { RutaEntity } from 'src/entidades/ruta.entity';
import { RutaParadaEntity } from 'src/entidades/ruta-parada.entity'; 
import { Repository } from 'typeorm';

@Injectable()
export class RutasService {
  constructor(
    @InjectRepository(RutaEntity)
    private rutaRepository: Repository<RutaEntity>,
    @InjectRepository(CooperativaEntity)
    private cooperativaRepository: Repository<CooperativaEntity>,
    @InjectRepository(ControlRutaEntity)
    private controlRepository: Repository<ControlRutaEntity>,
    @InjectRepository(RutaParadaEntity) // <-- INYECTAMOS EL REPO
    private rutaParadaRepository: Repository<RutaParadaEntity>,
  ) {}

  async crearRuta(createRutadto: CreateRutasDto): Promise<RutaEntity> {
    // 1. Validar relaciones base (cooperativa y origen)
    const cooperativa = await this.cooperativaRepository.findOne({
      where: { rif_cooperativa: createRutadto.cooperativa_id },
    });
    const origen = await this.controlRepository.findOne({
      where: { id_control: createRutadto.origen_id },
    });

    if (!cooperativa) throw new NotFoundException(`Cooperativa ${createRutadto.cooperativa_id} no encontrada.`);
    if (!origen) throw new NotFoundException(`Control de origen con ID ${createRutadto.origen_id} no encontrado.`);

    // 2. ¡VALIDACIÓN DE LAS PARADAS!
    if (createRutadto.paradas && createRutadto.paradas.length > 0) {
      // Buscamos cuántas de las paradas enviadas existen realmente en la BD
      const paradasExistentes = await this.controlRepository.find({
        where: createRutadto.paradas.map(id => ({ id_control: id })),
      });

      // Si la cantidad de paradas encontradas no es igual a las enviadas, es porque alguna no existe
      if (paradasExistentes.length !== createRutadto.paradas.length) {
        // Sacamos los IDs que fallaron para dar un mensaje claro
        const idsEncontrados = paradasExistentes.map(p => p.id_control);
        const idsFaltantes = createRutadto.paradas.filter(id => !idsEncontrados.includes(id));

        throw new NotFoundException(
          `Las siguientes paradas (IDs) no existen en el sistema: [${idsFaltantes.join(', ')}]. Por favor verifícalas.`
        );
      }
    }

    // 3. Crear la Ruta
    const nuevaRuta = new RutaEntity();
    nuevaRuta.numero_ruta = createRutadto.numero_ruta;
    nuevaRuta.nombre = createRutadto.nombre;
    nuevaRuta.descripcion = createRutadto.descripcion;
    nuevaRuta.tarifa = createRutadto.tarifa;
    nuevaRuta.origen = origen;
    nuevaRuta.cooperativa = cooperativa;
    
    const rutaGuardada = await this.rutaRepository.save(nuevaRuta);

    // 4. Guardar las paradas (Ya sabemos que todas existen, así que no fallará)
    if (createRutadto.paradas && createRutadto.paradas.length > 0) {
      const paradasAGuardar = createRutadto.paradas.map((idControl, index) => {
        return this.rutaParadaRepository.create({
          ruta: rutaGuardada,
          control: { id_control: idControl },
          orden: index + 1,
        });
      });
      await this.rutaParadaRepository.save(paradasAGuardar);
    }

    return rutaGuardada;
  }

  async obtenerrutas(): Promise<RutaEntity[]> {
    return this.rutaRepository.find({ relations: ['cooperativa'] });
  }

  async obtenerRutaPorId(numero_ruta: string): Promise<RutaEntity[]> {
    const ruta = await this.rutaRepository.find({
      where: { numero_ruta },
      relations: ['cooperativa'],
    });
    if (!ruta) {
      throw new NotFoundException(`Ruta con numero ${numero_ruta} no encontrada.`);
    }
    return ruta;
  }

  /** Método para buscar una ruta y sus paradas (El que creamos antes) */
  async obtenerRutaConParadas(numero_ruta: string) {
    // Usamos QueryBuilder para asegurar que las relaciones anidadas se carguen bien
    const ruta = await this.rutaRepository
      .createQueryBuilder('ruta')
      .leftJoinAndSelect('ruta.cooperativa', 'cooperativa')
      .leftJoinAndSelect('ruta.paradas', 'paradas')
      .leftJoinAndSelect('paradas.control', 'control')
      .where('ruta.numero_ruta = :numero_ruta', { numero_ruta })
      .getOne();

    if (!ruta) {
      throw new NotFoundException(`Ruta ${numero_ruta} no encontrada.`);
    }

    // Ordenamos las paradas por el número de orden
    const paradasOrdenadas = ruta.paradas.sort((a, b) => a.orden - b.orden);

    return {
      numero_ruta: ruta.numero_ruta,
      nombre: ruta.nombre,
      descripcion: ruta.descripcion,
      tarifa: ruta.tarifa,
      total_paradas: paradasOrdenadas.length,
      paradas: paradasOrdenadas.map((p) => ({
        orden: p.orden,
        // Aquí ya estamos 100% seguros de que p.control existe gracias al leftJoinAndSelect
        nombre: p.control.nombre,
        ubicacion: p.control.ubicacion,
        latitud: p.control.lactitud,
        longitud: p.control.longitud,
      })),
    };
  }

  async eliminarRuta(numero_ruta: string): Promise<RutaEntity> {
    const ruta = await this.rutaRepository.findOne({ where: { numero_ruta } });
    if (!ruta) throw new NotFoundException(`Ruta con numero ${numero_ruta} no encontrada.`);
    return await this.rutaRepository.remove(ruta);
  }

  async actualizarRuta(
    numero_ruta: string,
    updateRutaDto: UpdateRutaDto,
  ): Promise<RutaEntity> {
    const ruta = await this.rutaRepository.findOne({ 
      where: { numero_ruta },
      relations: ['paradas'] // Traemos las paradas actuales
    });

    if (!ruta) throw new NotFoundException(`Ruta con numero ${numero_ruta} no encontrada.`);

    if (updateRutaDto.cooperativa_id) {
      const cooperativa = await this.cooperativaRepository.findOne({
        where: { rif_cooperativa: updateRutaDto.cooperativa_id },
      });
      if (!cooperativa) throw new NotFoundException(`Cooperativa no encontrada.`);
      ruta.cooperativa = cooperativa;
    }

    if (updateRutaDto.origen_id) {
      const origen = await this.controlRepository.findOne({
        where: { id_control: updateRutaDto.origen_id },
      });
      if (!origen) throw new NotFoundException(`Control de origen no encontrado.`);
      ruta.origen = origen;
    }

    ruta.numero_ruta = updateRutaDto.numero_ruta ?? ruta.numero_ruta;
    ruta.nombre = updateRutaDto.nombre ?? ruta.nombre;
    ruta.descripcion = updateRutaDto.descripcion ?? ruta.descripcion;
    ruta.tarifa = updateRutaDto.tarifa ?? ruta.tarifa;
    
    const rutaActualizada = await this.rutaRepository.save(ruta);

    // Si envían nuevas paradas, borramos las viejas y metemos las nuevas
    if (updateRutaDto.paradas !== undefined) {
      // Borrar las paradas actuales de esta ruta
      await this.rutaParadaRepository.delete({ ruta: { id: rutaActualizada.id } });

      // Insertar las nuevas
      if (updateRutaDto.paradas.length > 0) {
        const nuevasParadas = updateRutaDto.paradas.map((idControl, index) => {
          return this.rutaParadaRepository.create({
            ruta: rutaActualizada,
            control: { id_control: idControl },
            orden: index + 1,
          });
        });
        await this.rutaParadaRepository.save(nuevasParadas);
      }
    }

    return rutaActualizada;
  }
}