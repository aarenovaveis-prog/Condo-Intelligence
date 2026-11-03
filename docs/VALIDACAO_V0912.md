# Condo Intelligence v0.9.12 — limites de execução offline

Data: 2026-11-02. Alteração restrita ao executor de testes offline, sem dados reais.

## Alteração
Cada verificação executada como processo filho recebe timeout de 60 segundos. Falha, sinal ou erro de spawn encerram o executor com código 1. O processo filho recebe NODE_OPTIONS vazio para não herdar loaders/preloads do ambiente do executor. Isso **não protege o próprio processo inicial** contra NODE_OPTIONS já definido antes de sua inicialização; não é sandbox.

## Evidências locais
Ambiente Node.js v22.16.0; fonte e testes de v0.9.10 extraídos do pacote anterior; script v0.9.12 reproduzido localmente.
- `node scripts/verify-offline.mjs`: 77/77 testes aprovados, saída 0.
- Fonte temporariamente ausente: falha no check de sintaxe, saída 1; arquivo restaurado.
- Tentativa de iniciar o próprio Node com NODE_OPTIONS contendo preload inexistente: falha antes de executar o script, conforme limitação acima.
- Timeout de 60 segundos não foi exercitado com processo travado; portanto sua atuação ainda depende de teste específico.
- CI remoto, interface, HTTP/SQLite, autenticação e RLS não testados.

## Reproduzir
`node scripts/verify-offline.mjs` com Node.js 22.
PR empilhado sobre #16; manter rascunho, sem merge. Não usar dados reais, não fazer deploy nem gerar custos.
