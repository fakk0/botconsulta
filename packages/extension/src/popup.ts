// ============================================================================
// POPUP SIMPLIFICADO SEM IMPORTS EXTERNOS
// ============================================================================

// Interfaces locais simplificadas
interface PopupState {
  isConnectedToBot: boolean;
  isExtracting: boolean;
  lastUpdate: string;
}

// Classe principal do popup
class ExtensionPopup {
  private state: PopupState;
  private statusElement!: HTMLElement;
  private connectBtn!: HTMLButtonElement;
  private testBtn!: HTMLButtonElement;

  constructor() {
    this.state = {
      isConnectedToBot: false,
      isExtracting: false,
      lastUpdate: new Date().toISOString()
    };

    this.initializeElements();
    this.bindEvents();
    this.updateStatus();
    
    console.log('🎛️ Popup inicializado');
  }

  private initializeElements(): void {
    this.statusElement = document.getElementById('status')!;
    this.connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
    this.testBtn = document.getElementById('testBtn') as HTMLButtonElement;
    
    console.log('✅ Elementos encontrados:', {
      status: !!this.statusElement,
      connectBtn: !!this.connectBtn,
      testBtn: !!this.testBtn
    });
  }

  private bindEvents(): void {
    this.connectBtn.addEventListener('click', () => {
      console.log('🔌 Botão conectar clicado');
      this.toggleConnection();
    });
    
    this.testBtn.addEventListener('click', () => {
      console.log('🧪 Botão teste clicado');
      this.testConnection();
    });
  }

  private async toggleConnection(): Promise<void> {
    try {
      this.connectBtn.disabled = true;
      this.connectBtn.textContent = '🔄 Conectando...';
      
      console.log('📤 Enviando mensagem para background...');

      if (this.state.isConnectedToBot) {
        // Desconectar
        const response = await this.sendMessageToBackground({ type: 'DISCONNECT_FROM_BOT' });
        console.log('📥 Resposta desconexão:', response);
        
        this.state.isConnectedToBot = false;
        this.showStatus('📴 Desconectado do bot', 'disconnected');
      } else {
        // Conectar
        const response = await this.sendMessageToBackground({ type: 'CONNECT_TO_BOT' });
        console.log('📥 Resposta conexão:', response);
        
        if (response && response.success) {
          this.state.isConnectedToBot = true;
          this.showStatus('✅ Conectado ao bot externo!', 'connected');
        } else {
          this.showStatus('❌ Falha na conexão', 'disconnected');
        }
      }

      this.updateConnectionButton();

    } catch (error) {
      console.error('❌ Erro na conexão:', error);
      this.showStatus('❌ Erro: ' + (error as Error).message, 'disconnected');
    } finally {
      this.connectBtn.disabled = false;
      this.updateConnectionButton();
    }
  }

  private async testConnection(): Promise<void> {
    try {
      this.testBtn.disabled = true;
      this.testBtn.textContent = '🧪 Testando...';
      
      console.log('🧪 Testando conexão...');
      
      // Testar se bot está rodando
      const response = await fetch('http://localhost:3000/api/status');
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Bot respondeu:', data);
        this.showStatus('✅ Bot está rodando!', 'connected');
      } else {
        console.log('❌ Bot não respondeu');
        this.showStatus('❌ Bot não está rodando', 'disconnected');
      }
      
    } catch (error) {
      console.error('❌ Erro no teste:', error);
      this.showStatus('❌ Bot não encontrado', 'disconnected');
    } finally {
      this.testBtn.disabled = false;
      this.testBtn.textContent = '🧪 Testar Extração';
    }
  }

  private async sendMessageToBackground(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: any) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  private updateStatus(): void {
    this.updateConnectionButton();
  }

  private updateConnectionButton(): void {
    if (this.state.isConnectedToBot) {
      this.connectBtn.textContent = '📴 Desconectar';
    } else {
      this.connectBtn.textContent = '🔌 Conectar ao Bot';
    }
  }

  private showStatus(message: string, type: string): void {
    this.statusElement.textContent = message;
    this.statusElement.className = `status ${type}`;
    
    console.log(`📊 Status: ${message}`);
  }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM carregado, inicializando popup...');
  new ExtensionPopup();
});
