// Getter perezoso a proposito: ConfigModule.forRoot() carga el .env cuando se
// instancia AppModule, despues de que este archivo ya fue evaluado. Leyendo
// process.env dentro del getter, el valor llega populado.
export const jwtConstants = {
  get secret(): string {
    return process.env.JWT_SECRET || 'IndriverTracking_SecretKey';
  },
  get expiresIn(): string {
    // 1h es insuficiente para un turno completo de conduccion: el telefono
    // perderia el token a mitad de viaje.
    return process.env.JWT_EXPIRES_IN || '24h';
  },
};
