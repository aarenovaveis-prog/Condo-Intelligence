# Validação v0.9.16 — ausência do arquivo de regressão

## Alteração
Um teste novo em `scripts/verify-offline.test.mjs` exige saída 1 e mensagem `FAILED: syntax: tests` quando `test/tower_scope.test.mjs` está ausente. Usa diretório temporário e dados sintéticos.

## Evidência local — 03/11/2026
Node.js v22.16.0: reprodução isolada do novo cenário com cópia manual do executor e fixture temporário: **1/1 aprovado**, saída 0 do teste (o subprocesso sob teste retorna 1, como esperado). Esta execução **não equivale** à suíte integral do repositório; não foram executados os outros três testes nem os 77 testes do contrato nesta rodada. Comando para reproduzir integralmente na branch: `node --test scripts/verify-offline.test.mjs && node scripts/verify-offline.mjs`.

## Limites
CI remoto do commit ainda não confirmado; sem testes de UI, Supabase/RLS, dados reais ou deploy. Branch baseada em `test/offline-runner-fail-closed-v0915` (PR #20); PR deve permanecer em draft e sem merge automático.
