// ============================================================================
// APLICAÇÃO PRINCIPAL DO BOT EXTERNO (SERVIDOR NODE.JS)
// ============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { Server as SocketServer } from 'socket.io';
import { createServer } from 'http';
import {
  BotCommand,
  BotCommandTypes,
  BotResponse,
  ExtensionMessage,
  COMMUNICATION_CONSTANTS,
  consultaCascataAssincrona,
  ParametrosConsulta
} from '@bot-consulta/shared';

// ============================================================================
// INTERFACES PARA BOT
// ============================================================================

interface BotState {
  isRunning: boolean;
  connectedExtensions: Map<string, any>;
  activeCommands: Map<string, any>;
  startTime: string;
}

interface ExtensionConnection {
  id: string;
  socket: any;
  lastHeartbeat: string;
  status: 'connected' | 'disconnected';
}

// ============================================================================
// CLASSE PRINCIPAL DO BOT
// ============================================================================

export class BotApplication {
  private app: express.Application;
  private server: any;
  private io: SocketServer;
  private state: BotState;
  private logger: any;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: true
      },
      allowEIO3: true,
      transports: ['websocket', 'polling']
    });

    this.state = {
      isRunning: false,
      connectedExtensions: new Map(),
      activeCommands: new Map(),
      startTime: new Date().toISOString()
    };

    this.logger = {
      info: (msg: string) => console.log(`[${new Date().toISOString()}] [INFO] ${msg}`),
      error: (msg: string) => console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`),
      warn: (msg: string) => console.warn(`[${new Date().toISOString()}] [WARN] ${msg}`)
    };

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  // ============================================================================
  // CONFIGURAÇÃO DO SERVIDOR
  // ============================================================================

  private setupMiddleware(): void {
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false
    }));
    this.app.use(cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["*"],
      credentials: true
    }));
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Middleware de logging
    this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.info(`${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
this.app.get('/api/status', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: Date.now() - new Date(this.state.startTime).getTime(),
    connectedExtensions: this.state.connectedExtensions.size,
    isRunning: this.state.isRunning
  });

// Endpoint para sistema de cascata executar comandos na extensão
this.app.post('/api/extension/execute-command', async (req: express.Request, res: express.Response) => {
  try {
    const comando = req.body;
    this.logger.info(`🔄 Executando comando na extensão: ${comando.type}`);
    
    // Verificar se há extensão conectada
    const extensions = Array.from(this.state.connectedExtensions.values());
    
    if (extensions.length === 0) {
      throw new Error('Nenhuma extensão conectada para executar comando');
    }
    
    const extension = extensions[0]; // Usar primeira extensão disponível
    
    // Enviar comando para extensão via Socket.IO
    if (extension.socket) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout aguardando resposta da extensão'));
        }, 60000); // 60 segundos timeout
        
        // Listener para resposta
        extension.socket.once('extension:response', (response: any) => {
          clearTimeout(timeout);
          this.logger.info(`✅ Resposta recebida da extensão: ${response.success ? 'Sucesso' : 'Erro'}`);
          res.json(response);
          resolve(response);
        });
        
        // Enviar comando
        extension.socket.emit('bot:command', {
          type: 'COMMAND',
          payload: comando,
          timestamp: new Date().toISOString()
        });
        
        this.logger.info(`📤 Comando enviado para extensão: ${comando.type}`);
      });
    } else {
      throw new Error('Extensão conectada via HTTP não suporta comandos push');
    }
    
  } catch (error) {
    this.logger.error(`❌ Erro ao executar comando: ${error}`);
    res.status(400).json({
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});


});

    // Estatísticas do sistema de cascata
    this.app.get('/api/cascata/stats', (req: express.Request, res: express.Response) => {
      const stats = consultaCascataAssincrona.obterEstatisticas();
      res.json(stats);
    });

    // Tempos estimados
    this.app.get('/api/cascata/tempos', (req: express.Request, res: express.Response) => {
      const tempos = consultaCascataAssincrona.obterTemposEstimados();
      res.json(tempos);
    });

    // Iniciar consulta em cascata
    this.app.post('/api/consulta-cascata', async (req: express.Request, res: express.Response) => {
      try {
        const parametros: ParametrosConsulta = req.body;
        const consultaId = await consultaCascataAssincrona.adicionarConsultaCarros(parametros);
        
        res.json({
          success: true,
          consultaId,
          message: 'Consulta em cascata iniciada',
          parametros
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: (error as Error).message
        });
      }
    });

    // Iniciar lote de consultas
    this.app.post('/api/consulta-cascata/lote', async (req: express.Request, res: express.Response) => {
      try {
        const listaParametros: ParametrosConsulta[] = req.body.consultas;
        const consultaIds = await consultaCascataAssincrona.adicionarConsultasEmLote(listaParametros);
        
        res.json({
          success: true,
          consultaIds,
          total: consultaIds.length,
          message: 'Lote de consultas iniciado'
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: (error as Error).message
        });
      }
    });

    // Endpoint específico para extensão testar conexão
    this.app.get('/api/extension/test', (req: express.Request, res: express.Response) => {
      res.json({
        success: true,
        message: 'Bot está rodando e pronto para receber comandos',
        timestamp: new Date().toISOString(),
        connectedExtensions: this.state.connectedExtensions.size
      });
    });

    // Endpoint para extensão enviar comandos via HTTP (fallback)
    this.app.post('/api/extension/command', async (req: express.Request, res: express.Response) => {
      try {
        const command: BotCommand = req.body;
        
        // Processar comando
        const response = await this.processCommandHTTP(command);
        
        res.json(response);
      } catch (error) {
        res.status(400).json({
          success: false,
          error: (error as Error).message
        });
      }
    });

    // Estatísticas gerais
    this.app.get('/api/stats', (req: express.Request, res: express.Response) => {
      res.json({
        connectedExtensions: this.state.connectedExtensions.size,
        activeCommands: this.state.activeCommands.size,
        uptime: Date.now() - new Date(this.state.startTime).getTime(),
        startTime: this.state.startTime,
        cascata: consultaCascataAssincrona.obterEstatisticas()
      });
    });

    // Listar extensões conectadas
    this.app.get('/api/extensions', (req: express.Request, res: express.Response) => {
      const extensions = Array.from(this.state.connectedExtensions.values());
      res.json(extensions);
    });

    // Rota para testar comunicação
    this.app.get('/api/test', (req: express.Request, res: express.Response) => {
      res.json({
        message: 'Bot externo funcionando!',
        timestamp: new Date().toISOString(),
        endpoints: [
          'GET /api/status - Status do bot',
          'GET /api/extension/test - Teste para extensão',
          'POST /api/extension/command - Comandos da extensão',
          'GET /api/cascata/stats - Estatísticas do sistema cascata',
          'POST /api/consulta-cascata - Iniciar consulta cascata'
        ]
      });
    });
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      const extensionId = socket.id;
      this.logger.info(`🔌 Extensão conectada via Socket.IO: ${extensionId}`);

      // Registrar extensão
      const extension: ExtensionConnection = {
        id: extensionId,
        socket: socket,
        lastHeartbeat: new Date().toISOString(),
        status: 'connected'
      };

      this.state.connectedExtensions.set(extensionId, extension);

      // Enviar confirmação de conexão
      socket.emit('bot:connected', {
        message: 'Conectado ao bot externo via Socket.IO',
        extensionId: extensionId,
        timestamp: new Date().toISOString()
      });

      // Handler para mensagens da extensão
      socket.on('extension:message', (message: ExtensionMessage) => {
        this.handleExtensionMessage(extensionId, message);
      });

      // Handler para comandos da extensão
      socket.on('extension:command', (command: BotCommand) => {
        this.handleExtensionCommand(extensionId, command);
      });

      // Handler para heartbeat
      socket.on('extension:heartbeat', (data) => {
        this.handleHeartbeat(extensionId, data);
      });

      // Handler para desconexão
      socket.on('disconnect', (reason) => {
        this.logger.info(`📴 Extensão desconectada: ${extensionId} - ${reason}`);
        this.state.connectedExtensions.delete(extensionId);
      });

      // Handler para erros
      socket.on('error', (error) => {
        this.logger.error(`❌ Erro na extensão ${extensionId}: ${error}`);
      });
    });
  }

  // ============================================================================
  // PROCESSAMENTO DE COMANDOS HTTP (FALLBACK)
  // ============================================================================

  private async processCommandHTTP(command: BotCommand): Promise<BotResponse> {
    try {
      let response: BotResponse;

      switch (command.type) {
        case BotCommandTypes.CONSULTAR_PLACA:
          response = await this.handleConsultaPlaca('http', command);
          break;

        case BotCommandTypes.EXTRAIR_CARROS:
          response = await this.handleExtrairCarros('http', command);
          break;

        case BotCommandTypes.GET_STATUS:
          response = {
            commandId: command.id,
            success: true,
            data: this.getBotStatus(),
            timestamp: new Date().toISOString()
          };
          break;

        case BotCommandTypes.CONFIGURE:
          response = await this.handleConfigure('http', command);
          break;

        case BotCommandTypes.EXTRAIR_CARROS:
          response = await this.handleExtrairCarros('http', command);
          break;  

        default:
          response = {
            commandId: command.id,
            success: false,
            error: `Comando não suportado: ${command.type}`,
            timestamp: new Date().toISOString()
          };
      }

      return response;

    } catch (error) {
      return {
        commandId: command.id,
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ============================================================================
  // HANDLERS DE COMUNICAÇÃO
  // ============================================================================

  private handleExtensionMessage(extensionId: string, message: ExtensionMessage): void {
    this.logger.info(`📨 Mensagem da extensão ${extensionId}: ${message.type}`);

    switch (message.type) {
      case 'COMMAND':
        this.handleExtensionCommand(extensionId, message.payload as BotCommand);
        break;

      case 'RESPONSE':
        this.handleCommandResponse(extensionId, message.payload as BotResponse);
        break;

      case 'STATUS':
        this.handleStatusUpdate(extensionId, message.payload);
        break;

      default:
        this.logger.warn(`❓ Tipo de mensagem desconhecido: ${message.type}`);
    }
  }

private async sendCommandToConnectedExtension(command: any): Promise<any> {
  // Verificar se há extensão conectada
  const extensions = Array.from(this.state.connectedExtensions.values());
  
  if (extensions.length === 0) {
    throw new Error('Nenhuma extensão conectada para executar comando');
  }
  
  const extension = extensions[0]; // Usar primeira extensão disponível
  
  if (extension.type === 'http') {
    // Extensão usa HTTP, não pode enviar comando diretamente
    this.logger.warn('⚠️ Extensão conectada via HTTP, não pode receber comandos push');
    throw new Error('Extensão não suporta comandos push via HTTP');
  } else {
    // Extensão usa Socket.IO
    const message = {
      type: 'COMMAND',
      payload: command,
      timestamp: new Date().toISOString()
    };
    
    extension.socket.emit('bot:command', message);
    
    // Aguardar resposta (implementar timeout)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout aguardando resposta da extensão'));
      }, 30000);
      
      extension.socket.once('extension:response', (response: any) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }
}

  private handleExtensionCommand(extensionId: string, command: BotCommand): void {
    this.logger.info(`🤖 Comando da extensão ${extensionId}: ${command.type}`);

    // Registrar comando ativo
    this.state.activeCommands.set(command.id, {
      extensionId,
      command,
      startTime: new Date().toISOString()
    });

    // Processar comando
    this.processCommand(extensionId, command);
  }

  private async processCommand(extensionId: string, command: BotCommand): Promise<void> {
    try {
      let response: BotResponse;

      switch (command.type) {
        case BotCommandTypes.CONSULTAR_PLACA:
          response = await this.handleConsultaPlaca(extensionId, command);
          break;

        case BotCommandTypes.EXTRAIR_CARROS:
          response = await this.handleExtrairCarros(extensionId, command);
          break;

        case BotCommandTypes.GET_STATUS:
          response = {
            commandId: command.id,
            success: true,
            data: this.getBotStatus(),
            timestamp: new Date().toISOString()
          };
          break;

        case BotCommandTypes.CONFIGURE:
          response = await this.handleConfigure(extensionId, command);
          break;

        default:
          response = {
            commandId: command.id,
            success: false,
            error: `Comando não suportado: ${command.type}`,
            timestamp: new Date().toISOString()
          };
      }

      // Enviar resposta
      this.sendResponseToExtension(extensionId, response);

    } catch (error) {
      const errorResponse: BotResponse = {
        commandId: command.id,
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };

      this.sendResponseToExtension(extensionId, errorResponse);
    } finally {
      // Remover comando ativo
      this.state.activeCommands.delete(command.id);
    }
  }

  private async handleConsultaPlaca(extensionId: string, command: BotCommand): Promise<BotResponse> {
    const { placa } = command.payload;
    this.logger.info(`🔍 Processando consulta de placa: ${placa}`);

    // Simular processamento (aqui você integraria com seu sistema)
    await this.sleep(1000);

    return {
      commandId: command.id,
      success: true,
      data: {
        placa: placa,
        message: 'Consulta processada pelo bot externo',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
  }

  private async handleExtrairCarros(extensionId: string, command: BotCommand): Promise<BotResponse> {
    const parametros = command.payload;
    this.logger.info(`🚗 Processando extração de carros: ${parametros.modelo} ${parametros.cor}`);

    try {
      // Adicionar consulta ao sistema de cascata
      const consultaId = await consultaCascataAssincrona.adicionarConsultaCarros(parametros);

      return {
        commandId: command.id,
        success: true,
        data: {
          consultaId,
          message: 'Extração de carros adicionada ao sistema de cascata',
          parametros
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        commandId: command.id,
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async handleConfigure(extensionId: string, command: BotCommand): Promise<BotResponse> {
    const { config } = command.payload;
    this.logger.info(`⚙️ Configurando extensão ${extensionId}`);

    return {
      commandId: command.id,
      success: true,
      data: { message: 'Configuração aplicada' },
      timestamp: new Date().toISOString()
    };
  }

  private handleCommandResponse(extensionId: string, response: BotResponse): void {
    this.logger.info(`📥 Resposta da extensão ${extensionId}: ${response.commandId}`);
    // Processar resposta conforme necessário
  }

  private handleStatusUpdate(extensionId: string, status: any): void {
    const extension = this.state.connectedExtensions.get(extensionId);
    if (extension) {
      extension.lastHeartbeat = new Date().toISOString();
      this.logger.info(`💓 Heartbeat da extensão ${extensionId}`);
    }
  }

  private handleHeartbeat(extensionId: string, data: any): void {
    const extension = this.state.connectedExtensions.get(extensionId);
    if (extension) {
      extension.lastHeartbeat = new Date().toISOString();
    }
  }

  // ============================================================================
  // MÉTODOS DE COMUNICAÇÃO
  // ============================================================================

  private sendCommandToExtension(extensionId: string, command: BotCommand): void {
    const extension = this.state.connectedExtensions.get(extensionId);
    
    if (!extension) {
      throw new Error(`Extensão ${extensionId} não encontrada`);
    }

    const message: ExtensionMessage = {
      type: 'COMMAND',
      payload: command,
      timestamp: new Date().toISOString()
    };

    extension.socket.emit('bot:command', message);
    this.logger.info(`📤 Comando enviado para extensão ${extensionId}: ${command.type}`);
  }

  private sendResponseToExtension(extensionId: string, response: BotResponse): void {
    const extension = this.state.connectedExtensions.get(extensionId);
    
    if (!extension) {
      this.logger.error(`❌ Extensão ${extensionId} não encontrada para enviar resposta`);
      return;
    }

    const message: ExtensionMessage = {
      type: 'RESPONSE',
      payload: response,
      timestamp: new Date().toISOString()
    };

    extension.socket.emit('bot:response', message);
    this.logger.info(`📤 Resposta enviada para extensão ${extensionId}: ${response.commandId}`);
  }

  // ============================================================================
  // MÉTODOS UTILITÁRIOS
  // ============================================================================

  private getBotStatus(): any {
    return {
      isRunning: this.state.isRunning,
      connectedExtensions: this.state.connectedExtensions.size,
      activeCommands: this.state.activeCommands.size,
      uptime: Date.now() - new Date(this.state.startTime).getTime(),
      startTime: this.state.startTime,
      version: '1.0.0',
      cascata: consultaCascataAssincrona.obterEstatisticas()
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS
  // ============================================================================

  async start(): Promise<void> {
    const httpPort = COMMUNICATION_CONSTANTS.HTTP_PORT;

    return new Promise((resolve) => {
      this.server.listen(httpPort, () => {
        this.state.isRunning = true;
        this.logger.info(`🌐 Bot externo iniciado!`);
        this.logger.info(`🔗 HTTP Server: http://localhost:${httpPort}`);
        this.logger.info(`🔌 WebSocket Server: ws://localhost:${httpPort}`);
        this.logger.info(`📊 Dashboard: http://localhost:${httpPort}`);
        this.logger.info(`📡 Aguardando conexões de extensões...`);
        this.logger.info(`🔄 Sistema de cascata ativo`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.state.isRunning = false;
      consultaCascataAssincrona.pararProcessamento();
      this.server.close(() => {
        this.logger.info('📴 Bot externo encerrado');
        resolve();
      });
    });
  }
}
