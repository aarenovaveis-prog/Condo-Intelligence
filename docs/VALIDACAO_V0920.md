# Validação v0.9.20 — exigir testes efetivamente aprovados

## Motivação
Uma suíte com um teste marcado como skip emite `# tests 1`, `# pass 0` e pode terminar com código 0. O verificador anterior exigia somente total de testes maior que zero, aceitando indevidamente esse cenário.

## Alteração
O executor passa a exigir `# tests N` com N > 0 **e** `# pass M` com M > 0, além do código de saída 0. Um teste sintético verifica que uma suíte integralmente ignorada falha fechada. O critério não exige que todos os testes passem via contagem porque o código de saída já rejeita falhas.

## Reprodução
```sh
node --check scripts/verify-offline.mjs
node --check scripts/verify-offline.test.mjs
node --test scripts/verify-offline.test.mjs scripts/verify-offline-context.test.mjs
node scripts/verify-offline.mjs
```

## Evidência e limitações
A inspeção do TAP com Node.js 22.16.0 demonstrou `# tests 1`, `# pass 0`, `# skipped 1` para um teste sintético ignorado. A execução integral da branch publicada não pôde ser realizada localmente: o ambiente não resolveu github.com durante o clone. CI remoto pendente. O executor depende do resumo TAP padrão do Node.js 22.

Sem merge, deploy, dados reais, Supabase, RLS, cobranças ou mudanças em outros projetos.
