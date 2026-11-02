# Condo Intelligence — validação v0.9.03

Data: 2026-11-02. Escopo: ocultação de apuração parcial no voto **exclusivamente demonstrativo**, offline e com tokens fictícios.

## Defeito e correção

Na v0.9.02, `snapshot()` e o retorno de `castVote()` revelavam `yes/no/abstain` enquanto a sessão estava aberta. Isso permite que participantes de uma demonstração vejam o placar antes de votar.

A v0.9.03 preserva `eligible`, `ballots` e `remaining` durante a votação, mas retorna `yes: null`, `no: null`, `abstain: null` até o fechamento explícito. Depois de `close()`, os três totais são revelados. É uma **alteração intencional de contrato**: consumidores da interface precisam aceitar `null` nos três campos durante a sessão aberta. Não é sigilo criptográfico nem controle de autorização: qualquer pessoa com acesso ao objeto da sessão pode encerrá-la.

## Evidências reproduzíveis

```bash
node --version
node --check src/demo_vote.mjs
node --check test/demo_vote.test.mjs
node --test test/demo_vote.test.mjs
```

Ambiente local: Node.js v22.16.0.
- Baseline v0.9.02: 17/17 aprovados.
- Novos testes contra código antigo: 18 aprovados, **3 falhas reproduzidas** (dos quatro novos testes).
- Após correção e atualização das expectativas: **21/21 aprovados**, zero falhas, zero ignorados.
- Hashes Git dos arquivos testados e publicados:
  - `src/demo_vote.mjs`: `7293da3479ee9626328046b3f33eb51ea0dd22fb`
  - `test/demo_vote.test.mjs`: `59a525a2c8d15ba170fef97360b3f89ed463bca8`

## Dependências e limites

PR empilhado sobre #7, que depende de #6; nenhum deles foi mesclado. Repositório permanece público: apenas código genérico e dados fictícios. Sem interface funcional integrada, teste de navegador, HTTP/SQLite, autenticação, permissão para encerrar, verificação de quórum, banco de dados, Supabase/RLS, dados reais, deploy ou cobrança. Não é votação oficial ou juridicamente válida. Revisão humana obrigatória antes de merge.
