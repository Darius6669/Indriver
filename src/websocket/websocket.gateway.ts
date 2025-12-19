import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway( {
  cors: {
    origin: '*',
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
})
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('BusGateway');

  // Mapa para guardar los buses activos
  private activeBuses = new Map<string, {
    socket: Socket;
    interval: NodeJS.Timeout;
    lastLocation: { lat: number; lng: number; route: string };
    driverInfo?: any; // 👈 Para luego integrar con tu DB
  }>();

  afterInit(server: Server) {
    this.logger.log("Servidor de buses inicializado");
    this.logger.log("Socket escuchando en puerto 3000");
    this.logger.log("Modo: Solo conductores emiten, pasajeros escuchan");
  }

  handleConnection(client: Socket) {
    this.logger.log('Cliente conectado:',client.id);
    
    // Todos reciben confirmación de conexión
    client.emit('connection_established', {
      message: 'Conectado al servidor de buses',
      clientId: client.id,
      role: 'pending' // Será 'driver' o 'passenger' según lo que hagan
    });

    //  SOLO LOS CONDUCTORES USAN ESTE EVENTO
    client.on('driver_actions', (data: any) => {
      this.logger.log('Acción de conductor recibida:', data);
      
      if (data && data.action) {
        this.logger.log('Procesando acción:',data.action);
        
        switch (data.action) {
          case 'start_tracking':
            this.handleStartTracking(client, data.payload);
            break;
          case 'stop_tracking':
            this.handleStopTracking(client, data.payload);
            break;
          case 'update_location':
            this.handleUpdateLocation(client, data.payload);
            break;
          case 'get_active_buses':
            this.handleGetActiveBuses(client, data.payload);
            break;
          default:
            this.logger.warn('Acción no reconocida:',data.action);
        }
      }
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log('Cliente desconectado: ',client.id);
    this.stopAutomaticTrackingBySocketId(client.id);
  }

  // ========== ACCIONES EXCLUSIVAS DE CONDUCTORES ==========

  private handleStartTracking(client: Socket, data: any) {
    this.logger.log('Conductor iniciando tracking:', data);
    
    if (!data || !data.busId || !data.initialLat || !data.initialLng) {
      this.logger.error(' Datos incompletos para iniciar tracking');
      client.emit('driver_error', { 
        message: 'Datos incompletos. Se requiere busId, initialLat, initialLng' 
      });
      return;
    }

    this.logger.log('Iniciando tracking para bus:', data.busId);
    
    this.startAutomaticTracking(
      client, 
      data.busId, 
      data.initialLat, 
      data.initialLng, 
      data.route || 'Ruta General',
      data.driverInfo // Para integrar con tu DB después
    );
  }

  private handleStopTracking(client: Socket, data: any) {
    this.logger.log('Conductor deteniendo tracking:', data);
    
    if (!data || !data.busId) {
      client.emit('driver_error', { message: 'Se requiere busId' });
      return;
    }
    
    this.stopAutomaticTracking(data.busId);
    
    client.emit('tracking_stopped', {
      success: true,
      busId: data.busId,
      message: 'Tracking detenido'
    });
  }

  private handleUpdateLocation(client: Socket, data: any) {
    this.logger.log('Actualización manual de ubicación:', data);
    
    if (!data || !data.busId || !data.lat || !data.lng) {
      client.emit('driver_error', { message: 'Datos incompletos para ubicación' });
      return;
    }

    // Actualizar ubicación manualmente
    const bus = this.activeBuses.get(data.busId);
    if (bus) {
      bus.lastLocation = { 
        lat: data.lat, 
        lng: data.lng, 
        route: data.route || bus.lastLocation.route 
      };
    }

    // 📢 Notificar a TODOS los pasajeros
    this.server.emit('bus_location_update', {
      busId: data.busId,
      lat: data.lat,
      lng: data.lng,
      route: data.route,
      timestamp: Date.now(),
      type: 'manual_update'
    });

    client.emit('location_updated', {
      success: true,
      message: 'Ubicación actualizada manualmente'
    });
  }

  private handleGetActiveBuses(client: Socket, data: any) {
    this.logger.log('Conductor solicitando buses activos');
    
    const buses = Array.from(this.activeBuses.entries()).map(([busId, busData]) => ({
      busId,
      route: busData.lastLocation.route,
      lastLocation: busData.lastLocation,
      lastUpdate: Date.now()
    }));

    client.emit('active_buses_list', { 
      buses,
      total: buses.length,
      timestamp: new Date().toISOString()
    });
  }

  // ========== LÓGICA DE TRACKING AUTOMÁTICO ==========

  private startAutomaticTracking(
    client: Socket, 
    busId: string, 
    initialLat: number, 
    initialLng: number, 
    route: string,
    driverInfo?: any
  ) {
    // Si ya existe, limpiar primero
    if (this.activeBuses.has(busId)) {
      this.stopAutomaticTracking(busId);
    }

    this.logger.log('Iniciando tracking automático para:','busId');

    let currentLat = initialLat;
    let currentLng = initialLng;

    // Intervalo de actualización automática
    const interval = setInterval(() => {
      // Simular movimiento (luego vendrá de GPS real)
      currentLat += (Math.random() - 0.5) * 0.001;
      currentLng += (Math.random() - 0.5) * 0.001;
      
      this.logger.log('Bus:' ,busId,'en:', currentLat.toFixed(6), currentLng.toFixed(6));
      
      // 📢 ENVIAR A TODOS LOS PASAJEROS
      this.server.emit('bus_location_update', {
        busId: busId,
        lat: currentLat,
        lng: currentLng,
        route: route,
        timestamp: Date.now(),
        speed: Math.random() * 60 + 20,
        type: 'automatic_update'
      });

      // Actualizar última ubicación
      const bus = this.activeBuses.get(busId);
      if (bus) {
        bus.lastLocation = { lat: currentLat, lng: currentLng, route };
      }
    }, 20000); // Cada 20 segundos

    // Guardar bus con su información
    this.activeBuses.set(busId, {
      socket: client,
      interval: interval,
      lastLocation: { lat: initialLat, lng: initialLng, route },
      driverInfo: driverInfo // 👈 Listo para tu DB
    });

    // 📢 Notificar a TODOS los pasajeros del nuevo bus
    this.server.emit('new_bus_available', { 
      busId: busId, 
      route: route,
      initialLocation: { lat: initialLat, lng: initialLng },
      timestamp: new Date().toISOString()
    });

    // ✅ Confirmar al conductor
    client.emit('tracking_started', {
      success: true,
      busId: busId,
      message: 'Tracking automático iniciado - Actualizaciones cada 20s',
      timestamp: new Date().toISOString()
    });

    this.logger.log('Tracking activo para :',busId);
  }

  private stopAutomaticTracking(busId: string) {
    const bus = this.activeBuses.get(busId);
    if (bus) {
      clearInterval(bus.interval);
      this.activeBuses.delete(busId);
      this.logger.log('Tracking detenido para: ',busId);
      
      // 📢 Notificar a TODOS los pasajeros que el bus se fue
      this.server.emit('bus_disconnected', { 
        busId,
        timestamp: new Date().toISOString()
      });
    }
  }

  private stopAutomaticTrackingBySocketId(socketId: string) {
    for (const [busId, bus] of this.activeBuses.entries()) {
      if (bus.socket.id === socketId) {
        this.stopAutomaticTracking(busId);
        break;
      }
    }
  }
}