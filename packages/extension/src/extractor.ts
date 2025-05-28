// ============================================================================
// EXTRATOR DE DADOS DO SITE (CORAÇÃO DA FUNCIONALIDADE)
// ============================================================================

import { 
  ConsultaResult,
  ValidationUtils,
  validatePessoa,
  validateVeiculo,
  validateConsulta,
  Pessoa,
  Veiculo
} from '@bot-consulta/shared';


// ============================================================================
// INTERFACES ESPECÍFICAS PARA EXTRAÇÃO
// ============================================================================

export interface ExtractionConfig {
  timeout: number;
  retries: number;
  waitForElements: number;
  captchaTimeout: number;
  extractFullData: boolean;
}

export interface ExtractionResult {
  success: boolean;
  data?: {
    pessoa?: Pessoa;
    veiculo?: Veiculo;
    consulta: ConsultaResult;
    rawData?: any;
  };
  error?: string;
  executionTime: number;
  screenshots?: string[];
  logs: string[];
}

export interface SiteSelectors {
  // Campos de entrada
  loginField: string;
  passwordField: string;
  placaField: string;
  submitButton: string;
  
  // CAPTCHA
  captchaContainer: string;
  captchaInput: string;
  captchaImage: string;
  
  // Resultados
  resultContainer: string;
  errorContainer: string;
  loadingIndicator: string;
  
  // Dados específicos
  nomeField: string;
  cpfField: string;
  modeloField: string;
  corField: string;
  anoField: string;
  situacaoField: string;
}

// ============================================================================
// CLASSE PRINCIPAL DE EXTRAÇÃO
// ============================================================================

export class DataExtractor {
  private config: ExtractionConfig;
  private selectors: SiteSelectors;
  private logs: string[] = [];
  
  constructor(config?: Partial<ExtractionConfig>) {
    this.config = {
      timeout: 30000,
      retries: 3,
      waitForElements: 5000,
      captchaTimeout: 120000,
      extractFullData: true,
      ...config
    };
    
    // Seletores específicos do site elpump.xyz
    this.selectors = {
      // Campos de entrada
      loginField: '#login, input[name="login"], input[name="username"]',
      passwordField: '#senha, input[name="senha"], input[name="password"]',
      placaField: 'input[name="placa"], #placa, input[placeholder*="placa" i]',
      submitButton: 'button[type="submit"], input[type="submit"], button:contains("Consultar")',
      
      // CAPTCHA
      captchaContainer: '.cf-turnstile, .captcha, #captcha, .g-recaptcha',
      captchaInput: 'input[name="cf-turnstile-response"], input[name="g-recaptcha-response"]',
      captchaImage: '.captcha img, #captcha img',
      
      // Resultados
      resultContainer: '.result, .dados, .info, #resultado, .consulta-result',
      errorContainer: '.error, .alert-danger, .erro, #error',
      loadingIndicator: '.loading, .spinner, #loading',
      
      // Dados específicos (ajustar conforme site real)
      nomeField: '[data-field="nome"], .nome, #nome, td:contains("Nome") + td',
      cpfField: '[data-field="cpf"], .cpf, #cpf, td:contains("CPF") + td',
      modeloField: '[data-field="modelo"], .modelo, #modelo, td:contains("Modelo") + td',
      corField: '[data-field="cor"], .cor, #cor, td:contains("Cor") + td',
      anoField: '[data-field="ano"], .ano, #ano, td:contains("Ano") + td',
      situacaoField: '[data-field="situacao"], .situacao, #situacao, td:contains("Situação") + td'
    };
  }
  
  // ============================================================================
  // MÉTODO PRINCIPAL DE EXTRAÇÃO
  // ============================================================================
  
