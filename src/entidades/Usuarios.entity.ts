import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { IsEmail, IsNotEmpty, Min, Max } from 'class-validator';
import { ViajesEntity } from "./Viajes.entity";
import { PersonaEntity } from "./persona.entity";
import { CooperativaEntity } from "./cooperativa.entity";

@Entity('usuario')
export class UsuariosEntity{
    @PrimaryGeneratedColumn()
    user_id !: number;

    @Column({ type: 'varchar', length: 50 })
    @IsNotEmpty()
    username !: string;

    @Column({ type: 'varchar', length: 50 })   
    @IsNotEmpty()
    contrasena !: string;

    @Column({ type: 'boolean', default: false })
    status !: boolean;

    @Column({ type: 'varchar', length: 50 })
    rol !: string;

    @OneToMany(() => ViajesEntity, (viaje) => viaje.usuario)
    viajes !: ViajesEntity[];
    
    @OneToOne(() => PersonaEntity, (persona) => persona.usuarios)
    @JoinColumn({ name: 'cedula_id' })
    persona !: PersonaEntity;

    @ManyToOne(() => CooperativaEntity, cooperativa => cooperativa.usuarios)
    @JoinColumn({ name: 'cooperativa_id' })
    cooperativa !: CooperativaEntity;

}