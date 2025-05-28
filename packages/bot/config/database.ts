// Configuração do banco de dados - será implementado
export const databaseConfig = {
  development: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/bot_consulta_dev'
  },
  production: {
    url: process.env.DATABASE_URL
  }
};