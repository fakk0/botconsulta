// ============================================================================
// SISTEMA DE BANCO DE DADOS COMPARTILHADO (CHROME.STORAGE.LOCAL + RELACIONAMENTOS)
// ============================================================================

import { 
  BaseEntity, 
  ConsultaResult, 
  ExtensionConfig,
  BotCommand,
  BotResponse 
} from './interfaces';

// ============================================================================
// INTERFACES ESPECÍFICAS PARA BANCO DE DADOS
// ============================================================================

// Interface para Pessoa (proprietário dos veículos)
export interface Pessoa extends BaseEntity {
  nome: string;
  cpf: string;
  telefone?: string;
  email?: string;
  endereco?: {
    cep?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  };
  observacoes?: string;
}

// Interface para Veículo
export interface Veiculo extends BaseEntity {
  placa: string;
  proprietarioId: string; // Relacionamento com Pessoa
  modelo?: string;
  marca?: string;
  cor?: string;
  ano?: string;
  chassi?: string;
  renavam?: string;
  categoria?: string;
  situacao?: 'regular' | 'irregular' | 'bloqueado' | 'roubado' | 'desconhecida';
  observacoes?: string;
}

// Interface para Sessão de Consultas
export interface SessaoConsulta extends BaseEntity {
  nome: string;
  descricao?: string;
  startTime: string;
  endTime?: string;
  status: 'ativa' | 'concluida' | 'pausada' | 'cancelada';
  totalPlacas: number;
  processedPlacas: number;
  successCount: number;
  errorCount: number;
  config: Partial<ExtensionConfig>;
}

// Interface para Estatísticas
export interface Estatisticas extends BaseEntity {
  totalConsultas: number;
  consultasComSucesso: number;
  consultasComErro: number;
  tempoMedioExecucao: number;
  ultimaConsulta: string;
  placasMaisConsultadas: Array<{
    placa: string;
    count: number;
    ultimaConsulta: string;
  }>;
  estatisticasDiarias: Array<{
    data: string;
    consultas: number;
    sucessos: number;
    erros: number;
  }>;
  proprietariosMaisConsultados: Array<{
    proprietarioId: string;
    nome: string;
    count: number;
  }>;
}

// Interface para Logs do Sistema
export interface LogSistema extends BaseEntity {
  level: 'debug' | 'info' | 'warn' | 'error';
  component: 'extension' | 'bot' | 'database' | 'api';
  message: string;
  details?: any;
  sessionId?: string;
  userId?: string;
}

// Interface para Configurações do Sistema
export interface ConfiguracaoSistema extends BaseEntity {
  chave: string;
  valor: any;
  tipo: 'string' | 'number' | 'boolean' | 'object' | 'array';
  descricao?: string;
  categoria: 'geral' | 'extensao' | 'bot' | 'database' | 'api';
}

// ============================================================================
// INTERFACES PARA OPERAÇÕES DE BANCO
// ============================================================================

