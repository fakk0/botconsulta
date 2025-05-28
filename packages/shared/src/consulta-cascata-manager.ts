// ============================================================================
// SISTEMA ASSÍNCRONO INTELIGENTE DE CONSULTAS EM CASCATA - CORRIGIDO
// ============================================================================

import { database } from './database';

// ============================================================================
// INTERFACES PARA SISTEMA ASSÍNCRONO
// ============================================================================

export interface ParametrosConsulta {
  modelo: string;
  cor: string;
  anoInicio: string;
  anoFim?: string;
  prioridade?: 'baixa' | 'normal' | 'alta';
  batchId?: string; // Para agrupar consultas relacionadas
}

export interface CarroEncontrado {
  id: string;
  modelo: string;
  cor: string;
  ano: string;
  placa: string;
  chassi?: string;
  renavam?: string;
  fonte: 'elpump' | 'backup1' | 'backup2';
  dadosOriginais: any;
  consultaOrigemId: string; // ID da consulta que encontrou este carro
  criadoEm: string;
}

export interface DadosPlaca {
  placa: string;
  proprietario: {
    nome: string;
    cpf: string;
    rg?: string;
  };
  veiculo: {
    modelo: string;
    marca: string;
    cor: string;
    ano: string;
    situacao: string;
    categoria?: string;
  };
  endereco?: {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  fonte: string;
  consultadoEm: string;
  tempoResposta: number;
  carroOrigemId?: string; // ID do carro que originou esta consulta
}

export interface DadosCpf {
  cpf: string;
  nome: string;
  dataNascimento?: string;
  nomeMae?: string;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  telefones?: string[];
  emails?: string[];
  rendaEstimada?: string;
  escolaridade?: string;
  profissao?: string;
  fonte: string;
  consultadoEm: string;
  tempoResposta: number;
  placaOrigemId?: string; // ID da placa que originou esta consulta
}

// Interfaces para filas assíncronas
export interface FilaCarros {
  id: string;
  parametros: ParametrosConsulta;
  status: 'pendente' | 'processando' | 'concluida' | 'erro';
  tentativas: number;
  maxTentativas: number;
  proximaTentativa?: string;
  criadoEm: string;
  processadoEm?: string;
  erro?: string;
}

export interface FilaPlacas {
  id: string;
  placa: string;
  carroOrigemId: string;
  consultaOrigemId: string;
  status: 'pendente' | 'processando' | 'concluida' | 'erro';
  tentativas: number;
  maxTentativas: number;
  proximaTentativa?: string;
  criadoEm: string;
  processadoEm?: string;
  erro?: string;
}

export interface FilaCpfs {
  id: string;
  cpf: string;
  placaOrigemId: string;
  consultaOrigemId: string;
  status: 'pendente' | 'processando' | 'concluida' | 'erro';
  tentativas: number;
  maxTentativas: number;
  proximaTentativa?: string;
  criadoEm: string;
  processadoEm?: string;
  erro?: string;
}

export interface ControladorDelay {
  ultimaConsultaCarro?: string;
  proximaConsultaCarro?: string;
  ultimaConsultaPlaca?: string;
  proximaConsultaPlaca?: string;
  ultimaConsultaCpf?: string;
  proximaConsultaCpf?: string;
  delayCarros: number;
  delayPlacas: number;
  delayCpfs: number;
}

export interface RelacionamentoCompleto {
  id: string;
  consultaOrigemId: string;
  carro: CarroEncontrado;
  dadosPlaca: DadosPlaca;
  dadosCpf: DadosCpf;
  relacionamento: {
    modelo: string;
    placa: string;
    cpf: string;
    nomeProprietario: string;
    enderecoCompleto: string;
  };
  criadoEm: string;
}

// ============================================================================
// GERENCIADOR ASSÍNCRONO INTELIGENTE - CORRIGIDO
// ============================================================================

export class ConsultaCascataAssincrona {
  // Filas separadas para cada tipo de consulta
  private filaCarros: Map<string, FilaCarros> = new Map();
  private filaPlacas: Map<string, FilaPlacas> = new Map();
  private filaCpfs: Map<string, FilaCpfs> = new Map();
  
  // Dados coletados (cache inteligente)
  private carrosColetados: Map<string, CarroEncontrado> = new Map();
  private placasColetadas: Map<string, DadosPlaca> = new Map();
  private cpfsColetados: Map<string, DadosCpf> = new Map();
  
