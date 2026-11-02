# Condo Intelligence — v0.9.06 — isolamento por torre (contrato offline)

Data: 2026-11-02. Base: `fix/money-input-length-guard-v0900` (PR #5, depende do PR #4). Não mesclar automaticamente.

## Defeito reproduzido

`filterTowerRecords` consultava `row.scope` e `row.tower_id` sem exigir que fossem propriedades próprias. Quando `Object.prototype` continha esses campos, registros legados sem classificação explícita eram indevidamente incluídos na Torre A ou em áreas comuns. Além disso, metadados próprios não enumeráveis desapareciam na cópia por spread.

## Alteração

A classificação passa a usar descritores próprios **enumeráveis** de `scope` e `tower_id`; registros sem ambos são excluídos. A validação de registros com acessores continua rejeitando getters. Não há alteração no cálculo monetário.

## Reprodução

Requer Node.js 22 (testado em v22.16.0). Na raiz deste contrato:

```sh
node --check src/tower_scope.mjs
node --check test/tower_scope.test.mjs
node --test test/tower_scope.test.mjs
```

- Base v0.9.00: 49/49 testes aprovados.
- Com 4 novos testes e sem patch: 49 aprovados, **4 falhas** (reprodução).
- Com patch: **53/53 aprovados**, 0 falhas, 0 ignorados.
- Novos cenários: herança de ambos os campos, herança somente de `tower_id`, classificação `common` herdada, metadados não enumeráveis.
- Os testes de poluição do protótipo restauram os descritores em `finally`.

## Limites

Contrato demonstrativo independente. Filtragem JavaScript **não é** isolamento de banco de dados, autenticação, autorização ou RLS. Não foi integrado à interface do Condo Intelligence nem testado em navegador, HTTP/SQLite ou Supabase. Nenhum dado real, custo, deploy, merge ou alteração de outros repositórios.

## Próxima ação

Revisar PRs #4 e #5 antes deste PR; recuperar a interface funcional e verificar filtros e agregações de consumo, manutenção e relatórios com dados sintéticos. A visibilidade do repositório segue pública: não publicar dados reais, segredos nem código privado da aplicação.
