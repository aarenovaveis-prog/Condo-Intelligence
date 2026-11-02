# Condo Intelligence — v0.9.08 — integridade dos arrays de registros

Data: 2026-11-02. Base: PR #12 (`fix/tower-catalog-iterator-v0907`), dependente de #11 → #5 → #4. Escopo: contrato offline com dados sintéticos, sem integração à interface.

## Defeito reproduzido

`filterTowerRecords` e `sumBrlCents` percorriam arrays com `for...of`, aceitando `Symbol.iterator` controlado pelo chamador. Um array com somente registro da Torre B podia injetar uma linha falsa da Torre A, ou alterar o total monetário lido. Um iterador que lançava erro interrompia o processamento. Slots com getters podiam ser executados.

## Correção

- Ler comprimento por descritor próprio do array e cada índice por `Object.getOwnPropertyDescriptor`, sem invocar iteradores nem getters de slots.
- Rejeitar arrays esparsos, slots acessórios e proxies revogadas com `TowerScopeError`.
- Aplicar a mesma leitura por índice ao filtro de torre e à soma monetária, preservando `BigInt`.
- Sem mudança de interface, persistência, autenticação, dados reais ou Supabase.

## Testes reproduzíveis

Ambiente local: Node.js v22.16.0. Código reconstruído da versão anterior (ZIP v0.9.06) e patch da PR #12; hashes Git dos arquivos da base confirmados com os blobs publicados no GitHub.

- Base PR #12: **60 testes aprovados, 0 falhas**.
- Após adicionar 9 testes, antes da correção: **62 aprovados, 7 falhas**. Dois testes já passavam na implementação anterior.
- Após correção: **69 aprovados, 0 falhas**; `node --check` dos dois arquivos aprovado.
- Hash Git do arquivo fonte executado: `ad11ff2603c0358f0f057bbee35f43e363e75832`.
- Hash Git dos testes executados: `b95bbbafd8f248158d3a59de1f2a378d34c5a9ff`.
- Esses hashes coincidem com os blobs publicados nesta branch.

Reproduzir em Node 22:

```sh
node --check src/tower_scope.mjs
node --check test/tower_scope.test.mjs
node --test test/tower_scope.test.mjs
```

Os logs locais red/green estão no pacote técnico v0.9.08; não foram publicados no repositório. Nenhum status CI foi retornado pela API do GitHub para os commits inspecionados. Git clone direto permaneceu bloqueado por DNS; os arquivos testados foram reconstruídos localmente e conferidos por hash, não por checkout remoto.

## Limites e próximos passos

Este é um contrato demonstrativo em JavaScript, **não uma fronteira de autorização**. Não substitui isolamento multi-tenant no backend, autenticação ou Supabase RLS. Proxies hostis podem ter outros comportamentos não cobertos. Revisar a cadeia #4 → #5 → #11 → #12 → este PR, recuperar a interface funcional e realizar testes integrados de filtros e cálculos. Repositório ainda público. Nenhum merge, deploy, cobrança ou dado real.
