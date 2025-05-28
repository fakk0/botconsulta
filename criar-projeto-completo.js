const fs = require('fs');
const path = require('path');

// Configuração do projeto
const BASE_DIR = 'F:\\UBER\\botPainel';

// Estrutura de pastas
const FOLDERS = [
  // Estrutura principal
  'packages',
  'packages/shared',
  'packages/shared/src',
  'packages/extension',
  'packages/extension/src',
  'packages/extension/icons',
  'packages/bot',
  'packages/bot/src',
  'packages/bot/src/controllers',
  'packages/bot/src/services',
  'packages/bot/src/database',
  'packages/bot/src/api',
  'packages/bot/src/extension-bridge',
  'packages/bot/src/utils',
  'packages/bot/config',
  'database',
  'database/migrations',
  'database/seeds',
  'docs',
  'scripts'
];

// Arquivos com conteúdo
const FILES = {
  // ============================================================================
  // CONFIGURAÇÃO RAIZ DO PROJETO
  // ============================================================================
  
  'package.json': {
    "name": "bot-consulta-placas-monorepo",
    "version": "1.0.0",
    "description": "Sistema híbrido: Bot externo + Extensão Chrome para consulta de placas",
    "private": true,
    "workspaces": [
      "packages/*"
    ],
    "scripts": {
      "install:all": "npm install && npm run install:packages",
      "install:packages": "npm install --workspace=packages/shared && npm install --workspace=packages/extension && npm install --workspace=packages/bot",
      "build": "npm run build:shared && npm run build:extension && npm run build:bot",
      "build:shared": "npm run build --workspace=packages/shared",
      "build:extension": "npm run build --workspace=packages/extension",
      "build:bot": "npm run build --workspace=packages/bot",
      "dev": "concurrently \"npm run dev:bot\" \"npm run dev:extension\"",
      "dev:bot": "npm run dev --workspace=packages/bot",
      "dev:extension": "npm run dev --workspace=packages/extension",
      "start": "npm run start --workspace=packages/bot",
      "clean": "rimraf packages/*/dist packages/*/node_modules",
      "lint": "eslint packages/*/src/**/*.ts",
      "test": "jest"
    },
    "devDependencies": {
      "@types/node": "^20.0.0",
      "@typescript-eslint/eslint-plugin": "^6.0.0",
      "@typescript-eslint/parser": "^6.0.0",
      "concurrently": "^8.0.0",
      "eslint": "^8.0.0",
      "jest": "^29.0.0",
      "prettier": "^3.0.0",
      "rimraf": "^5.0.0",
      "typescript": "^5.0.0"
    },
    "engines": {
      "node": ">=18.0.0",
      "npm": ">=9.0.0"
    }
  },

  'tsconfig.json': {
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs",
      "lib": ["ES2020"],
      "outDir": "./dist",
      "rootDir": "./",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true,
      "removeComments": false,
      "experimentalDecorators": true,
      "emitDecoratorMetadata": true
    },
    "include": ["packages/*/src/**/*"],
    "exclude": ["node_modules", "**/dist", "**/node_modules"]
  },

  'README.md': `# Bot Consulta Placas - Sistema Híbrido

## Arquitetura

Este projeto utiliza uma arquitetura híbrida composta por:

- **Bot Externo (Node.js + TypeScript)**: Motor principal de gerenciamento
- **Extensão Chrome (TypeScript)**: Extrator de dados no navegador real
- **Shared Package**: Tipos e utilitários compartilhados

## Estrutura do Projeto

\`\`\`
botPainel/
├── packages/
│   ├── shared/              # Tipos e utilitários compartilhados
│   ├── extension/           # Extensão Chrome
│   └── bot/                 # Bot externo (Node.js)
├── database/                # Schemas e migrações
├── docs/                    # Documentação
└── scripts/                 # Scripts de automação
\`\`\`

## Como usar

1. \`npm run install:all\`     # Instalar todas as dependências
2. \`npm run build\`           # Compilar todos os pacotes
3. \`npm run dev\`             # Desenvolvimento (bot + extensão)
4. \`npm start\`               # Executar em produção

## Desenvolvimento

- **Bot**: \`npm run dev:bot\`
- **Extensão**: \`npm run dev:extension\`
- **Build**: \`npm run build\`
- **Lint**: \`npm run lint\`
`,

  // ============================================================================
  // PACKAGE SHARED (TIPOS COMPARTILHADOS)
  // ============================================================================

  'packages/shared/package.json': {
    "name": "@bot-consulta/shared",
    "version": "1.0.0",
    "description": "Tipos e utilitários compartilhados",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "scripts": {
      "build": "tsc",
      "dev": "tsc --watch",
      "clean": "rimraf dist"
    },
    "devDependencies": {
      "typescript": "^5.0.0",
      "rimraf": "^5.0.0"
    }
  },

  'packages/shared/tsconfig.json': {
    "extends": "../../tsconfig.json",
    "compilerOptions": {
      "outDir": "./dist",
      "rootDir": "./src"
    },
    "include": ["src/**/*"],
    "exclude": ["dist", "node_modules"]
  },

  'packages/shared/src/index.ts': `// Exports principais do package shared
export * from './interfaces';
export * from './types';
export * from './constants';
export * from './utils';`,

  'packages/shared/src/interfaces.ts': `// Interfaces compartilhadas entre bot e extensão
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultaResult extends BaseEntity {
  placa: string;
  success: boolean;
  data?: {
    nome?: string;
    cpf?: string;
    modelo?: string;
    cor?: string;
    ano?: string;
    situacao?: string;
    [key: string]: any;
  };
  error?: string;
  executionTime: number;
  sessionId: string;
}

export interface ExtensionConfig extends BaseEntity {
  username: string;
  password: string;
  siteUrl: string;
  operationMode: 'single' | 'batch' | 'continuous';
  consultaInterval: number;
  captchaMode: 'auto' | 'manual' | 'skip';
  autoLogin: boolean;
  saveResults: boolean;
}

export interface BotCommand {
  id: string;
  type: 'CONSULTAR_PLACA' | 'LOGIN' | 'LOGOUT' | 'GET_STATUS' | 'CONFIGURE';
  payload: any;
  timestamp: string;
  sessionId?: string;
}

export interface BotResponse {
  commandId: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export interface ExtensionMessage {
  type: 'COMMAND' | 'RESPONSE' | 'STATUS' | 'ERROR';
  payload: BotCommand | BotResponse | any;
  timestamp: string;
}`,

  'packages/shared/src/types.ts': `// Tipos compartilhados
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type BotStatus = 'idle' | 'running' | 'paused' | 'stopping' | 'error';
export type PlacaFormat = 'old' | 'mercosul' | 'invalid';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type SystemComponent = 'bot' | 'extension' | 'database' | 'api';`,

  'packages/shared/src/constants.ts': `// Constantes compartilhadas
export const APP_CONSTANTS = {
  VERSION: '1.0.0',
  DEFAULT_SITE_URL: 'https://elpump.xyz/placa_oficial_plus/',
  DEFAULT_INTERVAL: 3000,
  MAX_RETRIES: 3,
  TIMEOUT: 30000
} as const;

export const DATABASE_CONSTANTS = {
  MAX_CONSULTAS: 10000,
  MAX_LOGS: 1000,
  CLEANUP_INTERVAL: 24 * 60 * 60 * 1000 // 24 horas
} as const;

export const COMMUNICATION_CONSTANTS = {
  WEBSOCKET_PORT: 3001,
  HTTP_PORT: 3000,
  HEARTBEAT_INTERVAL: 5000
} as const;`,

  'packages/shared/src/utils.ts': `// Utilitários compartilhados
export class PlacaUtils {
  static formatPlaca(placa: string): string {
    return placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  }
  
  static validatePlaca(placa: string): boolean {
    const formatted = this.formatPlaca(placa);
    const oldFormat = /^[A-Z]{3}[0-9]{4}$/;
    const mercosulFormat = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
    return oldFormat.test(formatted) || mercosulFormat.test(formatted);
  }
  
  static getPlacaType(placa: string): 'old' | 'mercosul' | 'invalid' {
    const formatted = this.formatPlaca(placa);
    if (/^[A-Z]{3}[0-9]{4}$/.test(formatted)) return 'old';
    if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(formatted)) return 'mercosul';
    return 'invalid';
  }
}

export class DateUtils {
  static now(): string {
    return new Date().toISOString();
  }
  
  static formatBrazilian(date: string): string {
    return new Date(date).toLocaleString('pt-BR');
  }
}

export class LogUtils {
  static formatMessage(level: string, component: string, message: string): string {
    const timestamp = DateUtils.now();
    return \`[\${timestamp}] [\${level.toUpperCase()}] [\${component}] \${message}\`;
  }
}`,

  // ============================================================================
  // PACKAGE EXTENSION (EXTENSÃO CHROME)
  // ============================================================================

  'packages/extension/package.json': {
    "name": "@bot-consulta/extension",
    "version": "1.0.0",
    "description": "Extensão Chrome para extração de dados",
    "scripts": {
      "build": "tsc && npm run copy-assets",
      "dev": "tsc --watch",
      "copy-assets": "cp manifest.json dist/ && cp popup.html dist/ && cp -r icons dist/",
      "clean": "rimraf dist"
    },
    "dependencies": {
      "@bot-consulta/shared": "^1.0.0"
    },
    "devDependencies": {
      "@types/chrome": "^0.0.246",
      "typescript": "^5.0.0",
      "rimraf": "^5.0.0"
    }
  },

  'packages/extension/tsconfig.json': {
    "extends": "../../tsconfig.json",
    "compilerOptions": {
      "target": "ES2020",
      "module": "ES2020",
      "lib": ["ES2020", "DOM"],
      "outDir": "./dist",
      "rootDir": "./src",
      "types": ["chrome"]
    },
    "include": ["src/**/*"],
    "exclude": ["dist", "node_modules"]
  },

  'packages/extension/manifest.json': {
    "manifest_version": 3,
    "name": "Bot Consulta Placas - Extrator",
    "version": "1.0.0",
    "description": "Extrator de dados para sistema de consulta de placas",
    "permissions": [
      "activeTab",
      "scripting",
      "storage"
    ],
    "host_permissions": [
      "https://elpump.xyz/*"
    ],
    "background": {
      "service_worker": "background.js",
      "type": "module"
    },
    "content_scripts": [
      {
        "matches": ["https://elpump.xyz/*"],
        "js": ["content.js"],
        "run_at": "document_end"
      }
    ],
    "action": {
      "default_popup": "popup.html",
      "default_title": "Bot Consulta Placas",
      "default_icon": {
        "16": "icons/icon16.png",
        "32": "icons/icon32.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png"
      }
    }
  },

  'packages/extension/popup.html': `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 300px;
      padding: 15px;
      font-family: Arial, sans-serif;
      background: #f5f5f5;
    }
    .header {
      text-align: center;
      margin-bottom: 15px;
      color: #333;
    }
    .status {
      padding: 10px;
      border-radius: 5px;
      margin: 10px 0;
      text-align: center;
      font-weight: bold;
    }
    .connected { background: #d4edda; color: #155724; }
    .disconnected { background: #f8d7da; color: #721c24; }
    .btn {
      width: 100%;
      padding: 8px;
      margin: 5px 0;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    .btn-primary { background: #007bff; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
  </style>
</head>
<body>
  <div class="header">
    <h3>🚗 Bot Consulta Placas</h3>
    <p>Extrator de Dados</p>
  </div>
  
  <div id="status" class="status disconnected">
    ⚪ Aguardando conexão com bot...
  </div>
  
  <button class="btn btn-primary" id="connectBtn">🔌 Conectar ao Bot</button>
  <button class="btn btn-secondary" id="testBtn">🧪 Testar Extração</button>
  
  <script src="popup.js"></script>
</body>
</html>`,

  'packages/extension/src/background.ts': `// Background service worker da extensão
import { ExtensionMessage, BotCommand, BotResponse } from '@bot-consulta/shared';

console.log('🔧 Extensão Background Service Worker iniciado');

// Comunicação com bot externo será implementada aqui
class ExtensionBackground {
  private isConnected = false;
  
  constructor() {
    this.setupMessageListeners();
  }
  
  private setupMessageListeners(): void {
    // Listener para mensagens do popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }
  
  private handleMessage(message: any, sender: any, sendResponse: Function): void {
    console.log('📨 Mensagem recebida:', message);
    
    switch (message.type) {
      case 'GET_STATUS':
        sendResponse({ connected: this.isConnected });
        break;
        
      case 'CONNECT_TO_BOT':
        this.connectToBot().then(success => {
          sendResponse({ success });
        });
        break;
        
      default:
        sendResponse({ error: 'Tipo de mensagem desconhecido' });
    }
  }
  
  private async connectToBot(): Promise<boolean> {
    try {
      // Implementar conexão com bot externo
      console.log('🔌 Conectando ao bot externo...');
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('❌ Erro ao conectar:', error);
      return false;
    }
  }
}

new ExtensionBackground();`,

  'packages/extension/src/content.ts': `// Content script para extração de dados
import { ConsultaResult } from '@bot-consulta/shared';

console.log('📄 Content Script carregado em:', window.location.href);

class DataExtractor {
  
  constructor() {
    this.setupMessageListener();
  }
  
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleExtractionCommand(message, sender, sendResponse);
      return true;
    });
  }
  
  private handleExtractionCommand(message: any, sender: any, sendResponse: Function): void {
    switch (message.type) {
      case 'EXTRACT_DATA':
        this.extractData(message.placa).then(result => {
          sendResponse(result);
        });
        break;
        
      case 'CHECK_PAGE':
        sendResponse({
          url: window.location.href,
          title: document.title,
          ready: document.readyState === 'complete'
        });
        break;
        
      default:
        sendResponse({ error: 'Comando desconhecido' });
    }
  }
  
  private async extractData(placa: string): Promise<ConsultaResult> {
    const startTime = Date.now();
    
    try {
      // Implementar extração específica do site
      console.log('🔍 Extraindo dados para placa:', placa);
      
      // Placeholder - será implementado com lógica específica
      const mockData = {
        nome: 'João Silva',
        cpf: '123.456.789-00',
        modelo: 'Honda Civic',
        cor: 'Prata',
        ano: '2020'
      };
      
      return {
        id: \`consulta_\${Date.now()}\`,
        placa,
        success: true,
        data: mockData,
        executionTime: Date.now() - startTime,
        sessionId: 'session_' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        id: \`consulta_\${Date.now()}\`,
        placa,
        success: false,
        error: (error as Error).message,
        executionTime: Date.now() - startTime,
        sessionId: 'session_' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }
}

new DataExtractor();`,

  'packages/extension/src/popup.ts': `// Popup da extensão
console.log('🎛️ Popup carregado');

class ExtensionPopup {
  private statusElement!: HTMLElement;
  private connectBtn!: HTMLButtonElement;
  private testBtn!: HTMLButtonElement;
  
  constructor() {
    this.initializeElements();
    this.bindEvents();
    this.updateStatus();
  }
  
  private initializeElements(): void {
    this.statusElement = document.getElementById('status')!;
    this.connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
    this.testBtn = document.getElementById('testBtn') as HTMLButtonElement;
  }
  
  private bindEvents(): void {
    this.connectBtn.addEventListener('click', () => this.connectToBot());
    this.testBtn.addEventListener('click', () => this.testExtraction());
  }
  
  private async updateStatus(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
      
      if (response.connected) {
        this.statusElement.textContent = '🟢 Conectado ao bot';
        this.statusElement.className = 'status connected';
      } else {
        this.statusElement.textContent = '🔴 Desconectado';
        this.statusElement.className = 'status disconnected';
      }
    } catch (error) {
      this.statusElement.textContent = '❌ Erro de comunicação';
      this.statusElement.className = 'status disconnected';
    }
  }
  
  private async connectToBot(): Promise<void> {
    try {
      this.connectBtn.disabled = true;
      this.connectBtn.textContent = '🔄 Conectando...';
      
      const response = await chrome.runtime.sendMessage({ type: 'CONNECT_TO_BOT' });
      
      if (response.success) {
        this.statusElement.textContent = '🟢 Conectado ao bot';
        this.statusElement.className = 'status connected';
      } else {
        this.statusElement.textContent = '❌ Falha na conexão';
        this.statusElement.className = 'status disconnected';
      }
      
    } catch (error) {
      this.statusElement.textContent = '❌ Erro na conexão';
      this.statusElement.className = 'status disconnected';
    } finally {
      this.connectBtn.disabled = false;
      this.connectBtn.textContent = '🔌 Conectar ao Bot';
    }
  }
  
  private async testExtraction(): Promise<void> {
    try {
      this.testBtn.disabled = true;
      this.testBtn.textContent = '🧪 Testando...';
      
      // Implementar teste de extração
      console.log('🧪 Teste de extração executado');
      
    } catch (error) {
      console.error('❌ Erro no teste:', error);
    } finally {
      this.testBtn.disabled = false;
      this.testBtn.textContent = '🧪 Testar Extração';
    }
  }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  new ExtensionPopup();
});`,

  // ============================================================================
  // PACKAGE BOT (BOT EXTERNO)
  // ============================================================================

  'packages/bot/package.json': {
    "name": "@bot-consulta/bot",
    "version": "1.0.0",
    "description": "Bot externo para gerenciamento de consultas",
    "main": "dist/index.js",
    "scripts": {
      "build": "tsc",
      "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
      "start": "node dist/index.js",
      "clean": "rimraf dist"
    },
    "dependencies": {
      "@bot-consulta/shared": "^1.0.0",
      "express": "^4.18.0",
      "socket.io": "^4.7.0",
      "prisma": "^5.0.0",
      "@prisma/client": "^5.0.0",
      "dotenv": "^16.0.0",
      "cors": "^2.8.5",
      "helmet": "^7.0.0",
      "compression": "^1.7.4"
    },
    "devDependencies": {
      "@types/express": "^4.17.0",
      "@types/cors": "^2.8.0",
      "@types/compression": "^1.7.0",
      "typescript": "^5.0.0",
      "ts-node-dev": "^2.0.0",
      "rimraf": "^5.0.0"
    }
  },

  'packages/bot/tsconfig.json': {
    "extends": "../../tsconfig.json",
    "compilerOptions": {
      "outDir": "./dist",
      "rootDir": "./src"
    },
    "include": ["src/**/*"],
    "exclude": ["dist", "node_modules"]
  },

  'packages/bot/.env.example': `# Configurações do Bot
NODE_ENV=development
PORT=3000
WEBSOCKET_PORT=3001

# Banco de dados
DATABASE_URL="postgresql://username:password@localhost:5432/bot_consulta_placas"

# Configurações da aplicação
MAX_CONCURRENT_EXTRACTIONS=5
DEFAULT_TIMEOUT=30000
LOG_LEVEL=info`,

  'packages/bot/src/index.ts': `// Ponto de entrada do bot
import dotenv from 'dotenv';
import { BotApplication } from './app';
import { Logger } from './utils/logger';

// Carregar variáveis de ambiente
dotenv.config();

const logger = new Logger('MAIN');

async function bootstrap(): Promise<void> {
  try {
    logger.info('🚀 Iniciando Bot Consulta Placas...');
    
    const app = new BotApplication();
    await app.start();
    
    logger.info('✅ Bot iniciado com sucesso!');
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('📴 Recebido SIGTERM, encerrando...');
      await app.stop();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      logger.info('📴 Recebido SIGINT, encerrando...');
      await app.stop();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('❌ Erro ao iniciar bot:', error);
    process.exit(1);
  }
}

bootstrap();`,

  'packages/bot/src/app.ts': `// Aplicação principal do bot
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Server as SocketServer } from 'socket.io';
import { createServer } from 'http';
import { Logger } from './utils/logger';
import { ExtensionBridge } from './extension-bridge/extension-bridge';
import { ApiController } from './api/api-controller';

export class BotApplication {
  private app: express.Application;
  private server: any;
  private io: SocketServer;
  private logger: Logger;
  private extensionBridge: ExtensionBridge;
  private apiController: ApiController;
  
  constructor() {
    this.logger = new Logger('APP');
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.extensionBridge = new ExtensionBridge(this.io);
    this.apiController = new ApiController();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }
  
  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }
  
  private setupRoutes(): void {
    this.app.use('/api', this.apiController.getRouter());
    
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }
  
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      this.logger.info(\`🔌 Cliente conectado: \${socket.id}\`);
      
      socket.on('disconnect', () => {
        this.logger.info(\`📴 Cliente desconectado: \${socket.id}\`);
      });
    });
  }
  
  async start(): Promise<void> {
    const port = process.env.PORT || 3000;
    const wsPort = process.env.WEBSOCKET_PORT || 3001;
    
    return new Promise((resolve) => {
      this.server.listen(port, () => {
        this.logger.info(\`🌐 Servidor HTTP rodando na porta \${port}\`);
        this.logger.info(\`🔌 WebSocket rodando na porta \${wsPort}\`);
        resolve();
      });
    });
  }
  
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        this.logger.info('📴 Servidor encerrado');
        resolve();
      });
    });
  }
}`,

  'packages/bot/src/utils/logger.ts': `// Sistema de logging
import { LogLevel } from '@bot-consulta/shared';

export class Logger {
  constructor(private component: string) {}
  
  private log(level: LogLevel, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = \`[\${timestamp}] [\${level.toUpperCase()}] [\${this.component}] \${message}\`;
    
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, ...args);
        break;
      case 'info':
        console.info(formattedMessage, ...args);
        break;
      case 'warn':
        console.warn(formattedMessage, ...args);
        break;
      case 'error':
        console.error(formattedMessage, ...args);
        break;
    }
  }
  
  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }
  
  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }
  
  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }
  
  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }
}`,

  // Arquivos placeholder para outras pastas
  'packages/bot/src/controllers/index.ts': `// Controllers serão implementados aqui
export * from './consulta-controller';`,

  'packages/bot/src/controllers/consulta-controller.ts': `// Controller para consultas - será implementado
import { Logger } from '../utils/logger';

export class ConsultaController {
  private logger = new Logger('CONSULTA_CONTROLLER');
  
  constructor() {
    this.logger.info('ConsultaController inicializado');
  }
}`,

  'packages/bot/src/services/index.ts': `// Services serão implementados aqui
export * from './consulta-service';`,

  'packages/bot/src/services/consulta-service.ts': `// Service para consultas - será implementado
import { Logger } from '../utils/logger';

export class ConsultaService {
  private logger = new Logger('CONSULTA_SERVICE');
  
  constructor() {
    this.logger.info('ConsultaService inicializado');
  }
}`,

  'packages/bot/src/database/index.ts': `// Database será implementado aqui
export * from './database-manager';`,

  'packages/bot/src/database/database-manager.ts': `// Gerenciador de banco de dados - será implementado
import { Logger } from '../utils/logger';

export class DatabaseManager {
  private logger = new Logger('DATABASE');
  
  constructor() {
    this.logger.info('DatabaseManager inicializado');
  }
}`,

  'packages/bot/src/api/api-controller.ts': `// Controller da API REST
import { Router } from 'express';
import { Logger } from '../utils/logger';

export class ApiController {
  private router: Router;
  private logger = new Logger('API');
  
  constructor() {
    this.router = Router();
    this.setupRoutes();
  }
  
  private setupRoutes(): void {
    this.router.get('/status', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });
    
    this.router.get('/consultas', (req, res) => {
      // Implementar listagem de consultas
      res.json({ message: 'Endpoint de consultas - será implementado' });
    });
  }
  
  getRouter(): Router {
    return this.router;
  }
}`,

  'packages/bot/src/extension-bridge/extension-bridge.ts': `// Bridge para comunicação com extensão
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
      this.logger.info(\`🔌 Extensão conectada: \${socket.id}\`);
      
      socket.on('extension:message', (message: ExtensionMessage) => {
        this.handleExtensionMessage(socket.id, message);
      });
      
      socket.on('disconnect', () => {
        this.logger.info(\`📴 Extensão desconectada: \${socket.id}\`);
      });
    });
  }
  
  private handleExtensionMessage(socketId: string, message: ExtensionMessage): void {
    this.logger.info(\`📨 Mensagem da extensão \${socketId}:\`, message.type);
    
    switch (message.type) {
      case 'RESPONSE':
        this.handleExtensionResponse(socketId, message.payload as BotResponse);
        break;
      case 'STATUS':
        this.handleExtensionStatus(socketId, message.payload);
        break;
      default:
        this.logger.warn(\`❓ Tipo de mensagem desconhecido: \${message.type}\`);
    }
  }
  
  private handleExtensionResponse(socketId: string, response: BotResponse): void {
    this.logger.info(\`📥 Resposta recebida para comando \${response.commandId}\`);
    // Implementar processamento da resposta
  }
  
  private handleExtensionStatus(socketId: string, status: any): void {
    this.logger.info(\`📊 Status da extensão \${socketId}:\`, status);
    // Implementar processamento do status
  }
  
  sendCommandToExtension(socketId: string, command: BotCommand): void {
    this.logger.info(\`📤 Enviando comando para extensão \${socketId}:\`, command.type);
    
    const message: ExtensionMessage = {
      type: 'COMMAND',
      payload: command,
      timestamp: new Date().toISOString()
    };
    
    this.io.to(socketId).emit('bot:command', message);
  }
}`,

  // Arquivos de configuração e documentação
  'packages/bot/config/database.ts': `// Configuração do banco de dados - será implementado
export const databaseConfig = {
  development: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/bot_consulta_dev'
  },
  production: {
    url: process.env.DATABASE_URL
  }
};`,

  'database/schema.sql': `-- Schema do banco de dados - será implementado
-- Tabelas para consultas, usuários, sessões, etc.

CREATE TABLE IF NOT EXISTS consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa VARCHAR(8) NOT NULL,
  success BOOLEAN NOT NULL,
  data JSONB,
  error TEXT,
  execution_time INTEGER,
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_consultas_placa ON consultas(placa);
CREATE INDEX idx_consultas_created_at ON consultas(created_at);`,

  'docs/ARCHITECTURE.md': `# Arquitetura do Sistema

## Visão Geral

O sistema é composto por três pacotes principais:

1. **@bot-consulta/shared**: Tipos e utilitários compartilhados
2. **@bot-consulta/extension**: Extensão Chrome para extração
3. **@bot-consulta/bot**: Bot externo para gerenciamento

## Comunicação

- **Bot ↔ Extensão**: WebSocket + HTTP
- **Bot ↔ Banco**: Prisma ORM
- **Bot ↔ APIs**: REST + GraphQL

## Fluxo de Dados

1. Bot recebe comando
2. Bot envia comando para extensão
3. Extensão extrai dados
4. Extensão retorna dados
5. Bot salva no banco
6. Bot responde ao solicitante
`,

  'scripts/setup.js': `// Script de setup do projeto
const { execSync } = require('child_process');

console.log('🚀 Configurando projeto...');

try {
  console.log('📦 Instalando dependências...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('🔨 Compilando pacotes...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('✅ Setup concluído!');
} catch (error) {
  console.error('❌ Erro no setup:', error.message);
  process.exit(1);
}`,

  '.gitignore': `# Dependencies
node_modules/
packages/*/node_modules/

# Build outputs
dist/
packages/*/dist/

# Environment files
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Database
*.db
*.sqlite`
};

