# Bot Consulta Placas - Sistema Híbrido

## Arquitetura

Este projeto utiliza uma arquitetura híbrida composta por:

- **Bot Externo (Node.js + TypeScript)**: Motor principal de gerenciamento
- **Extensão Chrome (TypeScript)**: Extrator de dados no navegador real
- **Shared Package**: Tipos e utilitários compartilhados

## Estrutura do Projeto

```
botPainel/
├── packages/
│   ├── shared/              # Tipos e utilitários compartilhados
│   ├── extension/           # Extensão Chrome
│   └── bot/                 # Bot externo (Node.js)
├── database/                # Schemas e migrações
├── docs/                    # Documentação
└── scripts/                 # Scripts de automação
```

## Como usar

1. `npm run install:all`     # Instalar todas as dependências
2. `npm run build`           # Compilar todos os pacotes
3. `npm run dev`             # Desenvolvimento (bot + extensão)
4. `npm start`               # Executar em produção

## Desenvolvimento

- **Bot**: `npm run dev:bot`
- **Extensão**: `npm run dev:extension`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