  // Controle de processamento assíncrono
  private processandoCarros: boolean = false;
  private processandoPlacas: boolean = false;
  private processandoCpfs: boolean = false;
  
  // Controle de delays - TODOS com 30 segundos
  private controladorDelay: ControladorDelay = {
    delayCarros: 30000,   // 30 segundos entre consultas de carros
    delayPlacas: 30000,   // 30 segundos entre consultas de placas
    delayCpfs: 30000      // 30 segundos entre consultas de CPFs
  };
  
  // Configurações de concorrência - CORRIGIDO
  private readonly MAX_CONCURRENT_CARROS = 1;  // APENAS 1 consulta de carro por vez
  private readonly MAX_CONCURRENT_PLACAS = 1;  // APENAS 1 consulta de placa por vez
  private readonly MAX_CONCURRENT_CPFS = 1;    // APENAS 1 consulta de CPF por vez
  private readonly MAX_TENTATIVAS = 3;
  
  // Intervalos de processamento
  private intervalos: {
    carros?: ReturnType<typeof setInterval>;
    placas?: ReturnType<typeof setInterval>;
    cpfs?: ReturnType<typeof setInterval>;
  } = {};

  constructor() {
    this.iniciarProcessamentoContinuo();
    this.log('🚀 Sistema Assíncrono Inteligente iniciado');
    this.log('⚠️ Configuração: 1 consulta por vez com delay de 30s para cada tipo');
  }

  // ============================================================================
  // INICIALIZAÇÃO E CONTROLE PRINCIPAL
  // ============================================================================

