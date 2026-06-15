import { Column, Entity, PrimaryColumn } from "typeorm";
import { IsEmail, IsNotEmpty, Min, Max } from 'class-validator';


@Entity('persona')
export class PersonaEntity {
    @PrimaryColumn({ type: 'varchar', length: 50 })
    @IsNotEmpty()
    cedula !: string;

    @Column({ type: 'varchar', length: 50 })   
    @IsNotEmpty()
    nombre !: string;

    @Column({ type: 'varchar', length: 50 }) 
    @IsNotEmpty()
    apellido !: string;

    @Column({ type: 'varchar', length: 50 }) 
    @IsNotEmpty()
    @IsEmail()
    email !: string;

    @Column({ type: 'varchar', length: 12 }) 
    @IsNotEmpty()
    telefono !: string;


    @Column({ type: 'int' }) 
    @IsNotEmpty()
    @Min(18)
    @Max(130)
    edad !: number;
}