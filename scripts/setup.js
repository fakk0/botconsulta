// Script de setup do projeto
const { execSync } = require('child_process');

console.log('🚀 Configurando projeto...');

try {
  console.log('📦 Instalando dependências...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('🔨 Compilando pacotes...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('✅ Setup concluído!');
} catch (error) {
  console.error('❌ Erro no setup:', error.message);
  process.exit(1);
}