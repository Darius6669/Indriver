import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RutaEntity } from './ruta.entity';
import { ControlRutaEntity } from './ControlRuta.entity';

@Entity('ruta_parada')
export class RutaParadaEntity {
  @PrimaryGeneratedColumn()
  id_ruta_parada!: number;

  @Column()
  orden!: number;

  @ManyToOne(() => RutaEntity, (ruta) => ruta.paradas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruta_id' })
  ruta!: RutaEntity;

  @ManyToOne(() => ControlRutaEntity, (control) => control.rutaParadas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'control_id' })
  control!: ControlRutaEntity;
}