  private iniciarProcessamentoContinuo(): void {
    // Processamento contínuo de cada fila - intervalos maiores para respeitar delays
    this.intervalos.carros = setInterval(() => {
      this.processarFilaCarros();
    }, 5000); // Verificar a cada 5 segundos

    this.intervalos.placas = setInterval(() => {
      this.processarFilaPlacas();
    }, 5000); // Verificar a cada 5 segundos

    this.intervalos.cpfs = setInterval(() => {
      this.processarFilaCpfs();
    }, 5000); // Verificar a cada 5 segundos

    this.log('⚡ Processamento contínuo das filas iniciado');
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS PARA ADICIONAR CONSULTAS
  // ============================================================================

  async adicionarConsultaCarros(parametros: ParametrosConsulta): Promise<string> {
    const consultaId = `carro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const filaItem: FilaCarros = {
      id: consultaId,
      parametros,
      status: 'pendente',
      tentativas: 0,
      maxTentativas: this.MAX_TENTATIVAS,
      criadoEm: new Date().toISOString()
    };
    
    this.filaCarros.set(consultaId, filaItem);
    
    this.log(`📋 Consulta de carros adicionada: ${parametros.modelo} ${parametros.cor} (${consultaId})`);
    
    return consultaId;
  }

  async adicionarConsultasEmLote(listaParametros: ParametrosConsulta[]): Promise<string[]> {
    const batchId = `batch_${Date.now()}`;
    const consultaIds: string[] = [];
    
    for (const parametros of listaParametros) {
      parametros.batchId = batchId;
      const consultaId = await this.adicionarConsultaCarros(parametros);
      consultaIds.push(consultaId);
    }
    
    this.log(`📦 Lote de consultas adicionado: ${listaParametros.length} consultas (${batchId})`);
    this.log(`⏰ Tempo estimado total: ${(listaParametros.length * 30)} segundos`);
    
    return consultaIds;
  }

  // ============================================================================
  // PROCESSAMENTO SEQUENCIAL DE CARROS - CORRIGIDO
  // ============================================================================

  private async processarFilaCarros(): Promise<void> {
    if (this.processandoCarros) return;
    
    // Buscar APENAS 1 item por vez (não 3)
    const itemDisponivel = Array.from(this.filaCarros.values())
      .filter(item => item.status === 'pendente' || this.podeRetentar(item))
      .sort((a, b) => this.ordenarPorPrioridade(a.parametros, b.parametros))[0];

    if (!itemDisponivel) return;

    // Verificar se pode processar (delay de 30s)
    if (!this.podeConsultarCarro()) {
      const tempoRestante = this.getTempoRestanteCarro();
      this.log(`⏳ Aguardando delay de carros: ${Math.ceil(tempoRestante/1000)}s restantes`);
      return;
    }

    this.processandoCarros = true;

    try {
      await this.processarConsultaCarro(itemDisponivel);
    } catch (error) {
      this.log(`❌ Erro no processamento da fila de carros: ${error}`);
    } finally {
      this.processandoCarros = false;
    }
  }

  private async processarConsultaCarro(item: FilaCarros): Promise<void> {
    item.status = 'processando';
    item.tentativas++;
    
    // MARCAR TIMESTAMP NO INÍCIO DA CONSULTA
    const timestampInicioConsulta = new Date().toISOString();
    this.controladorDelay.ultimaConsultaCarro = timestampInicioConsulta;
    this.controladorDelay.proximaConsultaCarro = new Date(Date.now() + this.controladorDelay.delayCarros).toISOString();
    
    this.log(`🔍 Processando consulta de carro: ${item.parametros.modelo} ${item.parametros.cor} (tentativa ${item.tentativas})`);
    this.log(`⏰ Próxima consulta de carro liberada em: ${this.controladorDelay.proximaConsultaCarro}`);

    try {
      const startTime = Date.now();
      
      // Executar busca de carros - PODE RETORNAR MÚLTIPLOS CARROS
      const carros = await this.buscarCarrosPorModelo(
        item.parametros.modelo,
        item.parametros.cor,
        item.parametros.anoInicio,
        item.parametros.anoFim
      );
      
      const tempoExecucao = Date.now() - startTime;
      
      // Salvar TODOS os carros encontrados no cache
      for (const carro of carros) {
        carro.consultaOrigemId = item.id;
        this.carrosColetados.set(carro.id, carro);
        
        // Adicionar TODAS as placas à fila automaticamente
        await this.adicionarPlacaNaFila(carro.placa, carro.id, item.id);
      }
      
      // Salvar no banco de dados
      await this.salvarCarrosNoBanco(carros, item.id);
      
      item.status = 'concluida';
      item.processadoEm = new Date().toISOString();
      
      this.log(`✅ Consulta de carro concluída: ${carros.length} carros encontrados em ${tempoExecucao}ms`);
      this.log(`📋 ${carros.length} placas adicionadas à fila para consulta posterior`);
      this.log(`⏰ Próxima consulta de carro em 30 segundos`);
      
    } catch (error) {
      item.status = 'erro';
      item.erro = (error as Error).message;
      
      this.log(`❌ Erro na consulta de carro: ${error}`);
      
      if (item.tentativas < item.maxTentativas) {
        item.status = 'pendente';
        item.proximaTentativa = new Date(Date.now() + (60000 * item.tentativas)).toISOString();
      }
    }
  }

  // ============================================================================
  // PROCESSAMENTO SEQUENCIAL DE PLACAS
  // ============================================================================

  private async processarFilaPlacas(): Promise<void> {
    if (this.processandoPlacas) return;
    
    // Buscar APENAS 1 item por vez
    const itemDisponivel = Array.from(this.filaPlacas.values())
      .filter(item => item.status === 'pendente' || this.podeRetentar(item))
      .sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime())[0];

    if (!itemDisponivel) return;

    // Verificar se pode processar (delay de 30s)
    if (!this.podeConsultarPlaca()) {
      const tempoRestante = this.getTempoRestantePlaca();
      this.log(`⏳ Aguardando delay de placas: ${Math.ceil(tempoRestante/1000)}s restantes`);
      return;
    }

    this.processandoPlacas = true;

    try {
      await this.processarConsultaPlaca(itemDisponivel);
    } catch (error) {
      this.log(`❌ Erro no processamento da fila de placas: ${error}`);
    } finally {
      this.processandoPlacas = false;
    }
  }

  private async processarConsultaPlaca(item: FilaPlacas): Promise<void> {
    // Verificar se placa já foi consultada (cache inteligente)
    if (this.placasColetadas.has(item.placa)) {
      this.log(`💾 Placa ${item.placa} já consultada (cache)`);
      item.status = 'concluida';
      item.processadoEm = new Date().toISOString();
      return;
    }

    item.status = 'processando';
    item.tentativas++;
    
    // MARCAR TIMESTAMP NO INÍCIO DA CONSULTA
    this.controladorDelay.ultimaConsultaPlaca = new Date().toISOString();
    this.controladorDelay.proximaConsultaPlaca = new Date(Date.now() + this.controladorDelay.delayPlacas).toISOString();
    
    this.log(`🚗 Processando consulta de placa: ${item.placa} (tentativa ${item.tentativas})`);
    this.log(`⏰ Próxima consulta de placa liberada em: ${this.controladorDelay.proximaConsultaPlaca}`);

    try {
      const startTime = Date.now();
      
      // Executar consulta de placa
      const dadosPlaca = await this.consultarPlaca(item.placa);
      dadosPlaca.carroOrigemId = item.carroOrigemId;
      
      const tempoExecucao = Date.now() - startTime;
      
      // Salvar no cache
      this.placasColetadas.set(item.placa, dadosPlaca);
      
      // Adicionar CPF à fila automaticamente
      if (dadosPlaca.proprietario.cpf) {
        await this.adicionarCpfNaFila(dadosPlaca.proprietario.cpf, item.placa, item.consultaOrigemId);
      }
      
      // Salvar no banco de dados
      await this.salvarPlacaNoBanco(dadosPlaca, item.consultaOrigemId);
      
      item.status = 'concluida';
      item.processadoEm = new Date().toISOString();
      
      this.log(`✅ Consulta de placa concluída: ${item.placa} - CPF: ${dadosPlaca.proprietario.cpf} em ${tempoExecucao}ms`);
      this.log(`⏰ Próxima consulta de placa em 30 segundos`);
      
    } catch (error) {
      item.status = 'erro';
      item.erro = (error as Error).message;
      
      this.log(`❌ Erro na consulta de placa ${item.placa}: ${error}`);
      
      if (item.tentativas < item.maxTentativas) {
        item.status = 'pendente';
        item.proximaTentativa = new Date(Date.now() + (60000 * item.tentativas)).toISOString();
      }
    }
  }

  // ============================================================================
  // PROCESSAMENTO SEQUENCIAL DE CPFS
  // ============================================================================

  private async processarFilaCpfs(): Promise<void> {
    if (this.processandoCpfs) return;
    
    // Buscar APENAS 1 item por vez
    const itemDisponivel = Array.from(this.filaCpfs.values())
      .filter(item => item.status === 'pendente' || this.podeRetentar(item))
      .sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime())[0];

    if (!itemDisponivel) return;

    // Verificar se pode processar (delay de 30s)
    if (!this.podeConsultarCpf()) {
      const tempoRestante = this.getTempoRestanteCpf();
      this.log(`⏳ Aguardando delay de CPFs: ${Math.ceil(tempoRestante/1000)}s restantes`);
      return;
    }

    this.processandoCpfs = true;

    try {
      await this.processarConsultaCpf(itemDisponivel);
    } catch (error) {
      this.log(`❌ Erro no processamento da fila de CPFs: ${error}`);
    } finally {
      this.processandoCpfs = false;
    }
  }

  private async processarConsultaCpf(item: FilaCpfs): Promise<void> {
    // Verificar se CPF já foi consultado (cache inteligente)
    if (this.cpfsColetados.has(item.cpf)) {
      this.log(`💾 CPF ${item.cpf} já consultado (cache)`);
      item.status = 'concluida';
      item.processadoEm = new Date().toISOString();
      return;
    }

    item.status = 'processando';
    item.tentativas++;
    
    // MARCAR TIMESTAMP NO INÍCIO DA CONSULTA
    this.controladorDelay.ultimaConsultaCpf = new Date().toISOString();
    this.controladorDelay.proximaConsultaCpf = new Date(Date.now() + this.controladorDelay.delayCpfs).toISOString();
    
    this.log(`👤 Processando consulta de CPF: ${item.cpf} (tentativa ${item.tentativas})`);
    this.log(`⏰ Próxima consulta de CPF liberada em: ${this.controladorDelay.proximaConsultaCpf}`);

    try {
      const startTime = Date.now();
      
      // Executar consulta de CPF
      const dadosCpf = await this.consultarCpf(item.cpf);
      dadosCpf.placaOrigemId = item.placaOrigemId;
      
      const tempoExecucao = Date.now() - startTime;
      
      // Salvar no cache
      this.cpfsColetados.set(item.cpf, dadosCpf);
      
      // Salvar no banco de dados
      await this.salvarCpfNoBanco(dadosCpf, item.consultaOrigemId);
      
      // Criar relacionamento completo
      await this.criarRelacionamentoCompleto(item.cpf, item.placaOrigemId, item.consultaOrigemId);
      
      item.status = 'concluida';
      item.processadoEm = new Date().toISOString();
      
      this.log(`✅ Consulta de CPF concluída: ${item.cpf} - ${dadosCpf.nome} em ${tempoExecucao}ms`);
      this.log(`⏰ Próxima consulta de CPF em 30 segundos`);
      
    } catch (error) {
      item.status = 'erro';
      item.erro = (error as Error).message;
      
      this.log(`❌ Erro na consulta de CPF ${item.cpf}: ${error}`);
      
      if (item.tentativas < item.maxTentativas) {
        item.status = 'pendente';
        item.proximaTentativa = new Date(Date.now() + (60000 * item.tentativas)).toISOString();
      }
    }
  }

  // ============================================================================
  // MÉTODOS PARA ADICIONAR ITENS NAS FILAS AUTOMATICAMENTE
  // ============================================================================

  private async adicionarPlacaNaFila(placa: string, carroOrigemId: string, consultaOrigemId: string): Promise<void> {
    // Verificar se placa já está na fila ou já foi processada
    const jaExiste = Array.from(this.filaPlacas.values()).some(item => item.placa === placa);
    const jaProcessada = this.placasColetadas.has(placa);
    
    if (jaExiste || jaProcessada) {
      this.log(`⏭️ Placa ${placa} já está na fila ou foi processada`);
      return;
    }

    const filaId = `placa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const filaItem: FilaPlacas = {
      id: filaId,
      placa,
      carroOrigemId,
      consultaOrigemId,
      status: 'pendente',
      tentativas: 0,
      maxTentativas: this.MAX_TENTATIVAS,
      criadoEm: new Date().toISOString()
    };
    
    this.filaPlacas.set(filaId, filaItem);
    
    this.log(`📋 Placa ${placa} adicionada à fila automaticamente`);
  }

  private async adicionarCpfNaFila(cpf: string, placaOrigemId: string, consultaOrigemId: string): Promise<void> {
    // Verificar se CPF já está na fila ou já foi processado
    const jaExiste = Array.from(this.filaCpfs.values()).some(item => item.cpf === cpf);
    const jaProcessado = this.cpfsColetados.has(cpf);
    
    if (jaExiste || jaProcessado) {
      this.log(`⏭️ CPF ${cpf} já está na fila ou foi processado`);
      return;
    }

    const filaId = `cpf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const filaItem: FilaCpfs = {
      id: filaId,
      cpf,
      placaOrigemId,
      consultaOrigemId,
      status: 'pendente',
      tentativas: 0,
      maxTentativas: this.MAX_TENTATIVAS,
      criadoEm: new Date().toISOString()
    };
    
    this.filaCpfs.set(filaId, filaItem);
    
    this.log(`📋 CPF ${cpf} adicionado à fila automaticamente`);
  }

  // ============================================================================
  // CONTROLE DE DELAYS E VALIDAÇÕES - CORRIGIDO
  // ============================================================================

  private podeConsultarCarro(): boolean {
    if (!this.controladorDelay.ultimaConsultaCarro) return true;
    
    const tempoDecorrido = Date.now() - new Date(this.controladorDelay.ultimaConsultaCarro).getTime();
    return tempoDecorrido >= this.controladorDelay.delayCarros;
  }

  private podeConsultarPlaca(): boolean {
    if (!this.controladorDelay.ultimaConsultaPlaca) return true;
    
    const tempoDecorrido = Date.now() - new Date(this.controladorDelay.ultimaConsultaPlaca).getTime();
    return tempoDecorrido >= this.controladorDelay.delayPlacas;
  }

  private podeConsultarCpf(): boolean {
    if (!this.controladorDelay.ultimaConsultaCpf) return true;
    
    const tempoDecorrido = Date.now() - new Date(this.controladorDelay.ultimaConsultaCpf).getTime();
    return tempoDecorrido >= this.controladorDelay.delayCpfs;
  }

  private getTempoRestanteCarro(): number {
    if (!this.controladorDelay.ultimaConsultaCarro) return 0;
    
    const tempoDecorrido = Date.now() - new Date(this.controladorDelay.ultimaConsultaCarro).getTime();
    return Math.max(0, this.controladorDelay.delayCarros - tempoDecorrido);
  }

  private getTempoRestantePlaca(): number {
    if (!this.controladorDelay.ultimaConsultaPlaca) return 0;
    
    const tempoDecorrido = Date.now() - new Date(this.controladorDelay.ultimaConsultaPlaca).getTime();
    return Math.max(0, this.controladorDelay.delayPlacas - tempoDecorrido);
  }

  private getTempoRestanteCpf(): number {
    if (!this.controladorDelay.ultimaConsultaCpf) return 0;
    
    const tempoDecorrido = Date.now() - new Date(this.controladorDelay.ultimaConsultaCpf).getTime();
    return Math.max(0, this.controladorDelay.delayCpfs - tempoDecorrido);
  }

  private podeRetentar(item: any): boolean {
    if (item.status !== 'erro' && item.status !== 'pendente') return false;
    if (item.tentativas >= item.maxTentativas) return false;
    if (!item.proximaTentativa) return true;
    
    return new Date(item.proximaTentativa).getTime() <= Date.now();
  }

  private ordenarPorPrioridade(a: ParametrosConsulta, b: ParametrosConsulta): number {
    const prioridadeValor = { 'alta': 3, 'normal': 2, 'baixa': 1 };
    return (prioridadeValor[b.prioridade || 'normal'] || 2) - (prioridadeValor[a.prioridade || 'normal'] || 2);
  }

  // ============================================================================
  // MÉTODOS DE CONSULTA (IMPLEMENTAR COM SITES REAIS)
  // ============================================================================

private async buscarCarrosPorModelo(
  modelo: string, 
  cor: string, 
  anoInicio: string, 
  anoFim?: string
): Promise<CarroEncontrado[]> {
  
  this.log(`🌐 ENVIANDO COMANDO REAL PARA EXTENSÃO: ${modelo} ${cor}`);
  
  try {
    // IMPLEMENTAR: Comunicação real com extensão via bot
    const comando = {
      id: `extract_${Date.now()}`,
      type: 'EXTRAIR_CARROS',
      payload: { modelo, cor, anoInicio, anoFim },
      timestamp: new Date().toISOString()
    };
    
    // Enviar comando para bot, que enviará para extensão
    const response = await this.enviarComandoParaBot(comando);
    
    if (response && response.success && response.carros) {
      this.log(`✅ DADOS REAIS recebidos da extensão: ${response.carros.length} carros`);
      return response.carros;
    } else {
      throw new Error('Extensão não retornou dados válidos');
    }
    
  } catch (error) {
    this.log(`❌ ERRO na extração real: ${error}`);
    this.log(`⚠️ PARANDO processamento - não usar dados fictícios`);
    throw new Error(`Falha na extração real: ${(error as Error).message}`);
  }
}

// Adicionar método para comunicar com bot
private async enviarComandoParaBot(comando: any): Promise<any> {
  try {
    const response = await fetch('http://localhost:3000/api/extension/execute-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comando)
    });
    
    if (!response.ok) {
      throw new Error(`Bot não respondeu: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Erro na comunicação com bot: ${(error as Error).message}`);
  }
}


  private async consultarPlaca(placa: string): Promise<DadosPlaca> {
    // TODO: Implementar consulta real de placa
    await this.sleep(1500 + Math.random() * 500);
    
    return {
      placa: placa,
      proprietario: {
        nome: `Proprietário ${placa}`,
        cpf: this.gerarCpfAleatorio(),
        rg: '12.345.678-9'
      },
      veiculo: {
        modelo: 'Honda Civic',
        marca: 'Honda',
        cor: 'Prata',
        ano: '2020',
        situacao: 'Regular',
        categoria: 'Particular'
      },
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '123',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
        cep: '01234-567'
      },
      fonte: 'elpump',
      consultadoEm: new Date().toISOString(),
      tempoResposta: 1500
    };
  }

  private async consultarCpf(cpf: string): Promise<DadosCpf> {
    // TODO: Implementar consulta real de CPF
    await this.sleep(2000 + Math.random() * 1000);
    
    return {
      cpf: cpf,
      nome: `Nome para ${cpf}`,
      dataNascimento: '1985-03-15',
      nomeMae: 'Maria Silva Santos',
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '123',
        complemento: 'Apto 45',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
        cep: '01234-567'
      },
      telefones: ['(11) 99999-9999'],
      emails: ['email@exemplo.com'],
      rendaEstimada: 'R$ 5.000 - R$ 10.000',
      escolaridade: 'Superior Completo',
      profissao: 'Engenheiro',
      fonte: 'elpump',
      consultadoEm: new Date().toISOString(),
      tempoResposta: 2000
    };
  }

  // ============================================================================
  // MÉTODOS PARA SALVAR NO BANCO DE DADOS
  // ============================================================================

  private async salvarCarrosNoBanco(carros: CarroEncontrado[], consultaId: string): Promise<void> {
    try {
      for (const carro of carros) {
        await database.consultas.create({
          placa: `CARRO_${carro.placa}`,
          success: true,
          data: carro,
          executionTime: 0,
          sessionId: consultaId
        } as any);
      }
    } catch (error) {
      this.log(`⚠️ Erro ao salvar carros no banco: ${error}`);
    }
  }

  private async salvarPlacaNoBanco(dadosPlaca: DadosPlaca, consultaId: string): Promise<void> {
    try {
      await database.consultas.create({
        placa: dadosPlaca.placa,
        success: true,
        data: dadosPlaca,
        executionTime: dadosPlaca.tempoResposta,
        sessionId: consultaId
      } as any);
    } catch (error) {
      this.log(`⚠️ Erro ao salvar placa no banco: ${error}`);
    }
  }

  private async salvarCpfNoBanco(dadosCpf: DadosCpf, consultaId: string): Promise<void> {
    try {
      await database.consultas.create({
        placa: `CPF_${dadosCpf.cpf}`,
        success: true,
        data: dadosCpf,
        executionTime: dadosCpf.tempoResposta,
        sessionId: consultaId
      } as any);
    } catch (error) {
      this.log(`⚠️ Erro ao salvar CPF no banco: ${error}`);
    }
  }

  private async criarRelacionamentoCompleto(cpf: string, placaOrigemId: string, consultaOrigemId: string): Promise<void> {
    try {
      const dadosCpf = this.cpfsColetados.get(cpf);
      const dadosPlaca = this.placasColetadas.get(placaOrigemId);
      const carro = Array.from(this.carrosColetados.values()).find(c => c.placa === placaOrigemId);
      
      if (dadosCpf && dadosPlaca && carro) {
        const relacionamento: RelacionamentoCompleto = {
          id: `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          consultaOrigemId,
          carro,
          dadosPlaca,
          dadosCpf,
          relacionamento: {
            modelo: carro.modelo,
            placa: carro.placa,
            cpf: dadosCpf.cpf,
            nomeProprietario: dadosCpf.nome,
            enderecoCompleto: this.formatarEnderecoCompleto(dadosCpf.endereco)
          },
          criadoEm: new Date().toISOString()
        };
        
        await database.consultas.create({
          placa: `REL_${carro.placa}_${dadosCpf.cpf}`,
          success: true,
          data: relacionamento,
          executionTime: 0,
          sessionId: consultaOrigemId
        } as any);
        
        this.log(`🔗 Relacionamento completo criado: ${carro.placa} → ${dadosCpf.nome}`);
      }
    } catch (error) {
      this.log(`⚠️ Erro ao criar relacionamento: ${error}`);
    }
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS PARA MONITORAMENTO
  // ============================================================================

