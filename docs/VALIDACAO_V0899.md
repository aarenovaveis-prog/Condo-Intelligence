# Condo Intelligence — contrato independente v0.8.99

Data: 2026-11-02 (America/Fortaleza). Branch: `test/tower-scope-money-contract-v0899`, base `main`.

## Escopo

Porta para JavaScript o contrato demonstrativo de segregação por torre e somatório exato do pacote histórico v0.8.94, sem integrar a interface. `filterTowerRecords` inclui apenas registros `scope='tower'` da torre selecionada; registros `scope='common'` somente mediante `includeCommon=true` e sem vínculo a torre. Registros legados, desconhecidos e inconsistentes ficam fora. Os registros retornados são cópias rasas.

Valores BRL são representados como strings decimais canônicas e convertidos em centavos `bigint`. `sumBrlCents` rejeita entradas de ponto flutuante, valores ausentes, formatos localizados, precisão subcentavo e estouro de limites. `formatBrlCents` retorna texto decimal sem depender da localidade do navegador.

## Evidências reproduzíveis

- Ambiente: Node.js v22.16.0.
- `node --test test/tower_scope.test.mjs`: **46 aprovados, 0 falhas, 0 ignorados**.
- `node --check src/tower_scope.mjs` e `node --check test/tower_scope.test.mjs`: aprovados.
- O código e o teste foram relidos pelo conector GitHub. `git hash-object` dos arquivos locais executados coincide exatamente com os blob SHAs retornados pelo GitHub:
  - `src/tower_scope.mjs`: `494ecc54d8970d2d4b1018b8514acf0229a0a9d2`
  - `test/tower_scope.test.mjs`: `4ce50a34d0b69a087eb7f44026e1670554e61f6e`
- O clone HTTPS falhou por DNS no ambiente (`Could not resolve host: github.com`); a identidade dos blobs foi confirmada por SHA, sem checkout remoto.

## Limitações e segurança

- Contrato offline, não implementa autorização, isolamento multi-condomínio, Supabase RLS ou proteção de banco.
- Não há integração com a interface v0.8.5, testes de navegador/HTTP/SQLite, dados reais, credenciais ou deploy.
- A origem v0.8.94 foi usada como referência de comportamento, não como evidência de integração.
- Repositório **público** na inspeção. Apenas código independente e dados fictícios foram publicados.
- PR deve permanecer em rascunho até revisão; não realizar merge automático.

## Próximo passo

Confirmar visibilidade privada; recuperar a base funcional e integrar seletor por torre aos módulos reais, com testes de ponta a ponta e, antes de dados reais, autenticação/RLS auditada e aprovação de custos.
