# Condo Intelligence — validação v0.9.04

Data: 2026-11-02. Escopo: confirmação explícita para **encerrar uma votação fictícia offline**.

## Problema e alteração
A v0.9.03 aceitava `close()` sem qualquer confirmação, tornando fácil encerrar acidentalmente uma sessão demonstrativa. Agora, para a transição de aberta para encerrada, exige-se `close({ confirm: true })`. Valores falsos, herdados ou fornecidos por getter não autorizam a transição. Tentativas inválidas preservam votos e estado aberto. Depois de encerrada, `close()` continua idempotente.

**Alteração incompatível da API**: consumidores devem mostrar uma confirmação explícita e chamar `close({ confirm: true })`. Esta checagem **não autentica nem autoriza** o operador: qualquer pessoa com acesso ao objeto pode enviar essa confirmação. Não é apropriada para votação real.

## Reprodução local
Ambiente: Node.js v22.16.0, apenas biblioteca padrão.

```bash
node --version
node --check src/demo_vote.mjs
node --check test/demo_vote.test.mjs
node --test test/demo_vote.test.mjs
```

- Baseline v0.9.03: **21/21 aprovados**.
- Testes de regressão adicionados antes da correção: **22 aprovados, 3 falhas** (de 25).
- Após correção: **25/25 aprovados**, 0 falhas, 0 ignorados.
- Hash Git blob do código executado: `d10b8747fd8914705e6a59615015b2f1459fc300`.
- Hash Git blob dos testes executados: `782b094cd9b14b55858d14dcee940d7ecd5c7d3f`.
- Código e testes foram extraídos do ZIP v0.9.03 e seus hashes coincidiram com os blobs GitHub da branch-base. Os hashes dos arquivos corrigidos foram verificados após publicação.
- Testes não foram executados em checkout clonado diretamente do GitHub; a equivalência de bytes foi conferida pelos hashes Git.

## Dependências e limitações
PR empilhado sobre #8 (que depende de #7 e #6); manter como rascunho, sem merge automático. Repositório público: apenas código genérico e tokens fictícios. Nenhuma interface integrada, persistência, autenticação, controle de permissões, quórum legal, Supabase/RLS, navegador, HTTP/SQLite, deploy, cobrança ou dado real. Não utilizar em assembleia oficial.
