import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { IsEmail, IsNotEmpty, Min, Max } from 'class-validator';
import { RutaEntity } from "./ruta.entity";

@Entity('rutacontrol')
export class ControlRutaEntity{

    @PrimaryGeneratedColumn()
    id_control : number;


    @Column({ type: 'varchar', length : 50})
    @IsNotEmpty()
    nombre : string;


    @Column({type : 'varchar'})
    @IsNotEmpty()
    descripcion : string;


    @Column({ type: 'varchar', length : 50})
    @IsNotEmpty()
    ubicacion : string;

    @Column({ type : 'double precision'})
    @IsNotEmpty()
    lactitud : number;


    @Column({ type : 'double precision'})
    @IsNotEmpty()
    longitud : number;


    @OneToMany(() => RutaEntity , ruta => ruta.origen)
    rutaOrigen : RutaEntity[];


    @OneToMany(() => RutaEntity , ruta => ruta.destino)
    rutaDestino : RutaEntity[];

}