import { Column, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { IsEmail, IsNotEmpty, Min, Max } from 'class-validator';
import { RutaEntity } from "./ruta.entity";
import { VehiculosEntity } from "./vehiculos.entity";

@Entity('cooperativa')
export class CooperativaEntity {
    @PrimaryColumn({ type: 'varchar', length: 50 })
    @IsNotEmpty()
    rif_cooperativa : string;


    @Column({ type: 'varchar', length: 50 })   
    @IsNotEmpty()
    nombre : string;


    @Column({ type: 'varchar', length: 100 }) 
    @IsNotEmpty()
    ubicacion : string;


    @Column({ type: 'varchar'})
    @IsNotEmpty()
    descripcion : string;


    @Column({ type: 'varchar' })
    @IsNotEmpty()
    horario : string;


    @OneToMany(() => RutaEntity, ruta => ruta.cooperativa)
    rutas: RutaEntity[];


    @OneToMany(() => VehiculosEntity, vehiculo => vehiculo.cooperativa)
    unidad: VehiculosEntity[];
}