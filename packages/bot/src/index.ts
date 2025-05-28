import dotenv from 'dotenv';
import { BotApplication } from './app';
import { CLIInterface } from './cli-interface';

// Carregar variáveis de ambiente
dotenv.config();

// Configurar tratamento de erros globais
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
  process.exit(1);
});

// Função principal
async function bootstrap(): Promise<void> {
  try {
    console.log('🚀 Iniciando Bot Consulta Placas...');
    console.log('='.repeat(50));
    
    // Iniciar servidor bot
    const app = new BotApplication();
    await app.start();
    
    console.log('✅ Bot iniciado com sucesso!');
    console.log('🔗 Servidor: http://localhost:3000');
    console.log('📡 Aguardando conexões de extensões...');
    console.log('');
    
    // Aguardar um pouco para o servidor estabilizar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Iniciar interface CLI
    const cli = new CLIInterface();
    await cli.start();
    
    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n📴 Recebido ${signal}, encerrando bot...`);
      await app.stop();
      process.exit(0);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Erro ao iniciar bot:', error);
    process.exit(1);
  }
}

// Inicializar bot
bootstrap();