  async extractData(placa: string, sessionId: string): Promise<ExtractionResult> {
    const startTime = Date.now();
    this.logs = [];
    
    try {
      this.log(`🔍 Iniciando extração para placa: ${placa}`);
      
      // Validar placa
      const placaValidation = ValidationUtils.validatePlaca(placa);
      if (!placaValidation.valid) {
        throw new Error(`Placa inválida: ${placa}`);
      }
      
      const placaFormatted = ValidationUtils.formatPlaca(placa);
      this.log(`✅ Placa validada: ${placaFormatted} (${placaValidation.format})`);
      
      // Verificar se página está pronta
      await this.waitForPageReady();
      
      // Fazer login se necessário
      await this.ensureLoggedIn();
      
      // Preencher campo de placa
      await this.fillPlacaField(placaFormatted);
      
      // Resolver CAPTCHA se presente
      await this.handleCaptcha();
      
      // Submeter formulário
      await this.submitForm();
      
      // Aguardar e extrair resultados
      const extractedData = await this.extractResults(placaFormatted, sessionId);
      
      const executionTime = Date.now() - startTime;
      this.log(`✅ Extração concluída em ${executionTime}ms`);
      
      return {
        success: true,
        data: extractedData,
        executionTime,
        logs: this.logs
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.log(`❌ Erro na extração: ${(error as Error).message}`);
      
      return {
        success: false,
        error: (error as Error).message,
        executionTime,
        logs: this.logs
      };
    }
  }
  
  // ============================================================================
  // MÉTODOS AUXILIARES DE EXTRAÇÃO
  // ============================================================================
  
  private async waitForPageReady(): Promise<void> {
    this.log('⏳ Aguardando página carregar...');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout aguardando página carregar'));
      }, this.config.timeout);
      
