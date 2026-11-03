# Validação v0.9.17 — isolamento do executor offline

## Escopo
O subprocesso do executor `scripts/verify-offline.mjs` passa a receber `NODE_TEST_CONTEXT: ''`, além de `NODE_OPTIONS: ''`. Objetivo: não propagar um contexto interno do test runner Node.js aos subprocessos de verificação.

## Reprodução solicitada
No checkout desta branch, com Node.js 22:

```sh
node --check scripts/verify-offline.mjs
node scripts/verify-offline.mjs
NODE_TEST_CONTEXT=child-v8 node scripts/verify-offline.mjs
node --test test/tower_scope.test.mjs
```

Esperado: código de saída zero nas quatro verificações e 77 testes de regressão aprovados, caso a base permaneça inalterada. Os números são **expectativa histórica**, não resultados desta branch.

## Evidência e limitações
- O arquivo atualizado foi publicado no GitHub na branch separada.
- Execução local: **não realizada**; o ambiente de execução de comandos retornou erro de conexão.
- CI remoto: **não comprovado**.
- Sem UI, autenticação, Supabase, RLS, dados reais, merge ou deploy.
- PR empilhado sobre #21; revisão da cadeia continua necessária.
