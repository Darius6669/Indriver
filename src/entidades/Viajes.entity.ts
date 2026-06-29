import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { IsEmail, IsNotEmpty, Min, Max } from 'class-validator';
import { VehiculosEntity } from "./vehiculos.entity";
import { RutaEntity } from "./ruta.entity";
import { IncidenciasEntity } from "./Incidencias.entity";
import { UsuariosEntity } from "./Usuarios.entity";

@Entity('viaje')
export class ViajesEntity{
    @PrimaryGeneratedColumn()
    id_viaje !: number;

    @Column({type:'timestamp'})
    @IsNotEmpty()
    fecha_inicio !: Date;

    @Column({type:'timestamp'})
    @IsNotEmpty()
    fecha_final !: Date;

    @Column({type:'double precision'})
    @IsNotEmpty()
    lactitud !: number;

    @Column({type:'double precision'})
    @IsNotEmpty()
    longitud !: number;

    @ManyToOne(() => UsuariosEntity, (usuario) => usuario.viajes)
    @JoinColumn({ name: 'user_id' })
    usuario !: UsuariosEntity;

    @ManyToOne(() => IncidenciasEntity, (incidencia) => incidencia.viajes, { nullable: true })
    @JoinColumn({ name: 'incidencia_id' })
    incidencia?: IncidenciasEntity | null;

    @ManyToOne(() => VehiculosEntity,vehiculo => vehiculo.viajes)
    @JoinColumn({ name: 'vehiculo_id' })
    vehiculo !: VehiculosEntity;

     @ManyToOne(() => RutaEntity, (ruta) => ruta.viajes)
     @JoinColumn({ name: 'ruta_id' })
     ruta !: RutaEntity;
     

}