      const checkReady = () => {
        if (document.readyState === 'complete') {
          clearTimeout(timeout);
          this.log('✅ Página carregada');
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      
      checkReady();
    });
  }
  
  private async ensureLoggedIn(): Promise<void> {
    this.log('🔐 Verificando login...');
    
    // Verificar se já está logado (procurar por campo de placa)
    const placaField = document.querySelector(this.selectors.placaField);
    
    if (placaField) {
      this.log('✅ Já está logado');
      return;
    }
    
    // Verificar se há campos de login
    const loginField = document.querySelector(this.selectors.loginField);
    const passwordField = document.querySelector(this.selectors.passwordField);
    
    if (!loginField || !passwordField) {
      throw new Error('Campos de login não encontrados - verifique se está na página correta');
    }
    
    this.log('⚠️ Não está logado - aguardando login manual ou automático');
    
    // Aguardar login (será feito pelo background script ou manualmente)
    await this.waitForLogin();
  }
  
  private async waitForLogin(): Promise<void> {
    this.log('⏳ Aguardando login...');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout aguardando login'));
      }, this.config.timeout);
      
      const checkLogin = () => {
        const placaField = document.querySelector(this.selectors.placaField);
        
        if (placaField) {
          clearTimeout(timeout);
          this.log('✅ Login detectado');
          resolve();
        } else {
          setTimeout(checkLogin, 1000);
        }
      };
      
      checkLogin();
    });
  }
  
  private async fillPlacaField(placa: string): Promise<void> {
    this.log(`📝 Preenchendo campo de placa: ${placa}`);
    
    const placaField = document.querySelector(this.selectors.placaField) as HTMLInputElement;
    
    if (!placaField) {
      throw new Error('Campo de placa não encontrado');
    }
    
    // Limpar campo
    placaField.value = '';
    placaField.focus();
    
    // Simular digitação humana
    for (const char of placa) {
      placaField.value += char;
      placaField.dispatchEvent(new Event('input', { bubbles: true }));
      await this.sleep(50 + Math.random() * 100);
    }
    
    placaField.dispatchEvent(new Event('change', { bubbles: true }));
    placaField.blur();
    
    this.log(`✅ Placa preenchida: ${placaField.value}`);
  }
  
  private async handleCaptcha(): Promise<void> {
    this.log('🔒 Verificando CAPTCHA...');
    
    const captchaContainer = document.querySelector(this.selectors.captchaContainer);
    
    if (!captchaContainer) {
      this.log('✅ Nenhum CAPTCHA detectado');
      return;
    }
    
    this.log('⚠️ CAPTCHA detectado - aguardando resolução...');
    
    // Aguardar resolução do CAPTCHA
    await this.waitForCaptchaResolution();
  }
  
  private async waitForCaptchaResolution(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout aguardando resolução do CAPTCHA'));
      }, this.config.captchaTimeout);
      
      const checkCaptcha = () => {
        const captchaInput = document.querySelector(this.selectors.captchaInput) as HTMLInputElement;
        
        if (captchaInput && captchaInput.value && captchaInput.value.length > 10) {
          clearTimeout(timeout);
          this.log('✅ CAPTCHA resolvido');
          resolve();
        } else {
          setTimeout(checkCaptcha, 1000);
        }
      };
      
      checkCaptcha();
    });
  }
  
  private async submitForm(): Promise<void> {
    this.log('📤 Submetendo formulário...');
    
    const submitButton = document.querySelector(this.selectors.submitButton) as HTMLButtonElement;
    
    if (!submitButton) {
      throw new Error('Botão de submissão não encontrado');
    }
    
    // Simular clique humano
    submitButton.focus();
    await this.sleep(500);
    
    submitButton.click();
    
    this.log('✅ Formulário submetido');
    
    // Aguardar processamento
    await this.waitForResults();
  }
  
  private async waitForResults(): Promise<void> {
    this.log('⏳ Aguardando resultados...');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout aguardando resultados'));
      }, this.config.timeout);
      
      const checkResults = () => {
        // Verificar se há resultados
        const resultContainer = document.querySelector(this.selectors.resultContainer);
        const errorContainer = document.querySelector(this.selectors.errorContainer);
        const loadingIndicator = document.querySelector(this.selectors.loadingIndicator);
        
        // Se ainda está carregando, continuar aguardando
                if (loadingIndicator && (loadingIndicator as HTMLElement).offsetParent !== null) {
          setTimeout(checkResults, 500);
          return;
        }
        
        // Se há resultado ou erro, parar de aguardar
        if (resultContainer || errorContainer) {
          clearTimeout(timeout);
          this.log('✅ Resultados carregados');
          resolve();
        } else {
          setTimeout(checkResults, 500);
        }
      };
      
      // Aguardar um pouco antes de começar a verificar
      setTimeout(checkResults, 2000);
    });
  }
  
  private async extractResults(placa: string, sessionId: string): Promise<ExtractionResult['data']> {
    this.log('📊 Extraindo dados da página...');
    
    // Verificar se há erro
    const errorContainer = document.querySelector(this.selectors.errorContainer);
    if (errorContainer && errorContainer.textContent) {
      throw new Error(`Erro do site: ${errorContainer.textContent.trim()}`);
    }
    
    // Extrair dados
    const rawData = this.extractRawData();
    
    // Processar e validar dados
    const processedData = this.processExtractedData(rawData, placa, sessionId);
    
        this.log(`✅ Dados extraídos: ${Object.keys(processedData?.consulta?.data || {}).length} campos`);

    
    return processedData;
  }
  
  private extractRawData(): any {
    const rawData: any = {};
    
    // Extrair usando seletores específicos
    const extractors = {
      nome: this.selectors.nomeField,
      cpf: this.selectors.cpfField,
      modelo: this.selectors.modeloField,
      cor: this.selectors.corField,
      ano: this.selectors.anoField,
      situacao: this.selectors.situacaoField
    };
    
    for (const [field, selector] of Object.entries(extractors)) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          rawData[field] = element.textContent?.trim() || '';
        }
      } catch (error) {
        this.log(`⚠️ Erro ao extrair ${field}: ${error}`);
      }
    }
    
    // Extrair dados de tabelas
    const tables = document.querySelectorAll('table');
    if (tables.length > 0) {
      rawData.tables = this.extractTableData(tables);
    }
    
    // Extrair texto geral da página de resultados
    const resultContainer = document.querySelector(this.selectors.resultContainer);
    if (resultContainer) {
      rawData.fullText = resultContainer.textContent?.trim() || '';
    }
    
    return rawData;
  }
  
  private extractTableData(tables: NodeListOf<HTMLTableElement>): any[] {
    const tablesData: any[] = [];
    
    tables.forEach((table, index) => {
      const tableData: any = {
        index,
        headers: [],
        rows: []
      };
      
      // Extrair cabeçalhos
      const headers = table.querySelectorAll('th');
      headers.forEach(th => {
        tableData.headers.push(th.textContent?.trim() || '');
      });
      
      // Extrair linhas
      const rows = table.querySelectorAll('tr');
      rows.forEach(tr => {
        const cells = tr.querySelectorAll('td');
        if (cells.length > 0) {
          const rowData: string[] = [];
          cells.forEach(td => {
            rowData.push(td.textContent?.trim() || '');
          });
          tableData.rows.push(rowData);
        }
      });
      
      tablesData.push(tableData);
    });
    
    return tablesData;
  }
  
  private processExtractedData(rawData: any, placa: string, sessionId: string): ExtractionResult['data'] {
    // Criar objeto Pessoa se dados disponíveis
    let pessoa: Pessoa | undefined;
    if (rawData.nome || rawData.cpf) {
      const pessoaData = {
        nome: rawData.nome || 'Nome não informado',
        cpf: rawData.cpf || ''
      };
      
      const validation = validatePessoa(pessoaData);
      if (validation.valid) {
        pessoa = {
          id: `pessoa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          nome: pessoaData.nome,
          cpf: pessoaData.cpf,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
    }
    
    // Criar objeto Veículo
    let veiculo: Veiculo | undefined;
    const veiculoData = {
      placa,
      proprietarioId: pessoa?.id || 'unknown',
      modelo: rawData.modelo || '',
      cor: rawData.cor || '',
      ano: rawData.ano || ''
    };
    
    const veiculoValidation = validateVeiculo(veiculoData);
    if (veiculoValidation.valid) {
      veiculo = {
        id: `veiculo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...veiculoData,
        situacao: rawData.situacao as any || 'desconhecida',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    
    // Criar objeto Consulta
    const consulta: ConsultaResult = {
      id: `consulta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      placa,
      success: true,
      data: {
        nome: rawData.nome,
        cpf: rawData.cpf,
        modelo: rawData.modelo,
        cor: rawData.cor,
        ano: rawData.ano,
        situacao: rawData.situacao,
        ...rawData
      },
      executionTime: 0, // Será preenchido pelo chamador
      sessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return {
      pessoa,
      veiculo,
      consulta,
      rawData
    };
  }
  
  // ============================================================================
  // MÉTODOS UTILITÁRIOS
  // ============================================================================
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    this.logs.push(logMessage);
    console.log(logMessage);
  }
  
  // ============================================================================
  // MÉTODOS PÚBLICOS PARA CONFIGURAÇÃO
  // ============================================================================
  
  updateConfig(newConfig: Partial<ExtractionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log(`🔧 Configuração atualizada: ${JSON.stringify(newConfig)}`);
  }
  
  updateSelectors(newSelectors: Partial<SiteSelectors>): void {
    this.selectors = { ...this.selectors, ...newSelectors };
    this.log(`🎯 Seletores atualizados: ${Object.keys(newSelectors).join(', ')}`);
  }
  
  // Método para testar seletores
  testSelectors(): { [key: string]: boolean } {
    const results: { [key: string]: boolean } = {};
    
    for (const [name, selector] of Object.entries(this.selectors)) {
      try {
        const element = document.querySelector(selector);
        results[name] = !!element;
      } catch (error) {
        results[name] = false;
      }
    }
    
    return results;
  }
  
  // Método para capturar screenshot (se suportado)
  async captureScreenshot(): Promise<string | null> {
    try {
      // Implementar captura de screenshot se necessário
      return null;
    } catch (error) {
      this.log(`⚠️ Erro ao capturar screenshot: ${error}`);
      return null;
    }
  }
}

// ============================================================================
// INSTÂNCIA GLOBAL E EXPORTS
// ============================================================================

// Instância global do extrator
export const dataExtractor = new DataExtractor();

// Export default
export default dataExtractor;
