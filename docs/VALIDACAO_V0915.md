# Validação v0.9.15 — executor offline (dados sintéticos)

## Escopo
Adicionados testes de comportamento para o executor `scripts/verify-offline.mjs`, sem alterar lógica de negócios. A CI passa a executar os novos testes antes da regressão existente.

## Reprodução
```sh
node --version
node --test scripts/verify-offline.test.mjs
node scripts/verify-offline.mjs
```

## Evidência local (2026-11-03)
- Node.js v22.16.0.
- Testes do executor: **3 aprovados, 0 falhas**.
- Regressão de filtros por torre e somas BRL: **77 aprovados, 0 falhas**.
- Cenários: execução a partir de diretório distinto; fonte ausente; teste de regressão deliberadamente falho.
- Durante a criação, o cenário de falha deliberada inicialmente retornou sucesso devido à herança de `NODE_TEST_CONTEXT` do executor de testes do Node. Corrigido no fixture removendo a variável do subprocesso; reexecução 3/3 aprovada.

## Limitações
- Testes locais usam arquivos do pacote v0.9.10 e o executor obtido da branch v0.9.14; o resultado remoto da branch v0.9.15 deve ser conferido separadamente.
- O limite real de timeout de 60 segundos não foi testado nesta entrega.
- Nenhuma validação da interface, Supabase, RLS ou HTTP/SQLite.
- Sem merge ou deploy.
