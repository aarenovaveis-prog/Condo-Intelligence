# Condo Intelligence — validação v0.9.02

Data: 2026-11-02. Escopo: correção de integridade do catálogo de tokens **fictícios** do voto demonstrativo, sem interface nem persistência.

## Problema reproduzido

A versão v0.9.01 validava os tokens com `Array.prototype.some`, que ignora posições vazias (sparse arrays), e construía o catálogo com `new Set(eligibleTokens)`, que aceita um iterador personalizado. Um catálogo com uma posição vazia podia contar um eleitor inexistente; um iterador adulterado podia substituir o token autorizado por outro. Um getter de índice também podia ser executado durante a validação.

## Correção

Validação de cada índice usando `Object.getOwnPropertyDescriptor`, aceitando apenas posições próprias de dados com tokens válidos. O conjunto de elegíveis é criado exclusivamente a partir de valores já validados; catálogos duplicados continuam rejeitados. Não há alteração da API pública.

## Testes reproduzíveis

```bash
node --version
node --check src/demo_vote.mjs
node --check test/demo_vote.test.mjs
node --test test/demo_vote.test.mjs
```

Ambiente: Node.js v22.16.0. Antes da correção, **14 aprovados, 3 falhas** (três novos testes de regressão). Depois da correção, **17 aprovados, 0 falhas, 0 ignorados**. Os 14 testes anteriores permaneceram aprovados. Testes locais sobre código com origem conferida por SHA de blob Git do PR #6; não são testes integrados da plataforma.

Hashes Git dos arquivos testados e publicados:
- `src/demo_vote.mjs`: `0df003bb2977a1a9d045a24d4b6df00e28a2798b`
- `test/demo_vote.test.mjs`: `2275350a9fe9e90cfbd99d3cb94def9b53c2f4b4`

## Restrições

Somente dados sintéticos e componente offline. Não é votação real: sem autenticação, elegibilidade jurídica, quórum, permissão de encerramento, auditoria, banco de dados, RLS ou persistência. Repositório público; não adicionar código proprietário, credenciais ou dados reais. PR de revisão empilhado sobre PR #6, sem merge ou deploy. Nenhuma cobrança ou alteração de outros projetos.
