# Condo Intelligence v0.9.09 — leitura segura de descritores de registros

Data: 2026-11-02. Branch: `fix/record-descriptor-snapshot-v0909`.
Base: PR #13 (`fix/record-array-own-slots-v0908`), que depende de #12 → #11 → #5 → #4.

## Escopo da correção

- `sumBrlCents` lê `amount_brl` do descritor próprio de dados, não por `row[field]` (que poderia executar `Proxy.get` e falsificar o valor).
- `filterTowerRecords` copia valores enumeráveis dos descritores, sem executar `Proxy.get` durante o spread do objeto.
- Objetos `Proxy` revogados ou com traps de reflexão que lançam erro retornam `TowerScopeError`, sem exceções nativas não tratadas.
- Não altera regras de elegibilidade, moeda, filtros, RLS ou UI; somente dados sintéticos offline.

## Reprodução local

Node.js v22.16.0:

```sh
node --check src/tower_scope.mjs
node --check test/tower_scope.test.mjs
node --test test/tower_scope.test.mjs
```

Base v0.9.08: 69/69 testes aprovados. Após acrescentar cinco regressões **antes da correção**, 69 aprovados e 5 falhas (74 testes). Após corrigir, 74/74 aprovados, 0 falhas. Evidências: `evidence/red_v0909.log`, `evidence/green_v0909.log`.

Hashes de blob Git locais (conferir com GitHub após publicar):

- `src/tower_scope.mjs`: `e56e03c875f12f69f7419cd1a44015824357ef04`
- `test/tower_scope.test.mjs`: `a0893f105d3fc1e64fe41468910e49d87bfd73ad`

## Limitações e portões

Sem CI remoto comprovado, sem browser, HTTP/SQLite, integração com interface, autenticação, Supabase/RLS ou dados reais. Um `Proxy` pode executar efeitos colaterais nas traps de reflexão; este contrato não constitui limite de autorização ou substituto para validação de entradas e isolamento no servidor. O repositório ainda é público. Nenhum deploy, merge ou cobrança foi autorizado.
