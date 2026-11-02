# Condo Intelligence — contrato de voto demonstrativo v0.9.01

Data: 2026-11-02. Escopo: componente independente de demonstração, sem integração à interface.

## Controles implementados

- Catálogo limitado a 1.000 tokens fictícios, únicos e canônicos.
- Somente opções `yes`, `no`, `abstain`; um voto por token.
- Fechamento impede novos votos e preserva contagem.
- `snapshot()` fornece apenas totais e estado, sem tokens ou votos individuais.
- Sessão e resultados em memória, sem banco de dados, rede ou persistência.

## Reproduzir

```bash
node --version
node --check src/demo_vote.mjs
node --check test/demo_vote.test.mjs
node --test test/demo_vote.test.mjs
```

Ambiente local: Node.js v22.16.0. Resultado: 14 testes aprovados, 0 falhas, 0 ignorados. Usados somente dados sintéticos.

## Limitações e revisão

**NÃO é votação real**: não autentica participantes, não verifica quórum ou frações ideais, não controla quem pode fechar, não oferece trilha auditável, criptografia, persistência, LGPD ou validade jurídica de assembleia. Não conectar a moradores reais nem usar em deliberações. O repositório é público e não deve receber código proprietário, credenciais ou dados reais. Sem Supabase/RLS, deploy, merge, cobrança ou alteração de outros projetos.

Branch independente da `main` e dos PRs #1–#5. Revisão humana e homologação integrada obrigatórias antes de qualquer uso.
