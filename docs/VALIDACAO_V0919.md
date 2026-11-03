# Validação v0.9.19 — regressão sem asserções

## Escopo
O executor offline agora exige que o relatório TAP do Node.js contenha `# tests N` com N maior que zero. Um processo que sai com código 0, mas não executa testes, deve falhar fechado. Saída e erros dos subprocessos são preservados para auditoria; o buffer é limitado a 8 MiB.

## Teste sintético adicionado
`scripts/verify-offline.test.mjs` cria uma suíte de regressão válida sintaticamente, porém sem chamadas a `test()`, e exige código de saída 1, `# tests 0` e `FAILED: regression`.

## Reprodução (Node.js 22)
```sh
node --check scripts/verify-offline.mjs
node --test scripts/verify-offline.test.mjs scripts/verify-offline-context.test.mjs
node scripts/verify-offline.mjs
```

## Estado da evidência
Alterações publicadas na branch, mas execução local indisponível por erro de conexão com o ambiente de execução. Não afirmar aprovação até obter logs do GitHub Actions ou execução Node reproduzível. A interpretação do resumo TAP depende do formato padrão do Node.js 22; mudanças futuras no reporter exigem revisão.

## Limites
Sem merge, deploy, dados reais, custos, Supabase, RLS ou alteração de outros repositórios. Base: v0.9.18 / PR #23.