// Classe para criar estrutura
class ProjectStructureCreator {
  
  static createFolders() {
    console.log('📁 Criando estrutura de pastas...');
    
    // Criar diretório base
    if (!fs.existsSync(BASE_DIR)) {
      fs.mkdirSync(BASE_DIR, { recursive: true });
    }
    
    // Criar todas as subpastas
    FOLDERS.forEach(folder => {
      const folderPath = path.join(BASE_DIR, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`   ✅ Pasta criada: ${folder}`);
      }
    });
  }
  
  static createFiles() {
    console.log('📝 Criando arquivos...');
    
    Object.entries(FILES).forEach(([fileName, content]) => {
      const filePath = path.join(BASE_DIR, fileName);
      
      // Criar diretório pai se não existir
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Determinar se é JSON ou texto
      const fileContent = typeof content === 'object' 
        ? JSON.stringify(content, null, 2)
        : content;
      
      fs.writeFileSync(filePath, fileContent, 'utf8');
      console.log(`   ✅ Arquivo criado: ${fileName}`);
    });
  }
  
  static createIcons() {
    console.log('🎨 Criando ícones da extensão...');
    
    // Dados de um PNG 1x1 pixel azul
    const iconData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    const iconSizes = [16, 32, 48, 128];
    
    iconSizes.forEach(size => {
      const iconPath = path.join(BASE_DIR, 'packages', 'extension', 'icons', `icon${size}.png`);
      fs.writeFileSync(iconPath, iconData);
      console.log(`   ✅ Ícone criado: icon${size}.png`);
    });
  }
  
  static showSummary() {
    console.log('\n🎉 PROJETO HÍBRIDO CRIADO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log(`📂 Diretório: ${BASE_DIR}`);
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. cd F:\\UBER\\botPainel');
    console.log('2. npm run install:all     # Instalar dependências');
    console.log('3. npm run build           # Compilar projeto');
    console.log('4. npm run dev             # Desenvolvimento');
    console.log('\n🏗️ ESTRUTURA CRIADA:');
    console.log('├── 📦 packages/shared     # Tipos compartilhados');
    console.log('├── 🔧 packages/extension  # Extensão Chrome');
    console.log('├── 🤖 packages/bot        # Bot externo (Node.js)');
    console.log('├── 🗄️ database/           # Schemas do banco');
    console.log('├── 📚 docs/               # Documentação');
    console.log('└── 🔨 scripts/            # Scripts de automação');
    console.log('\n✨ ARQUITETURA HÍBRIDA PRONTA PARA DESENVOLVIMENTO!');
  }
  
  static run() {
    console.log('🚀 CRIANDO PROJETO HÍBRIDO: BOT EXTERNO + EXTENSÃO CHROME');
    console.log('='.repeat(70));
    
    try {
      this.createFolders();
      this.createFiles();
      this.createIcons();
      this.showSummary();
    } catch (error) {
      console.error('❌ Erro ao criar estrutura:', error);
    }
  }
}

// Executar criação da estrutura
ProjectStructureCreator.run();