  obterEstatisticas(): any {
    const estatisticas = {
      filas: {
        carros: {
          total: this.filaCarros.size,
          pendentes: Array.from(this.filaCarros.values()).filter(i => i.status === 'pendente').length,
          processando: Array.from(this.filaCarros.values()).filter(i => i.status === 'processando').length,
          concluidas: Array.from(this.filaCarros.values()).filter(i => i.status === 'concluida').length,
          erros: Array.from(this.filaCarros.values()).filter(i => i.status === 'erro').length
        },
        placas: {
          total: this.filaPlacas.size,
          pendentes: Array.from(this.filaPlacas.values()).filter(i => i.status === 'pendente').length,
          processando: Array.from(this.filaPlacas.values()).filter(i => i.status === 'processando').length,
          concluidas: Array.from(this.filaPlacas.values()).filter(i => i.status === 'concluida').length,
          erros: Array.from(this.filaPlacas.values()).filter(i => i.status === 'erro').length
        },
        cpfs: {
          total: this.filaCpfs.size,
          pendentes: Array.from(this.filaCpfs.values()).filter(i => i.status === 'pendente').length,
          processando: Array.from(this.filaCpfs.values()).filter(i => i.status === 'processando').length,
          concluidas: Array.from(this.filaCpfs.values()).filter(i => i.status === 'concluida').length,
          erros: Array.from(this.filaCpfs.values()).filter(i => i.status === 'erro').length
        }
      },
      cache: {
        carrosColetados: this.carrosColetados.size,
        placasColetadas: this.placasColetadas.size,
        cpfsColetados: this.cpfsColetados.size
      },
      processamento: {
        processandoCarros: this.processandoCarros,
        processandoPlacas: this.processandoPlacas,
        processandoCpfs: this.processandoCpfs
      },
      delays: {
        proximaConsultaCarro: this.controladorDelay.proximaConsultaCarro,
        proximaConsultaPlaca: this.controladorDelay.proximaConsultaPlaca,
        proximaConsultaCpf: this.controladorDelay.proximaConsultaCpf,
        tempoRestanteCarro: this.getTempoRestanteCarro(),
        tempoRestantePlaca: this.getTempoRestantePlaca(),
        tempoRestanteCpf: this.getTempoRestanteCpf()
      }
    };
    
    return estatisticas;
  }

