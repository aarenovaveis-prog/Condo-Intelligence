# Condo Intelligence — validação v0.9.05

Data: 2026-11-02. Escopo: contrato de votação **somente demonstrativa, offline e com tokens fictícios**.

## Defeito reproduzido

A operação `close(confirmation)` consultava `Object.getOwnPropertyDescriptor` diretamente. Objetos Proxy revogados ou com armadilhas que lançam exceções propagavam `TypeError`/`Error` nativos, contrariando o contrato de validação `DemoVoteError`. O estado da sessão permanecia aberto, mas a exceção não padronizada podia escapar do tratamento da interface.

## Alteração

Normalizar falhas de reflexão ao validar `confirm`: descritor ausente ou inacessível é tratado como confirmação inválida. Mantida a exigência de propriedade própria de dados com valor booleano `true`; não se invocam getters. `close()` continua idempotente quando já encerrado.

## Evidências locais reproduzíveis

Ambiente: Node.js v22.16.0, Linux. Comandos a partir da raiz do pacote:

```sh
node --check src/demo_vote.mjs
node --check test/demo_vote_confirmation.test.mjs
node --test test/*.test.mjs
```

- Base v0.9.04: 25/25 testes aprovados.
- Novos testes contra a base sem patch: 26 aprovados, **3 falhas** (29 executados), registradas em `red.log`.
- Após patch: **29/29 aprovados**, nenhuma falha, registrados em `green.log`.
- Cobertura nova: Proxy com trap que lança, Proxy revogado, descritor inválido, confirmação legítima e idempotência.
- Hash Git blob de `src/demo_vote.mjs`: `048fc9f8b5be00e4f732773242888fd74e71f1ad`.
- Hash Git blob de `test/demo_vote_confirmation.test.mjs`: `8f3b347a3c59c84e53537a1ade4901df1bdba0e5`.
- Hash Git blob do teste legado: `782b094cd9b14b55858d14dcee940d7ecd5c7d3f`.
- Hashes conferidos com leitura da branch remota pelo conector GitHub; **não houve clone direto** (DNS de github.com indisponível no ambiente local).

## Limites e riscos

A confirmação de encerramento é apenas uma barreira contra acidente na demonstração, **não** autenticação/autorização. Um Proxy malicioso ainda pode devolver um descritor artificial com `confirm: true`; o recurso não é adequado a assembleias reais. Não há interface integrada, persistência, controle jurídico de quórum, Supabase/RLS, dados reais, CI remoto ou homologação em navegador.

PR empilhado sobre o PR #9 (que depende de #8, #7 e #6); revisar a cadeia antes de qualquer integração. Repositório permanece público: não publicar informações de clientes nem código proprietário. Sem merge, deploy, cobranças ou alteração em outros repositórios.