export interface SearchOptions<T> {
  filters?: Partial<T>;
  sortBy?: keyof T;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  includeRelated?: boolean;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

export interface DatabaseOperations<T extends BaseEntity> {
  create(item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  read(id: string): Promise<T | null>;
  update(id: string, updates: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  list(options?: SearchOptions<T>): Promise<SearchResult<T>>;
  count(filters?: Partial<T>): Promise<number>;
  clear(): Promise<boolean>;
}

// ============================================================================
// CLASSE PRINCIPAL DO BANCO DE DADOS
// ============================================================================

export class DatabaseManager {
  private static instance: DatabaseManager;
  private isInitialized = false;
  private readonly STORAGE_PREFIX = 'bot_consulta_';
  private readonly MAX_ITEMS = {
    consultas: 10000,
    logs: 1000,
    pessoas: 5000,
    veiculos: 15000
  };

  // Singleton pattern
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private constructor() {
    this.initializeDatabase();
  }

  // ============================================================================
  // INICIALIZAÇÃO E CONFIGURAÇÃO
  // ============================================================================

  private async initializeDatabase(): Promise<void> {
    try {
      // Verificar se é ambiente de extensão (chrome.storage disponível)
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await this.initializeChromeStorage();
      } else {
        // Fallback para Node.js (bot externo)
        await this.initializeNodeStorage();
      }

      // Criar índices se não existirem
      await this.createIndexes();
      
      // Criar configurações padrão
      await this.createDefaultConfig();

      this.isInitialized = true;
      await this.log('info', 'database', 'Banco de dados inicializado com sucesso');
      
    } catch (error) {
      await this.log('error', 'database', `Erro ao inicializar banco: ${error}`);
      throw error;
    }
  }

  private async initializeChromeStorage(): Promise<void> {
    // Verificar quota de armazenamento
    if (chrome.storage.local.getBytesInUse) {
      const usage = await chrome.storage.local.getBytesInUse();
      console.log(`💾 Uso atual do chrome.storage.local: ${usage} bytes`);
    }
  }

  private async initializeNodeStorage(): Promise<void> {
    // Para o bot externo, usar sistema de arquivos ou banco real
    console.log('💾 Inicializando storage para Node.js (bot externo)');
  }

  private async createIndexes(): Promise<void> {
    const indexes = {
      'index_placa_proprietario': {},
      'index_proprietario_veiculos': {},
      'index_consultas_por_data': {},
      'index_consultas_por_placa': {},
      'index_sessoes_ativas': {}
    };

    for (const [indexName, indexData] of Object.entries(indexes)) {
      const key = this.getStorageKey('index', indexName);
      const existing = await this.getFromStorage(key);
      
      if (!existing) {
        await this.setToStorage(key, indexData);
      }
    }
  }

  private async createDefaultConfig(): Promise<void> {
    const defaultConfigs = [
      {
        chave: 'max_consultas_por_sessao',
        valor: 100,
        tipo: 'number' as const,
        descricao: 'Máximo de consultas por sessão',
        categoria: 'geral' as const
      },
      {
        chave: 'intervalo_padrao_consultas',
        valor: 3000,
        tipo: 'number' as const,
        descricao: 'Intervalo padrão entre consultas (ms)',
        categoria: 'extensao' as const
      },
      {
        chave: 'backup_automatico',
        valor: true,
        tipo: 'boolean' as const,
        descricao: 'Realizar backup automático dos dados',
        categoria: 'database' as const
      }
    ];

    for (const config of defaultConfigs) {
      const existing = await this.configuracoes.list({ 
        filters: { chave: config.chave } as any 
      });
      
      if (existing.items.length === 0) {
        await this.configuracoes.create(config as any);
      }
    }
  }

  // ============================================================================
  // OPERAÇÕES PARA PESSOAS
  // ============================================================================

  public pessoas: DatabaseOperations<Pessoa> = {
    async create(item: Omit<Pessoa, 'id' | 'createdAt' | 'updatedAt'>): Promise<Pessoa> {
      const newItem: Pessoa = {
        ...item,
        id: `pessoa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const key = DatabaseManager.getInstance().getStorageKey('pessoa', newItem.id);
      await DatabaseManager.getInstance().setToStorage(key, newItem);
      
      // Atualizar índices
      await DatabaseManager.getInstance().updatePersonIndex(newItem);
      
      await DatabaseManager.getInstance().log('info', 'database', `Pessoa criada: ${newItem.nome} (${newItem.id})`);
      return newItem;
    },

    async read(id: string): Promise<Pessoa | null> {
      const key = DatabaseManager.getInstance().getStorageKey('pessoa', id);
      return await DatabaseManager.getInstance().getFromStorage(key);
    },

    async update(id: string, updates: Partial<Pessoa>): Promise<Pessoa> {
      const existing = await this.read(id);
      if (!existing) {
        throw new Error(`Pessoa não encontrada: ${id}`);
      }

      const updated: Pessoa = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const key = DatabaseManager.getInstance().getStorageKey('pessoa', id);
      await DatabaseManager.getInstance().setToStorage(key, updated);
      
      await DatabaseManager.getInstance().log('info', 'database', `Pessoa atualizada: ${updated.nome} (${id})`);
      return updated;
    },

    async delete(id: string): Promise<boolean> {
      const key = DatabaseManager.getInstance().getStorageKey('pessoa', id);
      await DatabaseManager.getInstance().removeFromStorage(key);
      
      // Remover dos índices
      await DatabaseManager.getInstance().removeFromPersonIndex(id);
      
      await DatabaseManager.getInstance().log('info', 'database', `Pessoa removida: ${id}`);
      return true;
    },

    async list(options?: SearchOptions<Pessoa>): Promise<SearchResult<Pessoa>> {
      return await DatabaseManager.getInstance().listItems<Pessoa>('pessoa', options);
    },

    async count(filters?: Partial<Pessoa>): Promise<number> {
      const result = await this.list({ filters });
      return result.total;
    },

    async clear(): Promise<boolean> {
      return await DatabaseManager.getInstance().clearItemsByType('pessoa');
    }
  };

  // ============================================================================
  // OPERAÇÕES PARA VEÍCULOS
  // ============================================================================

  public veiculos: DatabaseOperations<Veiculo> = {
    async create(item: Omit<Veiculo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Veiculo> {
      const newItem: Veiculo = {
        ...item,
        id: `veiculo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        placa: item.placa.toUpperCase().replace(/[^A-Z0-9]/g, ''),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const key = DatabaseManager.getInstance().getStorageKey('veiculo', newItem.id);
      await DatabaseManager.getInstance().setToStorage(key, newItem);
      
      // Atualizar índices
      await DatabaseManager.getInstance().updateVehicleIndex(newItem);
      
      await DatabaseManager.getInstance().log('info', 'database', `Veículo criado: ${newItem.placa} (${newItem.id})`);
      return newItem;
    },

    async read(id: string): Promise<Veiculo | null> {
      const key = DatabaseManager.getInstance().getStorageKey('veiculo', id);
      return await DatabaseManager.getInstance().getFromStorage(key);
    },

    async update(id: string, updates: Partial<Veiculo>): Promise<Veiculo> {
      const existing = await this.read(id);
      if (!existing) {
        throw new Error(`Veículo não encontrado: ${id}`);
      }

      const updated: Veiculo = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      if (updates.placa) {
        updated.placa = updates.placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
      }

      const key = DatabaseManager.getInstance().getStorageKey('veiculo', id);
      await DatabaseManager.getInstance().setToStorage(key, updated);
      
      await DatabaseManager.getInstance().log('info', 'database', `Veículo atualizado: ${updated.placa} (${id})`);
      return updated;
    },

    async delete(id: string): Promise<boolean> {
      const key = DatabaseManager.getInstance().getStorageKey('veiculo', id);
      await DatabaseManager.getInstance().removeFromStorage(key);
      
      // Remover dos índices
      await DatabaseManager.getInstance().removeFromVehicleIndex(id);
      
      await DatabaseManager.getInstance().log('info', 'database', `Veículo removido: ${id}`);
      return true;
    },

    async list(options?: SearchOptions<Veiculo>): Promise<SearchResult<Veiculo>> {
      return await DatabaseManager.getInstance().listItems<Veiculo>('veiculo', options);
    },

    async count(filters?: Partial<Veiculo>): Promise<number> {
      const result = await this.list({ filters });
      return result.total;
    },

    async clear(): Promise<boolean> {
      return await DatabaseManager.getInstance().clearItemsByType('veiculo');
    }
  };

  // ============================================================================
  // OPERAÇÕES PARA CONSULTAS
  // ============================================================================

  public consultas: DatabaseOperations<ConsultaResult> = {
    async create(item: Omit<ConsultaResult, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConsultaResult> {
      const newItem: ConsultaResult = {
        ...item,
        id: `consulta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        placa: item.placa.toUpperCase().replace(/[^A-Z0-9]/g, ''),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const key = DatabaseManager.getInstance().getStorageKey('consulta', newItem.id);
      await DatabaseManager.getInstance().setToStorage(key, newItem);
      
      // Atualizar estatísticas
      await DatabaseManager.getInstance().updateStatistics(newItem);
      
      // Atualizar índices
      await DatabaseManager.getInstance().updateConsultaIndex(newItem);
      
      await DatabaseManager.getInstance().log('info', 'database', `Consulta salva: ${newItem.placa} - ${newItem.success ? 'Sucesso' : 'Erro'}`);
      return newItem;
    },

    async read(id: string): Promise<ConsultaResult | null> {
      const key = DatabaseManager.getInstance().getStorageKey('consulta', id);
      return await DatabaseManager.getInstance().getFromStorage(key);
    },

    async update(id: string, updates: Partial<ConsultaResult>): Promise<ConsultaResult> {
      const existing = await this.read(id);
      if (!existing) {
        throw new Error(`Consulta não encontrada: ${id}`);
      }

      const updated: ConsultaResult = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const key = DatabaseManager.getInstance().getStorageKey('consulta', id);
      await DatabaseManager.getInstance().setToStorage(key, updated);
      
      return updated;
    },

    async delete(id: string): Promise<boolean> {
      const key = DatabaseManager.getInstance().getStorageKey('consulta', id);
      await DatabaseManager.getInstance().removeFromStorage(key);
      return true;
    },

    async list(options?: SearchOptions<ConsultaResult>): Promise<SearchResult<ConsultaResult>> {
      return await DatabaseManager.getInstance().listItems<ConsultaResult>('consulta', options);
    },

    async count(filters?: Partial<ConsultaResult>): Promise<number> {
      const result = await this.list({ filters });
      return result.total;
    },

    async clear(): Promise<boolean> {
      return await DatabaseManager.getInstance().clearItemsByType('consulta');
    }
  };

  // ============================================================================
  // OPERAÇÕES PARA SESSÕES
  // ============================================================================

  public sessoes: DatabaseOperations<SessaoConsulta> = {
    async create(item: Omit<SessaoConsulta, 'id' | 'createdAt' | 'updatedAt'>): Promise<SessaoConsulta> {
      const newItem: SessaoConsulta = {
        ...item,
        id: `sessao_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const key = DatabaseManager.getInstance().getStorageKey('sessao', newItem.id);
      await DatabaseManager.getInstance().setToStorage(key, newItem);
      
      await DatabaseManager.getInstance().log('info', 'database', `Sessão criada: ${newItem.nome} (${newItem.id})`);
      return newItem;
    },

    async read(id: string): Promise<SessaoConsulta | null> {
      const key = DatabaseManager.getInstance().getStorageKey('sessao', id);
      return await DatabaseManager.getInstance().getFromStorage(key);
    },

    async update(id: string, updates: Partial<SessaoConsulta>): Promise<SessaoConsulta> {
      const existing = await this.read(id);
      if (!existing) {
        throw new Error(`Sessão não encontrada: ${id}`);
      }

      const updated: SessaoConsulta = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const key = DatabaseManager.getInstance().getStorageKey('sessao', id);
      await DatabaseManager.getInstance().setToStorage(key, updated);
      
      return updated;
    },

    async delete(id: string): Promise<boolean> {
      const key = DatabaseManager.getInstance().getStorageKey('sessao', id);
      await DatabaseManager.getInstance().removeFromStorage(key);
      return true;
    },

    async list(options?: SearchOptions<SessaoConsulta>): Promise<SearchResult<SessaoConsulta>> {
      return await DatabaseManager.getInstance().listItems<SessaoConsulta>('sessao', options);
    },

    async count(filters?: Partial<SessaoConsulta>): Promise<number> {
      const result = await this.list({ filters });
      return result.total;
    },

    async clear(): Promise<boolean> {
      return await DatabaseManager.getInstance().clearItemsByType('sessao');
    }
  };

  // ============================================================================
  // OPERAÇÕES PARA CONFIGURAÇÕES
  // ============================================================================

  public configuracoes: DatabaseOperations<ConfiguracaoSistema> = {
    async create(item: Omit<ConfiguracaoSistema, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConfiguracaoSistema> {
      const newItem: ConfiguracaoSistema = {
        ...item,
        id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const key = DatabaseManager.getInstance().getStorageKey('config', newItem.id);
      await DatabaseManager.getInstance().setToStorage(key, newItem);
      
      return newItem;
    },

    async read(id: string): Promise<ConfiguracaoSistema | null> {
      const key = DatabaseManager.getInstance().getStorageKey('config', id);
      return await DatabaseManager.getInstance().getFromStorage(key);
    },

    async update(id: string, updates: Partial<ConfiguracaoSistema>): Promise<ConfiguracaoSistema> {
      const existing = await this.read(id);
      if (!existing) {
        throw new Error(`Configuração não encontrada: ${id}`);
      }

      const updated: ConfiguracaoSistema = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const key = DatabaseManager.getInstance().getStorageKey('config', id);
      await DatabaseManager.getInstance().setToStorage(key, updated);
      
      return updated;
    },

    async delete(id: string): Promise<boolean> {
      const key = DatabaseManager.getInstance().getStorageKey('config', id);
      await DatabaseManager.getInstance().removeFromStorage(key);
      return true;
    },

    async list(options?: SearchOptions<ConfiguracaoSistema>): Promise<SearchResult<ConfiguracaoSistema>> {
      return await DatabaseManager.getInstance().listItems<ConfiguracaoSistema>('config', options);
    },

    async count(filters?: Partial<ConfiguracaoSistema>): Promise<number> {
      const result = await this.list({ filters });
      return result.total;
    },

    async clear(): Promise<boolean> {
      return await DatabaseManager.getInstance().clearItemsByType('config');
    }
  };

  // ============================================================================
  // MÉTODOS AUXILIARES PARA STORAGE
  // ============================================================================

  private getStorageKey(type: string, id: string): string {
    return `${this.STORAGE_PREFIX}${type}_${id}`;
  }

  private async getFromStorage<T>(key: string): Promise<T | null> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get([key]);
        return result[key] || null;
      } else {
        // Fallback para Node.js - implementar conforme necessário
        return null;
      }
    } catch (error) {
      await this.log('error', 'database', `Erro ao ler storage: ${error}`);
      return null;
    }
  }

  private async setToStorage<T>(key: string, value: T): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ [key]: value });
      } else {
        // Fallback para Node.js - implementar conforme necessário
      }
    } catch (error) {
      await this.log('error', 'database', `Erro ao salvar storage: ${error}`);
      throw error;
    }
  }

  private async removeFromStorage(key: string): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove([key]);
      } else {
        // Fallback para Node.js - implementar conforme necessário
      }
    } catch (error) {
      await this.log('error', 'database', `Erro ao remover storage: ${error}`);
      throw error;
    }
  }

  private async listItems<T extends BaseEntity>(type: string, options?: SearchOptions<T>): Promise<SearchResult<T>> {
    try {
      const allData = await this.getAllFromStorage();
      const prefix = `${this.STORAGE_PREFIX}${type}_`;
      
      let items = Object.entries(allData)
        .filter(([key]) => key.startsWith(prefix))
        .map(([, value]) => value as T)
        .filter(item => item && typeof item === 'object' && 'id' in item);

      // Aplicar filtros
      if (options?.filters) {
        items = items.filter(item => {
          return Object.entries(options.filters!).every(([key, value]) => {
            const itemValue = (item as any)[key];
            if (typeof value === 'string') {
              return itemValue?.toString().toLowerCase().includes(value.toLowerCase());
            }
            return itemValue === value;
          });
        });
      }

      // Aplicar ordenação
      if (options?.sortBy) {
        items.sort((a, b) => {
          const aValue = (a as any)[options.sortBy!];
          const bValue = (b as any)[options.sortBy!];
          
          if (options.sortOrder === 'desc') {
            return bValue > aValue ? 1 : -1;
          }
          return aValue > bValue ? 1 : -1;
        });
      }

      // Aplicar paginação
      const total = items.length;
      const offset = options?.offset || 0;
      const limit = options?.limit || total;
      const paginatedItems = items.slice(offset, offset + limit);

      return {
        items: paginatedItems,
        total,
        hasMore: offset + limit < total,
        offset,
        limit
      };

    } catch (error) {
      await this.log('error', 'database', `Erro ao listar ${type}: ${error}`);
      return {
        items: [],
        total: 0,
        hasMore: false,
        offset: 0,
        limit: 0
      };
    }
  }

  private async getAllFromStorage(): Promise<Record<string, any>> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        return await chrome.storage.local.get(null);
      } else {
        // Fallback para Node.js
        return {};
      }
    } catch (error) {
      await this.log('error', 'database', `Erro ao obter todos os dados: ${error}`);
      return {};
    }
  }

  private async clearItemsByType(type: string): Promise<boolean> {
    try {
      const allData = await this.getAllFromStorage();
      const prefix = `${this.STORAGE_PREFIX}${type}_`;
      const keysToRemove = Object.keys(allData).filter(key => key.startsWith(prefix));
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(keysToRemove);
      }
      
      await this.log('info', 'database', `Limpeza de ${type}: ${keysToRemove.length} itens removidos`);
      return true;
    } catch (error) {
      await this.log('error', 'database', `Erro ao limpar ${type}: ${error}`);
      return false;
    }
  }

  // ============================================================================
  // MÉTODOS PARA ATUALIZAÇÃO DE ÍNDICES
  // ============================================================================

  private async updatePersonIndex(pessoa: Pessoa): Promise<void> {
    // Implementar atualização de índices para pessoa
  }

  private async removeFromPersonIndex(pessoaId: string): Promise<void> {
    // Implementar remoção de índices para pessoa
  }

  private async updateVehicleIndex(veiculo: Veiculo): Promise<void> {
    // Implementar atualização de índices para veículo
  }

  private async removeFromVehicleIndex(veiculoId: string): Promise<void> {
    // Implementar remoção de índices para veículo
  }

  private async updateConsultaIndex(consulta: ConsultaResult): Promise<void> {
    // Implementar atualização de índices para consulta
  }

  private async updateStatistics(consulta: ConsultaResult): Promise<void> {
    // Implementar atualização de estatísticas
  }

  // ============================================================================
  // MÉTODOS ESPECÍFICOS PARA RELACIONAMENTOS
  // ============================================================================

  // Buscar veículos de uma pessoa
  async getVeiculosByProprietario(proprietarioId: string): Promise<Veiculo[]> {
    const result = await this.veiculos.list({
      filters: { proprietarioId } as any
    });
    return result.items;
  }

  // Buscar consultas de uma placa
  async getConsultasByPlaca(placa: string): Promise<ConsultaResult[]> {
    const placaFormatted = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const result = await this.consultas.list({
      filters: { placa: placaFormatted } as any,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    return result.items;
  }

  // Buscar pessoa por CPF
  async getPessoaByCpf(cpf: string): Promise<Pessoa | null> {
    const result = await this.pessoas.list({
      filters: { cpf } as any,
      limit: 1
    });
    return result.items[0] || null;
  }

  // Buscar veículo por placa
  async getVeiculoByPlaca(placa: string): Promise<Veiculo | null> {
    const placaFormatted = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const result = await this.veiculos.list({
      filters: { placa: placaFormatted } as any,
      limit: 1
    });
    return result.items[0] || null;
  }

  // ============================================================================
  // SISTEMA DE LOGS
  // ============================================================================

  private async log(level: 'debug' | 'info' | 'warn' | 'error', component: string, message: string, details?: any): Promise<void> {
    try {
      const logEntry: Omit<LogSistema, 'id' | 'createdAt' | 'updatedAt'> = {
        level,
        component: component as any,
        message,
        details
      };

      const newLog: LogSistema = {
        ...logEntry,
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const key = this.getStorageKey('log', newLog.id);
      await this.setToStorage(key, newLog);

      // Limitar número de logs
      await this.cleanupLogs();

    } catch (error) {
      console.error('Erro ao salvar log:', error);
    }
  }

  private async cleanupLogs(): Promise<void> {
    try {
      const allLogs = await this.listItems<LogSistema>('log');
      
      if (allLogs.total > this.MAX_ITEMS.logs) {
        const logsToDelete = allLogs.items
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .slice(0, allLogs.total - this.MAX_ITEMS.logs);
        
        for (const log of logsToDelete) {
          const key = this.getStorageKey('log', log.id);
          await this.removeFromStorage(key);
        }
      }
    } catch (error) {
      console.error('Erro na limpeza de logs:', error);
    }
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS PARA OPERAÇÕES GLOBAIS
  // ============================================================================

  async getStorageSize(): Promise<number> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local.getBytesInUse) {
        return await chrome.storage.local.getBytesInUse();
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  async exportData(): Promise<any> {
    try {
      const [pessoas, veiculos, consultas, sessoes] = await Promise.all([
        this.pessoas.list(),
        this.veiculos.list(),
        this.consultas.list(),
        this.sessoes.list()
      ]);

      return {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        data: {
          pessoas: pessoas.items,
          veiculos: veiculos.items,
          consultas: consultas.items,
          sessoes: sessoes.items
        },
        statistics: {
          totalPessoas: pessoas.total,
          totalVeiculos: veiculos.total,
          totalConsultas: consultas.total,
          totalSessoes: sessoes.total
        }
      };
    } catch (error) {
      await this.log('error', 'database', `Erro ao exportar dados: ${error}`);
      throw error;
    }
  }

  async clearAllData(): Promise<boolean> {
    try {
      await Promise.all([
        this.pessoas.clear(),
        this.veiculos.clear(),
        this.consultas.clear(),
        this.sessoes.clear()
      ]);

      await this.log('info', 'database', 'Todos os dados foram limpos');
      return true;
    } catch (error) {
      await this.log('error', 'database', `Erro ao limpar dados: ${error}`);
      return false;
    }
  }
}

// ============================================================================
// INSTÂNCIA GLOBAL E EXPORTS
// ============================================================================

// Instância global do banco de dados
export const database = DatabaseManager.getInstance();

// Export default
export default database;
