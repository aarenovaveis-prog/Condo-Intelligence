# Condo Intelligence — validação isolada CSV v0.8.98

Data: 2026-11-02 (America/Fortaleza).

## Tarefa e motivação
- Escopo: integridade de exportação CSV, sem interface, Supabase ou dados reais.
- O `TextEncoder` converte silenciosamente surrogates UTF-16 isolados para U+FFFD, alterando o conteúdo exportado.
- A correção rejeita esses textos com `CsvExportError`, inclusive em rótulos de cabeçalho, preservando pares válidos (ex.: emoji).
- Não há mudança nos limites existentes de linhas, colunas, células e 8.000.000 bytes.

## Evidência local (Node.js v22.16.0)
- Antes da correção: `node --test test/csv_unicode_integrity.test.mjs` → **1 passou, 5 falharam**, reproduzindo o defeito.
- Depois: `node --test test/*.test.mjs` → **58 passaram, 0 falharam, 0 ignorados**.
- `node --check src/safe_csv.mjs` e `node --check test/csv_unicode_integrity.test.mjs` → aprovados.
- Teste de confirmação: `TextEncoder().encode('\\uD800')` retorna os bytes `EF BF BD` (caractere de substituição).

## Como reproduzir
```sh
node --test test/*.test.mjs
node --check src/safe_csv.mjs
node --check test/csv_unicode_integrity.test.mjs
```

## Proveniência e limites
- A execução local utilizou o pacote v0.8.97; os arquivos `src/safe_csv.mjs` e `test/csv_unicode_integrity.test.mjs` foram relidos na branch GitHub após a publicação.
- O pacote local e o arquivo `src/safe_csv.mjs` no GitHub têm diferenças de comentários/documentação anteriores à correção. O algoritmo e o ponto modificado são equivalentes, mas **não houve teste executado diretamente sobre checkout da branch GitHub**: o clone falhou por DNS (`Could not resolve host: github.com`).
- Este PR é empilhado sobre o PR #2, que depende do PR #1. Revisar a cadeia antes de qualquer integração.
- Repositório permanece público. Não importar código proprietário, dados reais ou credenciais.
- Sem merge, deploy, cobrança, autenticação, RLS ou testes de interface.
