# Arquitetura do Sistema

## Visão Geral

O sistema é composto por três pacotes principais:

1. **@bot-consulta/shared**: Tipos e utilitários compartilhados
2. **@bot-consulta/extension**: Extensão Chrome para extração
3. **@bot-consulta/bot**: Bot externo para gerenciamento

## Comunicação

- **Bot ↔ Extensão**: WebSocket + HTTP
- **Bot ↔ Banco**: Prisma ORM
- **Bot ↔ APIs**: REST + GraphQL

## Fluxo de Dados

1. Bot recebe comando
2. Bot envia comando para extensão
3. Extensão extrai dados
4. Extensão retorna dados
5. Bot salva no banco
6. Bot responde ao solicitante
