// ============================================================================
// INTERFACE DE LINHA DE COMANDO PARA O BOT
// ============================================================================

import readline from 'readline';
import { consultaCascataAssincrona, ParametrosConsulta } from '@bot-consulta/shared';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

export class CLIInterface {
  private rl: readline.Interface;
  private excelDirectory: string;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Diretório específico para arquivos Excel
    this.excelDirectory = path.join(process.cwd(), 'excel-input');
    this.ensureExcelDirectory();
  }

  private ensureExcelDirectory(): void {
    if (!fs.existsSync(this.excelDirectory)) {
      fs.mkdirSync(this.excelDirectory, { recursive: true });
      console.log(`📁 Diretório criado: ${this.excelDirectory}`);
      console.log(`💡 Coloque seus arquivos Excel neste diretório para processamento automático`);
    }
  }

  async start(): Promise<void> {
    console.clear();
    console.log('🚗 ============================================');
    console.log('🚗    BOT CONSULTA PLACAS - INTERFACE CMD    ');
    console.log('🚗 ============================================');
    console.log('');
    
    await this.showMainMenu();
  }

  private async showMainMenu(): Promise<void> {
    console.log('\n📋 MENU PRINCIPAL');
    console.log('==================');
    console.log('1 - Consultas');
    console.log('2 - Estatísticas');
    console.log('3 - Configurações');
    console.log('4 - Testar Extensão');
    console.log('5 - Logs');
    console.log('0 - Sair');
    console.log('');

    const choice = await this.prompt('Escolha uma opção: ');
    
    switch (choice) {
      case '1':
        await this.showConsultasMenu();
        break;
      case '2':
        await this.showEstatisticas();
        break;
      case '3':
        await this.showConfiguracoes();
        break;
      case '4':
        await this.testarExtensao();
        break;
      case '5':
        await this.showLogs();
        break;
      case '0':
        await this.exit();
        break;
      default:
        console.log('❌ Opção inválida!');
        await this.showMainMenu();
    }
  }

  private async showConsultasMenu(): Promise<void> {
    console.log('\n🔍 CONSULTAS');
    console.log('=============');
    console.log('1 - Consultar Carro');
    console.log('2 - Consultar Placa');
    console.log('3 - Consultar CPF');
    console.log('0 - Voltar');
    console.log('');

    const choice = await this.prompt('Escolha uma opção: ');
    
    switch (choice) {
      case '1':
        await this.showConsultarCarroMenu();
        break;
      case '2':
        await this.consultarPlaca();
        break;
      case '3':
        await this.consultarCpf();
        break;
      case '0':
        await this.showMainMenu();
        break;
      default:
        console.log('❌ Opção inválida!');
        await this.showConsultasMenu();
    }
  }

  private async showConsultarCarroMenu(): Promise<void> {
    console.log('\n🚗 CONSULTAR CARRO');
    console.log('===================');
    console.log('1 - Consulta Manual');
    console.log('2 - Consulta com Arquivo Excel');
    console.log('3 - Processar Arquivos na Pasta');
    console.log('0 - Voltar');
    console.log('');

    const choice = await this.prompt('Escolha uma opção: ');
    
    switch (choice) {
      case '1':
        await this.consultaManual();
        break;
      case '2':
        await this.consultaComArquivo();
        break;
      case '3':
        await this.processarArquivosPasta();
        break;
      case '0':
        await this.showConsultasMenu();
        break;
      default:
        console.log('❌ Opção inválida!');
        await this.showConsultarCarroMenu();
    }
  }

  private async consultaManual(): Promise<void> {
    console.log('\n✍️ CONSULTA MANUAL DE CARRO');
    console.log('=============================');
    
    try {
      const modelo = await this.prompt('Modelo do carro (ex: FOX): ');
      if (!modelo.trim()) {
        console.log('❌ Modelo é obrigatório!');
        return await this.consultaManual();
      }

      const cor = await this.prompt('Cor (ex: PRETA): ');
      if (!cor.trim()) {
        console.log('❌ Cor é obrigatória!');
        return await this.consultaManual();
      }

      const anoInicio = await this.prompt('Ano início (ex: 2015): ');
      if (!anoInicio.trim() || isNaN(Number(anoInicio))) {
        console.log('❌ Ano início deve ser um número válido!');
        return await this.consultaManual();
      }

      const anoFim = await this.prompt('Ano fim (opcional, Enter para pular): ');

      const parametros: ParametrosConsulta = {
        modelo: modelo.toUpperCase().trim(),
        cor: cor.toUpperCase().trim(),
        anoInicio: anoInicio.trim(),
        anoFim: anoFim.trim() || undefined
      };

      console.log('\n🚀 Iniciando consulta...');
      console.log(`📋 Parâmetros: ${parametros.modelo} ${parametros.cor} ${parametros.anoInicio}${parametros.anoFim ? `-${parametros.anoFim}` : ''}`);

      const consultaId = await consultaCascataAssincrona.adicionarConsultaCarros(parametros);
      
      console.log(`✅ Consulta adicionada com sucesso!`);
      console.log(`🆔 ID da consulta: ${consultaId}`);
      console.log(`⏰ A consulta será processada automaticamente pelo sistema de cascata`);

      await this.prompt('\nPressione Enter para continuar...');
      await this.showConsultarCarroMenu();

    } catch (error) {
      console.log(`❌ Erro na consulta: ${(error as Error).message}`);
      await this.prompt('Pressione Enter para tentar novamente...');
      await this.consultaManual();
    }
  }

  private async consultaComArquivo(): Promise<void> {
    console.log('\n📄 CONSULTA COM ARQUIVO EXCEL');
    console.log('===============================');
    console.log(`📁 Diretório de arquivos: ${this.excelDirectory}`);
    console.log('');

    // Listar arquivos Excel disponíveis
    const files = fs.readdirSync(this.excelDirectory)
      .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'));

    if (files.length === 0) {
      console.log('❌ Nenhum arquivo Excel encontrado no diretório!');
      console.log(`💡 Coloque arquivos .xlsx ou .xls em: ${this.excelDirectory}`);
      console.log('📋 Estrutura esperada: MODELO | COR | ANO_INICIO | ANO_FIM');
      await this.prompt('Pressione Enter para voltar...');
      return await this.showConsultarCarroMenu();
    }

    console.log('📋 Arquivos disponíveis:');
    files.forEach((file, index) => {
      console.log(`${index + 1} - ${file}`);
    });
    console.log('0 - Voltar');
    console.log('');

    const choice = await this.prompt('Escolha um arquivo: ');
    
    if (choice === '0') {
      return await this.showConsultarCarroMenu();
    }

    const fileIndex = parseInt(choice) - 1;
    if (fileIndex < 0 || fileIndex >= files.length) {
      console.log('❌ Opção inválida!');
      return await this.consultaComArquivo();
    }

    const fileName = files[fileIndex];
    const filePath = path.join(this.excelDirectory, fileName);

    await this.processarArquivoExcel(filePath);
  }

  private async processarArquivosPasta(): Promise<void> {
    console.log('\n📁 PROCESSAR TODOS OS ARQUIVOS DA PASTA');
    console.log('=========================================');
    console.log(`📂 Diretório: ${this.excelDirectory}`);

    const files = fs.readdirSync(this.excelDirectory)
      .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'));

    if (files.length === 0) {
      console.log('❌ Nenhum arquivo Excel encontrado!');
      await this.prompt('Pressione Enter para voltar...');
      return await this.showConsultarCarroMenu();
    }

    console.log(`📋 Encontrados ${files.length} arquivo(s) Excel`);
    const confirm = await this.prompt('Deseja processar todos? (s/N): ');

    if (confirm.toLowerCase() !== 's') {
      return await this.showConsultarCarroMenu();
    }

    for (let i = 0; i < files.length; i++) {
      const fileName = files[i];
      const filePath = path.join(this.excelDirectory, fileName);
      
      console.log(`\n📄 Processando arquivo ${i + 1}/${files.length}: ${fileName}`);
      await this.processarArquivoExcel(filePath, false);
    }

    console.log('\n🎉 Todos os arquivos foram processados!');
    await this.prompt('Pressione Enter para continuar...');
    await this.showConsultarCarroMenu();
  }

  private async processarArquivoExcel(filePath: string, interactive: boolean = true): Promise<void> {
    try {
      console.log(`📖 Lendo arquivo: ${path.basename(filePath)}`);

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const dados = jsonData.map((row: any) => ({
        modelo: (row.MODELO || row.modelo || '').toString().toUpperCase().trim(),
        cor: (row.COR || row.cor || '').toString().toUpperCase().trim(),
        anoInicio: (row.ANO_INICIO || row.ano_inicio || row.anoInicio || '').toString().trim(),
        anoFim: (row.ANO_FIM || row.ano_fim || row.anoFim || '').toString().trim() || undefined
      })).filter(item => item.modelo && item.cor && item.anoInicio);

      console.log(`📊 Dados válidos encontrados: ${dados.length}`);

      if (dados.length === 0) {
        console.log('❌ Nenhum dado válido encontrado no arquivo!');
        console.log('💡 Certifique-se que o arquivo tem as colunas: MODELO, COR, ANO_INICIO, ANO_FIM');
        if (interactive) {
          await this.prompt('Pressione Enter para continuar...');
        }
        return;
      }

      // Mostrar preview dos primeiros 5 registros
      console.log('\n📋 Preview dos dados:');
      console.log('MODELO'.padEnd(15) + 'COR'.padEnd(10) + 'ANO_INICIO'.padEnd(12) + 'ANO_FIM');
      console.log('='.repeat(50));
      
      dados.slice(0, 5).forEach(item => {
        console.log(
          item.modelo.padEnd(15) + 
          item.cor.padEnd(10) + 
          item.anoInicio.padEnd(12) + 
          (item.anoFim || '')
        );
      });

      if (dados.length > 5) {
        console.log(`... e mais ${dados.length - 5} registros`);
      }

      if (interactive) {
        const confirm = await this.prompt('\nDeseja processar estes dados? (s/N): ');
        if (confirm.toLowerCase() !== 's') {
          return;
        }
      }

      console.log('\n🚀 Iniciando processamento em lote...');
      
      const consultaIds = await consultaCascataAssincrona.adicionarConsultasEmLote(dados);
      
      console.log(`✅ Lote processado com sucesso!`);
      console.log(`📊 Total de consultas adicionadas: ${consultaIds.length}`);
      console.log(`🆔 IDs das consultas: ${consultaIds.slice(0, 3).join(', ')}${consultaIds.length > 3 ? '...' : ''}`);
      console.log(`⏰ As consultas serão processadas automaticamente pelo sistema de cascata`);

      if (interactive) {
        await this.prompt('\nPressione Enter para continuar...');
      }

    } catch (error) {
      console.log(`❌ Erro ao processar arquivo: ${(error as Error).message}`);
      if (interactive) {
        await this.prompt('Pressione Enter para continuar...');
      }
    }
  }

  private async showEstatisticas(): Promise<void> {
    console.log('\n📊 ESTATÍSTICAS DO SISTEMA');
    console.log('===========================');

    try {
      const stats = consultaCascataAssincrona.obterEstatisticas();
      const tempos = consultaCascataAssincrona.obterTemposEstimados();

      console.log('\n🚗 FILAS DE CARROS:');
      console.log(`   Pendentes: ${stats.filas.carros.pendentes}`);
      console.log(`   Processando: ${stats.filas.carros.processando}`);
      console.log(`   Concluídas: ${stats.filas.carros.concluidas}`);
      console.log(`   Erros: ${stats.filas.carros.erros}`);

      console.log('\n🔢 FILAS DE PLACAS:');
      console.log(`   Pendentes: ${stats.filas.placas.pendentes}`);
      console.log(`   Processando: ${stats.filas.placas.processando}`);
      console.log(`   Concluídas: ${stats.filas.placas.concluidas}`);
      console.log(`   Erros: ${stats.filas.placas.erros}`);

      console.log('\n👤 FILAS DE CPFS:');
      console.log(`   Pendentes: ${stats.filas.cpfs.pendentes}`);
      console.log(`   Processando: ${stats.filas.cpfs.processando}`);
      console.log(`   Concluídas: ${stats.filas.cpfs.concluidas}`);
      console.log(`   Erros: ${stats.filas.cpfs.erros}`);

      console.log('\n💾 CACHE:');
      console.log(`   Carros coletados: ${stats.cache.carrosColetados}`);
      console.log(`   Placas coletadas: ${stats.cache.placasColetadas}`);
      console.log(`   CPFs coletados: ${stats.cache.cpfsColetados}`);

      console.log('\n⏰ TEMPOS ESTIMADOS:');
      console.log(`   Carros: ${tempos.carros.tempoEstimadoFormatado}`);
      console.log(`   Placas: ${tempos.placas.tempoEstimadoFormatado}`);
      console.log(`   CPFs: ${tempos.cpfs.tempoEstimadoFormatado}`);

      console.log('\n🔄 STATUS DE PROCESSAMENTO:');
      console.log(`   Processando carros: ${stats.processamento.processandoCarros ? '✅' : '❌'}`);
      console.log(`   Processando placas: ${stats.processamento.processandoPlacas ? '✅' : '❌'}`);
      console.log(`   Processando CPFs: ${stats.processamento.processandoCpfs ? '✅' : '❌'}`);

      if (stats.delays) {
        console.log('\n⏱️ PRÓXIMAS CONSULTAS:');
        if (stats.delays.proximaConsultaCarro) {
          console.log(`   Próximo carro: ${new Date(stats.delays.proximaConsultaCarro).toLocaleTimeString()}`);
        }
        if (stats.delays.proximaConsultaPlaca) {
          console.log(`   Próxima placa: ${new Date(stats.delays.proximaConsultaPlaca).toLocaleTimeString()}`);
        }
        if (stats.delays.proximaConsultaCpf) {
          console.log(`   Próximo CPF: ${new Date(stats.delays.proximaConsultaCpf).toLocaleTimeString()}`);
        }
      }

    } catch (error) {
      console.log(`❌ Erro ao obter estatísticas: ${(error as Error).message}`);
    }

    await this.prompt('\nPressione Enter para voltar...');
    await this.showMainMenu();
  }

  private async consultarPlaca(): Promise<void> {
    console.log('\n🔢 CONSULTAR PLACA');
    console.log('===================');
    console.log('⚠️ Funcionalidade em desenvolvimento');
    console.log('💡 Esta funcionalidade permitirá consultar dados de uma placa específica');
    await this.prompt('Pressione Enter para voltar...');
    await this.showConsultasMenu();
  }

  private async consultarCpf(): Promise<void> {
    console.log('\n👤 CONSULTAR CPF');
    console.log('=================');
    console.log('⚠️ Funcionalidade em desenvolvimento');
    console.log('💡 Esta funcionalidade permitirá consultar dados de um CPF específico');
    await this.prompt('Pressione Enter para voltar...');
    await this.showConsultasMenu();
  }

  private async showConfiguracoes(): Promise<void> {
    console.log('\n⚙️ CONFIGURAÇÕES');
    console.log('=================');
    console.log('1 - Limpar filas concluídas');
    console.log('2 - Parar processamento');
    console.log('3 - Ver diretório Excel');
    console.log('4 - Verificar conexões');
    console.log('0 - Voltar');

    const choice = await this.prompt('Escolha uma opção: ');
    
    switch (choice) {
      case '1':
        consultaCascataAssincrona.limparFilasConcluidas();
        console.log('✅ Filas concluídas limpas!');
        break;
      case '2':
        consultaCascataAssincrona.pararProcessamento();
        console.log('⏹️ Processamento parado!');
        console.log('⚠️ Para reiniciar, será necessário reiniciar o bot');
        break;
      case '3':
        console.log(`📁 Diretório Excel: ${this.excelDirectory}`);
        console.log('💡 Coloque arquivos .xlsx ou .xls neste diretório');
        break;
      case '4':
        await this.verificarConexoes();
        break;
      case '0':
        return await this.showMainMenu();
      default:
        console.log('❌ Opção inválida!');
    }

    await this.prompt('Pressione Enter para continuar...');
    await this.showConfiguracoes();
  }

