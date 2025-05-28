// ============================================================================
// EXTRATOR ESPECÍFICO PARA CONSULTA DE CARROS
// ============================================================================

interface CarroEncontrado {
  id: string;
  modelo: string;
  cor: string;
  ano: string;
  placa: string;
  chassi?: string;
  renavam?: string;
  fonte: 'elpump' | 'backup1' | 'backup2';
  dadosOriginais: any;
  consultaOrigemId: string;
  criadoEm: string;
}

interface ParametrosConsulta {
  modelo: string;
  cor: string;
  anoInicio: string;
  anoFim?: string;
  prioridade?: 'baixa' | 'normal' | 'alta';
  batchId?: string;
}

// ValidationUtils local simplificado
class ValidationUtils {
  static validatePlaca(placa: string): { valid: boolean } {
    if (!placa) return { valid: false };
    const cleanPlaca = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const oldFormat = /^[A-Z]{3}[0-9]{4}$/;
    const mercosulFormat = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
    return { valid: oldFormat.test(cleanPlaca) || mercosulFormat.test(cleanPlaca) };
  }
}

// ============================================================================
// INTERFACES ESPECÍFICAS PARA EXTRAÇÃO DE CARROS
// ============================================================================

export interface SeletoresCarros {
  // Campos de busca
  modeloField: string;
  corField: string;
  anoInicioField: string;
  anoFimField: string;
  buscarButton: string;
  
  // Resultados
  popup: string;
  resultTable: string;
  tableRows: string;
  tableCells: string;
  closeButton: string;
  
  // Estados
  loadingIndicator: string;
  errorMessage: string;
}

export interface ResultadoExtracaoCarros {
  success: boolean;
  carros: CarroEncontrado[];
  error?: string;
  executionTime: number;
  logs: string[];
}

// ============================================================================
// CLASSE EXTRATORA DE CARROS
// ============================================================================

export class CarExtractor {
  private seletores: SeletoresCarros;
  private logs: string[] = [];

  constructor() {
    // Seletores baseados na estrutura real do site
    this.seletores = {
      // Campos de busca (ajustar conforme site real)
      modeloField: 'input[name="modelo"], #modelo, input[placeholder*="modelo" i]',
      corField: 'input[name="cor"], #cor, select[name="cor"]',
      anoInicioField: 'input[name="ano_inicio"], #ano_inicio, input[placeholder*="ano" i]',
      anoFimField: 'input[name="ano_fim"], #ano_fim',
      buscarButton: 'button[type="submit"], input[type="submit"], button:contains("Buscar")',
      
      // Resultados - baseado na estrutura fornecida
      popup: '.popup',
      resultTable: '.popup .resultable table',
      tableRows: 'tbody tr',
      tableCells: 'td',
      closeButton: '.close-btn, button:contains("Fechar")',
      
      // Estados
      loadingIndicator: '.loading, .spinner, #loading',
      errorMessage: '.error, .alert-danger, .erro'
    };
  }

  // ============================================================================
  // MÉTODO PRINCIPAL DE EXTRAÇÃO
  // ============================================================================

