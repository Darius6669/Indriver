import { Column, Entity, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { IsEmail, IsNotEmpty, Min, Max } from 'class-validator';
import { ViajesEntity } from "./Viajes.entity";

@Entity('incidencias')
export class IncidenciasEntity{
    @PrimaryGeneratedColumn()
    incidencias_id !: number;

    @Column({type: 'text'})
    @IsNotEmpty()
    descripcion !: string;

    @Column({type: 'varchar', length: 50})
    @IsNotEmpty()
    estado !: string;

    @OneToMany(() => ViajesEntity, (viaje) => viaje.incidencia)
    viajes !: ViajesEntity[];

}