private async testarExtensao(): Promise<void> {
  console.log('\n🧪 TESTE DE EXTENSÃO');
  console.log('====================');
  
  try {
    console.log('🔍 Verificando se bot está rodando...');
    
    // Testar se o bot está respondendo
    const statusResponse = await fetch('http://localhost:3000/api/status');
    
    if (!statusResponse.ok) {
      throw new Error('Bot não está respondendo na porta 3000');
    }
    
    // CORREÇÃO: Declarar statusData corretamente
    const statusData = await statusResponse.json() as { 
      status: string; 
      connectedExtensions: number;
      timestamp: string;
      version: string;
      uptime: number;
      isRunning: boolean;
    };
    
    console.log('✅ Bot está rodando:', statusData.status);
    console.log(`📊 Extensões conectadas: ${statusData.connectedExtensions}`);
    console.log(`⏰ Uptime: ${Math.floor(statusData.uptime / 1000)}s`);
    console.log(`🔄 Status: ${statusData.isRunning ? 'Ativo' : 'Inativo'}`);
    
    // Testar endpoint de extensões
    const extensionsResponse = await fetch('http://localhost:3000/api/extensions');
    
    if (extensionsResponse.ok) {
      const extensions = await extensionsResponse.json() as Array<{
        id: string;
        status: string;
        lastHeartbeat?: string;
      }>;
      
      console.log(`🔌 Total de extensões: ${extensions.length}`);
      
      if (extensions.length > 0) {
        console.log('📋 Extensões conectadas:');
        extensions.forEach((ext, index) => {
          console.log(`   ${index + 1}. ID: ${ext.id} - Status: ${ext.status}`);
          if (ext.lastHeartbeat) {
            console.log(`      Último heartbeat: ${new Date(ext.lastHeartbeat).toLocaleTimeString()}`);
          }
        });
      } else {
        console.log('⚠️ Nenhuma extensão conectada');
        console.log('💡 Certifique-se que a extensão Chrome está instalada e conectada');
      }
    }
    
    // Testar comando de exemplo
    console.log('\n🧪 Testando comando de exemplo...');
    console.log('📤 Enviando comando de teste...');
    console.log('⚠️ Funcionalidade de comando direto em desenvolvimento');
    
  } catch (error) {
    console.log(`❌ Erro no teste: ${(error as Error).message}`);
    console.log('💡 Certifique-se que o bot está rodando com "npm start"');
  }
  
  await this.prompt('\nPressione Enter para voltar...');
  await this.showMainMenu();
}


