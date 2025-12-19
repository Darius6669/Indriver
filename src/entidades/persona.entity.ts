import { Column, Entity, PrimaryColumn } from "typeorm";
import { IsEmail, IsNotEmpty, Min, Max } from 'class-validator';


@Entity('Persona')
export class PersonaEntity {
    @PrimaryColumn({ type: 'varchar', length: 50 })
    @IsNotEmpty()
    Cedula : string;

    @Column({ type: 'varchar', length: 50 })   
    @IsNotEmpty()
    Nombre : string;

    @Column({ type: 'varchar', length: 50 }) 
    @IsNotEmpty()
    Apellido : string;

    @Column({ type: 'varchar', length: 50 }) 
    @IsNotEmpty()
    @IsEmail()
    Email : string;

    @Column({ type: 'varchar', length: 12 }) 
    @IsNotEmpty()
    Telefono : string;


    @Column({ type: 'int' }) 
    @IsNotEmpty()
    @Min(18)
    @Max(130)
    Edad : number;
}