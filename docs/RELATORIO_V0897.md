# Condo Intelligence — verificação CSV v0.8.97

Data: 2026-11-02 (America/Fortaleza).

## Escopo e origem
- Repositório dedicado: `aarenovaveis-prog/Condo-Intelligence`, ainda **público**.
- Branch de trabalho: `fix/csv-utf8-byte-budget-v0897`, criada a partir de `fix/csv-invisible-prefix-regression-v0896` (PR #1 em rascunho).
- Mudança isolada: o limite de exportação CSV passa a contabilizar **bytes UTF-8**, incluindo CRLF de cabeçalho/linhas e BOM opcional. O limite continua em 8.000.000 bytes.
- Sem dados reais, credenciais, Supabase, deploy, cobrança ou merge.

## Defeito reproduzido antes da correção
O cálculo anterior usava `string.length` (unidades UTF-16), omitia os 2 bytes CRLF do cabeçalho e não contabilizava o BOM UTF-8. Um CSV maior que 8 MB podia passar.

Com a suíte `test/csv_byte_budget.test.mjs` executada contra o módulo v0.8.96 anterior à correção: **2 passaram e 3 falharam**, como esperado. Falharam: 1 byte acima do limite, BOM e conteúdo multibyte.

## Correção e testes locais
- `node --test test/*.test.mjs`: **52 testes aprovados, 0 falhas, 0 ignorados**.
- `node --check src/safe_csv.mjs` e `node --check test/csv_byte_budget.test.mjs`: aprovados.
- Ambiente: Node.js v22.16.0.
- Casos de fronteira: exatamente 8.000.000 bytes permitido; 8.000.001 rejeitado; BOM de 3 bytes contado; Unicode multibyte rejeitado quando excede limite; exportação pequena preservada.
- Os testes foram executados localmente sobre cópia do pacote v0.8.96 com a mesma alteração lógica; **não** houve clone/execução diretamente do GitHub por indisponibilidade de DNS para github.com. Os arquivos enviados à branch foram relidos pela conexão GitHub.

## Reproduzir na branch
```bash
node --test test/*.test.mjs
node --check src/safe_csv.mjs
node --check test/csv_byte_budget.test.mjs
```

## Limitações e revisão
- O módulo continua independente; não há integração com a interface v0.8.5, browser ou planilhas Excel/LibreOffice.
- Este PR é empilhado sobre o PR #1: revisar e integrar o PR #1 antes de considerar a mudança contra `main`; **não** fazer merge automático.
- A visibilidade pública impede importar código proprietário e dados da plataforma.
- Próximo passo: revisão dos PRs, privacidade do repositório, recuperação da base funcional e testes integrados de filtros por torre e cálculos.
