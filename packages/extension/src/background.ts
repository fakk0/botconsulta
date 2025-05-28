// ============================================================================
// BACKGROUND SIMPLIFICADO SEM IMPORTS EXTERNOS
// ============================================================================

// Interfaces locais
interface ExtensionState {
  isConnectedToBot: boolean;
  lastActivity: string;
}

// Classe principal do background
class ExtensionBackground {
  private state: ExtensionState;

  constructor() {
    this.state = {
      isConnectedToBot: false,
      lastActivity: new Date().toISOString()
    };

    this.setupListeners();
    this.log('🔧 Background Service Worker iniciado');
  }

  private setupListeners(): void {
    // Listener para mensagens do popup
    chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: Function) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Manter canal aberto
    chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: Function) => {
  if (message.type === 'BOT_COMMAND') {
    this.handleBotCommand(message.payload, sendResponse);
    return true; // Manter canal aberto para resposta assíncrona
  }
});
    });
  }

private async handleBotCommand(comando: any, sendResponse: Function): Promise<void> {
  try {
    this.log(`🤖 Comando recebido do bot: ${comando.type}`);
    
    switch (comando.type) {
      case 'EXTRAIR_CARROS':
        const result = await this.extrairCarrosReal(comando.payload);
        sendResponse(result);
        break;
        
      default:
        sendResponse({
          success: false,
          error: `Comando não suportado: ${comando.type}`
        });
    }
    
  } catch (error) {
    this.log(`❌ Erro ao processar comando: ${error}`);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

private async extrairCarrosReal(parametros: any): Promise<any> {
  try {
    this.log(`🚗 INICIANDO EXTRAÇÃO REAL: ${parametros.modelo} ${parametros.cor}`);
    
    // AQUI DEVE USAR O car-extractor.ts REAL
    // Por enquanto, retornar erro para forçar implementação
    throw new Error('Extração real não implementada - car-extractor.ts não integrado');
    
    // TODO: Implementar integração real com car-extractor
    // const extractor = new CarExtractor();
    // const resultado = await extractor.extrairCarrosPorModelo(parametros);
    // return resultado;
    
  } catch (error) {
    this.log(`❌ ERRO na extração real: ${error}`);
    throw error;
  }
}

  private async handleMessage(message: any, sender: any, sendResponse: Function): Promise<void> {
    try {
      this.log(`📨 Mensagem recebida: ${message.type}`);

      switch (message.type) {
        case 'GET_STATUS':
          sendResponse(this.getStatus());
          break;

        case 'CONNECT_TO_BOT':
          const connectResult = await this.connectToBot();
          sendResponse({ success: connectResult });
          break;

        case 'DISCONNECT_FROM_BOT':
          this.disconnectFromBot();
          sendResponse({ success: true });
          break;

        case 'EXTRACT_DATA':
          console.log('🔍 COMANDO RECEBIDO: EXTRACT_DATA', message);
          const extractResult = await this.extrairCarros(message.parametros);
          console.log('📥 RESULTADO EXTRAÇÃO:', extractResult);
         sendResponse(extractResult);
        break;  

        default:
          sendResponse({ success: false, error: 'Tipo de mensagem desconhecido' });
      }

    } catch (error) {
      this.log(`❌ Erro ao processar mensagem: ${(error as Error).message}`);
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  private async extrairCarros(parametros: any): Promise<any> {
  console.log('🚗 Iniciando extração de carros:', parametros);
  
  try {
    // AQUI DEVE USAR O car-extractor.ts
    // Por enquanto, retornar dados simulados
    return {
      success: true,
      carros: [
        {
          placa: 'ABC1234',
          modelo: parametros.modelo,
          cor: parametros.cor,
          ano: parametros.anoInicio
        }
      ],
      total: 1
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

  private async connectToBot(): Promise<boolean> {
    try {
      this.log('🔌 Tentando conectar ao bot externo...');
      
      // Testar conexão HTTP
      const response = await fetch('http://localhost:3000/api/status');
      
      if (!response.ok) {
        throw new Error('Bot externo não está rodando na porta 3000');
      }
      
      const botStatus = await response.json();
      this.log(`✅ Bot encontrado: ${botStatus.status}`);
      
      this.state.isConnectedToBot = true;
      this.log('✅ Conectado ao bot externo');
      
      return true;
      
    } catch (error) {
      this.log(`❌ Erro na conexão: ${(error as Error).message}`);
      this.state.isConnectedToBot = false;
      return false;
    }
  }

  private disconnectFromBot(): void {
    this.state.isConnectedToBot = false;
    this.log('📴 Desconectado do bot externo');
  }

  private getStatus(): any {
    return {
      isConnectedToBot: this.state.isConnectedToBot,
      lastActivity: this.state.lastActivity
    };
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [BACKGROUND] ${message}`);
  }
}

// Inicializar background
new ExtensionBackground();
