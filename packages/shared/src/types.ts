// Tipos compartilhados
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type BotStatus = 'idle' | 'running' | 'paused' | 'stopping' | 'error';
export type PlacaFormat = 'old' | 'mercosul' | 'invalid';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type SystemComponent = 'bot' | 'extension' | 'database' | 'api';