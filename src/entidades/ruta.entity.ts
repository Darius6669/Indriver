import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { IsEmail, IsNotEmpty, Min, Max } from 'class-validator';
import { CooperativaEntity } from "./cooperativa.entity";
import { ControlRutaEntity } from "./ControlRuta.entity";
import { ViajesEntity } from "./Viajes.entity";

@Entity('ruta')
export class RutaEntity {
    @PrimaryColumn({ type: 'varchar', length: 50})
    @IsNotEmpty()
    numero_ruta !: string;


    @Column({ type: 'varchar', length: 50 })   
    @IsNotEmpty()
    nombre !: string;

    @Column({ type: 'text' }) 
    @IsNotEmpty()
    descripcion !: string;

    @Column({ type: 'int' }) 
    @IsNotEmpty()
    tarifa !: number;

   
    @ManyToOne(() => CooperativaEntity, cooperativa => cooperativa.rutas)
    @JoinColumn({ name: 'cooperativa_id'})
    cooperativa !: CooperativaEntity;


    @ManyToOne(() => ControlRutaEntity, controlruta => controlruta.rutaOrigen)
    @JoinColumn({ name: 'origen_id'})
    origen !: ControlRutaEntity;


    @ManyToOne(() => ControlRutaEntity, controlruta => controlruta.rutaDestino)
    @JoinColumn({ name: 'destino_id'})
    destino !: ControlRutaEntity;

    @OneToMany(() => ViajesEntity, (viaje) => viaje.ruta)
    viajes !: ViajesEntity[];
    

}