  obterTemposEstimados(): any {
    const carrosPendentes = Array.from(this.filaCarros.values()).filter(i => i.status === 'pendente').length;
    const placasPendentes = Array.from(this.filaPlacas.values()).filter(i => i.status === 'pendente').length;
    const cpfsPendentes = Array.from(this.filaCpfs.values()).filter(i => i.status === 'pendente').length;
    
    return {
      carros: {
        pendentes: carrosPendentes,
        tempoEstimado: carrosPendentes * 30, // segundos
        tempoEstimadoFormatado: this.formatarTempo(carrosPendentes * 30)
      },
      placas: {
        pendentes: placasPendentes,
        tempoEstimado: placasPendentes * 30, // segundos
        tempoEstimadoFormatado: this.formatarTempo(placasPendentes * 30)
      },
      cpfs: {
        pendentes: cpfsPendentes,
        tempoEstimado: cpfsPendentes * 30, // segundos
        tempoEstimadoFormatado: this.formatarTempo(cpfsPendentes * 30)
      }
    };
  }

  limparFilasConcluidas(): void {
    // Limpar itens concluídos das filas para liberar memória
    Array.from(this.filaCarros.entries()).forEach(([id, item]) => {
      if (item.status === 'concluida') {
        this.filaCarros.delete(id);
      }
    });
    
    Array.from(this.filaPlacas.entries()).forEach(([id, item]) => {
      if (item.status === 'concluida') {
        this.filaPlacas.delete(id);
      }
    });
    
    Array.from(this.filaCpfs.entries()).forEach(([id, item]) => {
      if (item.status === 'concluida') {
        this.filaCpfs.delete(id);
      }
    });
    
    this.log('🧹 Filas concluídas limpas');
  }

