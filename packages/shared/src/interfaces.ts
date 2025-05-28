// ============================================================================
// ENUM DE TIPOS DE COMANDOS DO BOT
// ============================================================================

export enum BotCommandTypes {
  CONSULTAR_PLACA = 'CONSULTAR_PLACA',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  GET_STATUS = 'GET_STATUS',
  CONFIGURE = 'CONFIGURE',
  EXTRAIR_CARROS = 'EXTRAIR_CARROS',
  EXTRAIR_PLACA = 'EXTRAIR_PLACA',
  EXTRAIR_CPF = 'EXTRAIR_CPF'
}

// ============================================================================
// INTERFACES EXISTENTES (manter como estão)
// ============================================================================

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

// ATUALIZAR INTERFACE BOTCOMMAND PARA USAR O ENUM
export interface BotCommand {
  id: string;
  type: BotCommandTypes;  // ✅ USAR O ENUM
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
}
