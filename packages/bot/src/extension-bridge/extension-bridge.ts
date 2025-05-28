// Bridge para comunicação com extensão
import { Server as SocketServer } from 'socket.io';
import { Logger } from '../utils/logger';
import { ExtensionMessage, BotCommand, BotResponse } from '@bot-consulta/shared';

export class ExtensionBridge {
  private logger = new Logger('EXTENSION_BRIDGE');
  
  constructor(private io: SocketServer) {
    this.setupHandlers();
  }
  
  private setupHandlers(): void {
    this.io.on('connection', (socket) => {
      this.logger.info(`🔌 Extensão conectada: ${socket.id}`);
      
      socket.on('extension:message', (message: ExtensionMessage) => {
        this.handleExtensionMessage(socket.id, message);
      });
      
      socket.on('disconnect', () => {
        this.logger.info(`📴 Extensão desconectada: ${socket.id}`);
      });
    });
  }
  
  private handleExtensionMessage(socketId: string, message: ExtensionMessage): void {
    this.logger.info(`📨 Mensagem da extensão ${socketId}:`, message.type);
    
    switch (message.type) {
      case 'RESPONSE':
        this.handleExtensionResponse(socketId, message.payload as BotResponse);
        break;
      case 'STATUS':
        this.handleExtensionStatus(socketId, message.payload);
        break;
      default:
        this.logger.warn(`❓ Tipo de mensagem desconhecido: ${message.type}`);
    }
  }
  
  private handleExtensionResponse(socketId: string, response: BotResponse): void {
    this.logger.info(`📥 Resposta recebida para comando ${response.commandId}`);
    // Implementar processamento da resposta
  }
  
  private handleExtensionStatus(socketId: string, status: any): void {
    this.logger.info(`📊 Status da extensão ${socketId}:`, status);
    // Implementar processamento do status
  }
  
  sendCommandToExtension(socketId: string, command: BotCommand): void {
    this.logger.info(`📤 Enviando comando para extensão ${socketId}:`, command.type);
    
    const message: ExtensionMessage = {
      type: 'COMMAND',
      payload: command,
      timestamp: new Date().toISOString()
    };
    
    this.io.to(socketId).emit('bot:command', message);
  }
}