  async extrairCarrosPorModelo(parametros: ParametrosConsulta): Promise<ResultadoExtracaoCarros> {
    const startTime = Date.now();
    this.logs = [];
    
    try {
      this.log(`🔍 Iniciando busca: ${parametros.modelo} ${parametros.cor} ${parametros.anoInicio}`);
      
      // 1. Verificar se página está pronta
      await this.aguardarPaginaPronta();
      
      // 2. Preencher campos de busca
      await this.preencherCamposBusca(parametros);
      
      // 3. Submeter busca
      await this.submeterBusca();
      
      // 4. Aguardar popup com resultados
      await this.aguardarPopupResultados();
      
      // 5. Extrair dados da tabela
      const carros = await this.extrairDadosTabela(parametros);
      
      // 6. Fechar popup
      await this.fecharPopup();
      
      const executionTime = Date.now() - startTime;
      
      this.log(`✅ Extração concluída: ${carros.length} carros encontrados em ${executionTime}ms`);
      
      return {
        success: true,
        carros,
        executionTime,
        logs: this.logs
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.log(`❌ Erro na extração: ${(error as Error).message}`);
      
      return {
        success: false,
        carros: [],
        error: (error as Error).message,
        executionTime,
        logs: this.logs
      };
    }
  }

  // ============================================================================
  // MÉTODOS DE PREENCHIMENTO
  // ============================================================================

  private async preencherCamposBusca(parametros: ParametrosConsulta): Promise<void> {
    this.log('📝 Preenchendo campos de busca...');
    
    // Preencher modelo
    await this.preencherCampo(this.seletores.modeloField, parametros.modelo, 'Modelo');
    
    // Preencher cor
    await this.preencherCampo(this.seletores.corField, parametros.cor, 'Cor');
    
    // Preencher ano início
    await this.preencherCampo(this.seletores.anoInicioField, parametros.anoInicio, 'Ano Início');
    
    // Preencher ano fim (se fornecido)
    if (parametros.anoFim) {
      await this.preencherCampo(this.seletores.anoFimField, parametros.anoFim, 'Ano Fim');
    }
    
    this.log('✅ Campos preenchidos com sucesso');
  }

  private async preencherCampo(seletor: string, valor: string, nomeCampo: string): Promise<void> {
    const elemento = document.querySelector(seletor) as HTMLInputElement | HTMLSelectElement;
    
    if (!elemento) {
      throw new Error(`Campo ${nomeCampo} não encontrado: ${seletor}`);
    }
    
    // Verificar tipo de elemento
    if (elemento.tagName.toLowerCase() === 'select') {
      // Para select, procurar option correspondente
      const select = elemento as HTMLSelectElement;
      const options = Array.from(select.options);
      const option = options.find(opt => 
        opt.text.toLowerCase().includes(valor.toLowerCase()) ||
        opt.value.toLowerCase().includes(valor.toLowerCase())
      );
      
      if (option) {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        this.log(`✅ ${nomeCampo}: ${valor} (select)`);
      } else {
        throw new Error(`Opção "${valor}" não encontrada no campo ${nomeCampo}`);
      }
    } else {
      // Para input, simular digitação humana
      const input = elemento as HTMLInputElement;
      input.focus();
      input.value = '';
      
      // Simular digitação caractere por caractere
      for (const char of valor) {
        input.value += char;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await this.sleep(50 + Math.random() * 100); // Variação humana
      }
      
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.blur();
      
      this.log(`✅ ${nomeCampo}: ${valor}`);
    }
  }

  // ============================================================================
  // MÉTODOS DE SUBMISSÃO E AGUARDO
  // ============================================================================

  private async submeterBusca(): Promise<void> {
    this.log('📤 Submetendo busca...');
    
    const botaoBuscar = document.querySelector(this.seletores.buscarButton) as HTMLButtonElement;
    
    if (!botaoBuscar) {
      throw new Error('Botão de busca não encontrado');
    }
    
    // Simular clique humano
    botaoBuscar.focus();
    await this.sleep(500);
    botaoBuscar.click();
    
    this.log('✅ Busca submetida');
  }

  private async aguardarPopupResultados(): Promise<void> {
    this.log('⏳ Aguardando popup com resultados...');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout aguardando popup de resultados'));
      }, 30000); // 30 segundos
      
      const verificarPopup = () => {
        // Verificar se há erro
        const erro = document.querySelector(this.seletores.errorMessage);
        if (erro && erro.textContent) {
          clearTimeout(timeout);
          reject(new Error(`Erro do site: ${erro.textContent.trim()}`));
          return;
        }
        
        // Verificar se ainda está carregando
        const loading = document.querySelector(this.seletores.loadingIndicator);
        if (loading && (loading as HTMLElement).offsetParent !== null) {
          setTimeout(verificarPopup, 500);
          return;
        }
        
        // Verificar se popup apareceu
        const popup = document.querySelector(this.seletores.popup);
        const tabela = document.querySelector(this.seletores.resultTable);
        
        if (popup && tabela) {
          clearTimeout(timeout);
          this.log('✅ Popup com resultados encontrado');
          resolve();
        } else {
          setTimeout(verificarPopup, 500);
        }
      };
      
