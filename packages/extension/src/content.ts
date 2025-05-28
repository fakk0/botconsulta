// Content script para extração de dados
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
        id: `consulta_${Date.now()}`,
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
        id: `consulta_${Date.now()}`,
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

new DataExtractor();