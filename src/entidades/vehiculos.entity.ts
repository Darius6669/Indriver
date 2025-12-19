import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { IsEmail, IsNotEmpty, Min, Max } from 'class-validator';
import { CooperativaEntity } from "./cooperativa.entity";

@Entity('vehiculos')
export class VehiculosEntity{

    @PrimaryColumn({ type: 'varchar', length: 50 })
    @IsNotEmpty()
    placa : string;


    @Column({ type: 'varchar', length: 50 })   
    @IsNotEmpty()
    modelo : string;


    @Column({ type: 'varchar', length: 50 })   
    @IsNotEmpty()
    color : string;


    @Column({ type: 'timestamp'})   
    @IsNotEmpty()
    anofabricacion : Date;

    @ManyToOne(() => CooperativaEntity, cooperativa => cooperativa.unidad)
    @JoinColumn({ name: 'cooperativa_id'})
    cooperativa: CooperativaEntity;
    
}