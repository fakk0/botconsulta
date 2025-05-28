// Script para copiar assets da extensão (multiplataforma)
const fs = require('fs');
const path = require('path');

function copyFile(src, dest) {
  try {
    // Criar diretório de destino se não existir
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Copiar arquivo
    fs.copyFileSync(src, dest);
    console.log(`✅ Copiado: ${src} → ${dest}`);
  } catch (error) {
    console.error(`❌ Erro ao copiar ${src}:`, error.message);
    process.exit(1);
  }
}

function copyDirectory(src, dest) {
  try {
    // Criar diretório de destino
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    // Ler conteúdo do diretório
    const items = fs.readdirSync(src);
    
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      
      const stat = fs.statSync(srcPath);
      
      if (stat.isDirectory()) {
        copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
    
    console.log(`✅ Diretório copiado: ${src} → ${dest}`);
  } catch (error) {
    console.error(`❌ Erro ao copiar diretório ${src}:`, error.message);
    process.exit(1);
  }
}

console.log('📁 Copiando assets da extensão...');

// Criar diretório dist se não existir
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Copiar arquivos individuais
copyFile('manifest.json', 'dist/manifest.json');
copyFile('popup.html', 'dist/popup.html');

// Copiar diretório icons
if (fs.existsSync('icons')) {
  copyDirectory('icons', 'dist/icons');
} else {
  console.log('⚠️ Diretório icons não encontrado, pulando...');
}

console.log('✅ Assets copiados com sucesso!');
