# Condo Intelligence v0.9.11 — execução reproduzível dos testes offline

Data: 2026-11-02. Escopo: contrato demonstrativo de filtros por torre e totais BRL, exclusivamente dados sintéticos.

## Executar
Com Node.js 22, a partir de qualquer diretório:

`node scripts/verify-offline.mjs`

O script resolve a raiz do repositório a partir do próprio arquivo, verifica sintaxe de `src/tower_scope.mjs` e `test/tower_scope.test.mjs`, e executa `node --test test/tower_scope.test.mjs`. Encerra com código 1 na primeira falha; não instala dependências, não acessa rede, não inicia serviços e não modifica dados.

## Evidência local antes de publicar
Ambiente: Node.js v22.16.0. Fonte e testes extraídos do pacote v0.9.10, com hashes Git conferidos contra a branch de origem: `6517c2b2ffa7d60fe1b6e39b2e4e13bd21eefd42` e `2200755e162e2d369b1719f83bf2045977609ddc`.
- Execução normal: 77 testes, 77 aprovados, zero falhas, código de saída 0.
- Teste negativo em diretório isolado sem o arquivo de fonte: falha no primeiro check e retorna código 1.
- Não foi executado GitHub Actions, nem teste HTTP/SQLite ou integração à interface.

## Restrições e próximos passos
PR empilhado sobre a branch v0.9.10/PR #15. Não fazer merge automático. Revisar cadeia de PRs e integrar à interface antes de considerar testes de produto. Nenhum deploy, cobrança, dado real, Supabase ou RLS. Repositório ainda público na inspeção desta execução.