private async verificarConexoes(): Promise<void> {
  try {
    console.log('\n🔍 Verificando conexões...');
    
    const response = await fetch('http://localhost:3000/api/extensions');
    
    if (response.ok) {
      const extensions = await response.json() as Array<{
        id: string;
        status: string;
        lastHeartbeat?: string;
        type?: string;
      }>;
      
      if (extensions.length === 0) {
        console.log('❌ Nenhuma extensão conectada');
        console.log('💡 Para conectar a extensão:');
        console.log('   1. Abra o Chrome');
        console.log('   2. Clique no ícone da extensão');
        console.log('   3. Clique em "Conectar ao Bot"');
      } else {
        console.log(`✅ ${extensions.length} extensão(ões) conectada(s)`);
        extensions.forEach((ext, index) => {
          console.log(`   ${index + 1}. ${ext.id} - ${ext.status}`);
          if (ext.type) {
            console.log(`      Tipo: ${ext.type}`);
          }
          if (ext.lastHeartbeat) {
            console.log(`      Último heartbeat: ${new Date(ext.lastHeartbeat).toLocaleTimeString()}`);
          }
        });
      }
    } else {
      console.log('❌ Erro ao verificar conexões');
    }
    
  } catch (error) {
    console.log(`❌ Erro: ${(error as Error).message}`);
  }
}


  private async showLogs(): Promise<void> {
    console.log('\n📝 LOGS DO SISTEMA');
    console.log('===================');
    console.log('⚠️ Visualização de logs em desenvolvimento');
    console.log('💡 Por enquanto, verifique os logs no console do bot');
    console.log('');
    console.log('📋 Logs disponíveis:');
    console.log('   - Logs do sistema de cascata aparecem no console');
    console.log('   - Logs da extensão aparecem no console do Chrome (F12)');
    console.log('   - Logs do bot aparecem neste terminal');
    
    await this.prompt('\nPressione Enter para voltar...');
    await this.showMainMenu();
  }

  private async prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  private async exit(): Promise<void> {
    console.log('\n👋 Encerrando interface...');
    console.log('⚠️ O bot continuará rodando em background');
    console.log('💡 Para parar completamente, use Ctrl+C');
    this.rl.close();
    process.exit(0);
  }
}

// Export default para compatibilidade
export default CLIInterface;