      // Aguardar um pouco antes de começar a verificar
      setTimeout(verificarPopup, 2000);
    });
  }

  // ============================================================================
  // EXTRAÇÃO DE DADOS DA TABELA
  // ============================================================================

  private async extrairDadosTabela(parametros: ParametrosConsulta): Promise<CarroEncontrado[]> {
    this.log('📊 Extraindo dados da tabela...');
    
    const tabela = document.querySelector(this.seletores.resultTable) as HTMLTableElement;
    
    if (!tabela) {
      throw new Error('Tabela de resultados não encontrada');
    }
    
    const linhas = tabela.querySelectorAll(this.seletores.tableRows);
    const carros: CarroEncontrado[] = [];
    
    // Verificar se há header e pular primeira linha se necessário
    const primeiraLinha = linhas[0];
    const temHeader = primeiraLinha?.querySelector('th') !== null;
    const linhasData = temHeader ? Array.from(linhas).slice(1) : Array.from(linhas);
    
    this.log(`📋 Processando ${linhasData.length} linhas de dados`);
    
    for (let i = 0; i < linhasData.length; i++) {
      const linha = linhasData[i];
      const celulas = linha.querySelectorAll(this.seletores.tableCells);
      
      if (celulas.length >= 6) {
        try {
          // Mapear dados conforme estrutura: Placa | Modelo | Ano | UF | Cidade | Cor
          const carro: CarroEncontrado = {
            id: `carro_${Date.now()}_${i}`,
            placa: this.limparTexto(celulas[0].textContent || ''),
            modelo: this.limparTexto(celulas[1].textContent || ''),
            ano: this.limparTexto(celulas[2].textContent || ''),
            cor: this.limparTexto(celulas[5].textContent || ''),
            fonte: 'elpump',
            consultaOrigemId: '',
            criadoEm: new Date().toISOString(),
            dadosOriginais: {
              uf: this.limparTexto(celulas[3].textContent || ''),
              cidade: this.limparTexto(celulas[4].textContent || ''),
              parametrosBusca: parametros
            }
          };
          
          // Validar dados essenciais
          if (this.validarCarro(carro)) {
            carros.push(carro);
            this.log(`✅ Carro extraído: ${carro.placa} - ${carro.modelo}`);
          } else {
            this.log(`⚠️ Carro inválido na linha ${i + 1}, ignorando`);
          }
          
        } catch (error) {
          this.log(`❌ Erro ao processar linha ${i + 1}: ${error}`);
        }
      } else {
        this.log(`⚠️ Linha ${i + 1} tem ${celulas.length} células, esperado 6`);
      }
    }
    
    this.log(`✅ Extração concluída: ${carros.length} carros válidos`);
    
    return carros;
  }

  // ============================================================================
  // MÉTODOS DE VALIDAÇÃO E LIMPEZA
  // ============================================================================

  private validarCarro(carro: CarroEncontrado): boolean {
    // Validar placa
    if (!carro.placa || !ValidationUtils.validatePlaca(carro.placa).valid) {
      return false;
    }
    
    // Validar campos obrigatórios
    if (!carro.modelo || !carro.ano || !carro.cor) {
      return false;
    }
    
    // Validar ano (deve ser numérico e razoável)
    const ano = parseInt(carro.ano);
    if (isNaN(ano) || ano < 1900 || ano > new Date().getFullYear() + 1) {
      return false;
    }
    
    return true;
  }

  private limparTexto(texto: string): string {
    return texto
      .trim()
      .replace(/\s+/g, ' ') // Múltiplos espaços para um
      .replace(/[^\w\s\-\.]/g, '') // Remover caracteres especiais
      .toUpperCase();
  }

  // ============================================================================
  // MÉTODOS AUXILIARES
  // ============================================================================

  private async fecharPopup(): Promise<void> {
    try {
      const botaoFechar = document.querySelector(this.seletores.closeButton) as HTMLButtonElement;
      
      if (botaoFechar) {
        botaoFechar.click();
        await this.sleep(500);
        this.log('✅ Popup fechado');
      } else {
        // Tentar fechar com ESC
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        this.log('✅ Popup fechado com ESC');
      }
    } catch (error) {
      this.log(`⚠️ Erro ao fechar popup: ${error}`);
    }
  }

  private async aguardarPaginaPronta(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout aguardando página carregar'));
      }, 15000);
      
      const verificar = () => {
        if (document.readyState === 'complete') {
          clearTimeout(timeout);
          this.log('✅ Página pronta');
          resolve();
        } else {
          setTimeout(verificar, 100);
        }
      };
      
      verificar();
    });
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [CAR_EXTRACTOR] ${message}`;
    this.logs.push(logMessage);
    console.log(logMessage);
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS PARA CONFIGURAÇÃO
  // ============================================================================

  atualizarSeletores(novosSeletores: Partial<SeletoresCarros>): void {
    this.seletores = { ...this.seletores, ...novosSeletores };
    this.log(`🔧 Seletores atualizados: ${Object.keys(novosSeletores).join(', ')}`);
  }

  testarSeletores(): { [key: string]: boolean } {
    const resultados: { [key: string]: boolean } = {};
    
    for (const [nome, seletor] of Object.entries(this.seletores)) {
      try {
        const elemento = document.querySelector(seletor);
        resultados[nome] = !!elemento;
      } catch (error) {
        resultados[nome] = false;
      }
    }
    
    return resultados;
  }
}

// ============================================================================
// INTEGRAÇÃO COM SISTEMA DE CASCATA
// ============================================================================

export class CarExtractorIntegration {
  private extractor: CarExtractor;

  constructor() {
    this.extractor = new CarExtractor();
  }

  // Método que será chamado pelo sistema de cascata
  async buscarCarrosPorModelo(
    modelo: string,
    cor: string,
    anoInicio: string,
    anoFim?: string
  ): Promise<CarroEncontrado[]> {
    
    const parametros: ParametrosConsulta = {
      modelo,
      cor,
      anoInicio,
      anoFim
    };

    const resultado = await this.extractor.extrairCarrosPorModelo(parametros);
    
    if (!resultado.success) {
      throw new Error(resultado.error || 'Erro desconhecido na extração');
    }
    
    return resultado.carros;
  }

  // Métodos para configuração
  configurarSeletores(seletores: Partial<SeletoresCarros>): void {
    this.extractor.atualizarSeletores(seletores);
  }

  testarConexao(): { [key: string]: boolean } {
    return this.extractor.testarSeletores();
  }
}

// ============================================================================
// INSTÂNCIA GLOBAL
// ============================================================================

export const carExtractorIntegration = new CarExtractorIntegration();
export default carExtractorIntegration;
