# Condo Intelligence v0.9.10 — limite de registros demonstrativos

Data: 2026-11-02. Escopo: contrato offline com dados fictícios, sem integração à UI.

## Mudança
`recordArrayLength` rejeita arrays com mais de 10.000 registros antes de iterar posições, tanto em `filterTowerRecords` quanto em `sumBrlCents`. Limite conservador para reduzir custo de processamento de entradas sintéticas grandes. Não é uma proteção contra todos os ataques de negação de serviço nem controle de autorização.

## Reprodução
`node --check src/tower_scope.mjs`
`node --check test/tower_scope.test.mjs`
`node --test test/tower_scope.test.mjs`

Resultado local Node.js v22.16.0: 77 testes, 77 aprovados, 0 falhas; três testes adicionados (dois casos acima do limite e um no limite). Hashes Git dos arquivos executados: fonte `6517c2b2ffa7d60fe1b6e39b2e4e13bd21eefd42`, testes `2200755e162e2d369b1719f83bf2045977609ddc`. Conferir novamente no CI/revisão; execução GitHub Actions não comprovada.

## Restrições
Branch empilhada sobre PR #14; não fazer merge automático. Sem deploy, dados reais, Supabase, RLS, cobrança ou alteração de outros repositórios. O repositório continua público. Integração funcional e revisão da cadeia de PRs pendentes.