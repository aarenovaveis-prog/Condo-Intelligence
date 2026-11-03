# Validação v0.9.18 — NODE_TEST_CONTEXT

## Falha reproduzida
Em Node.js v22.16.0, definir `NODE_TEST_CONTEXT: ''` no ambiente do subprocesso faz `node --test` emitir "node:test run() is being called recursively ... skipping running files". O executor anterior ainda imprimia "PASS: all offline checks" sem executar os 77 testes. Portanto, a alegação de regressão aprovada com o executor v0.9.17 não é confiável sem comprovar o número de testes executados.

## Correção
Excluir a chave `NODE_TEST_CONTEXT` do ambiente dos filhos com `delete childEnv.NODE_TEST_CONTEXT`, preservando `NODE_OPTIONS: ''`. Adicionado teste sintético que injeta `NODE_TEST_CONTEXT=child-v8` no processo pai e exige que uma asserção propositalmente falsa seja executada e provoque saída 1.

## Reprodução local (Node 22)
```sh
node --check scripts/verify-offline.mjs
node --test scripts/verify-offline-context.test.mjs
node --test scripts/verify-offline.test.mjs
node scripts/verify-offline.mjs
NODE_TEST_CONTEXT=child-v8 node scripts/verify-offline.mjs
```

## Evidência local em 03/11/2026
Com arquivos `src/` e `test/` do pacote v0.9.10, o executor corrigido executou 77/77 testes com saída 0, tanto normalmente quanto com `NODE_TEST_CONTEXT=child-v8`. O novo teste de falha sintética passou 1/1. A reprodução do executor anterior exibiu aviso de execução recursiva, não executou testes e retornou falsamente PASS. Os testes locais não substituem a execução do GitHub Actions no commit publicado.

## Limites
Sem merge, deploy, custos, dados reais, Supabase, RLS ou integração UI. PR empilhado sobre #22. Revisar dependências e confirmar CI remoto.