  pararProcessamento(): void {
    Object.values(this.intervalos).forEach(intervalo => {
      if (intervalo) clearInterval(intervalo);
    });
    
    this.log('⏹️ Processamento parado');
  }

  // ============================================================================
  // MÉTODOS UTILITÁRIOS
  // ============================================================================

  private formatarTempo(segundos: number): string {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    
    if (horas > 0) {
      return `${horas}h ${minutos}m ${segs}s`;
    } else if (minutos > 0) {
      return `${minutos}m ${segs}s`;
    } else {
      return `${segs}s`;
    }
  }

  private gerarPlacaAleatoria(): string {
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numeros = '0123456789';
    
    return `${letras.charAt(Math.floor(Math.random() * letras.length))}${letras.charAt(Math.floor(Math.random() * letras.length))}${letras.charAt(Math.floor(Math.random() * letras.length))}${numeros.charAt(Math.floor(Math.random() * numeros.length))}${numeros.charAt(Math.floor(Math.random() * numeros.length))}${numeros.charAt(Math.floor(Math.random() * numeros.length))}${numeros.charAt(Math.floor(Math.random() * numeros.length))}`;
  }

  private gerarCpfAleatorio(): string {
    const numeros = Array.from({length: 11}, () => Math.floor(Math.random() * 10));
    return `${numeros.slice(0,3).join('')}.${numeros.slice(3,6).join('')}.${numeros.slice(6,9).join('')}-${numeros.slice(9,11).join('')}`;
  }

  private formatarEnderecoCompleto(endereco?: any): string {
    if (!endereco) return 'Endereço não informado';
    
    return `${endereco.logradouro}, ${endereco.numero}${endereco.complemento ? ` - ${endereco.complemento}` : ''}, ${endereco.bairro}, ${endereco.cidade}/${endereco.uf} - CEP: ${endereco.cep}`;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [CASCATA_ASYNC] ${message}`);
  }
}

// ============================================================================
// INSTÂNCIA GLOBAL
// ============================================================================

export const consultaCascataAssincrona = new ConsultaCascataAssincrona();
export default consultaCascataAssincrona;
