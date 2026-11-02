# Validação técnica — Condo Intelligence v0.9.00

Data: 2026-11-02 (America/Fortaleza).

## Escopo
Correção pequena e independente no contrato de valores BRL de demonstração. `parseBrlCents` agora rejeita textos com mais de 16 unidades UTF-16 **antes** da expressão regular e de `BigInt`, evitando conversões desnecessárias de números de tamanho arbitrário. O limite contempla o maior valor suportado, `-999999999999.99`.

## Evidências reproduzíveis
Ambiente local: Node.js v22.16.0, código extraído do pacote v0.8.99 e comparado por `git hash-object` com o GitHub.

1. Baseline original: `node --test test/tower_scope.test.mjs` -> 46 aprovados, 0 falhas.
2. Testes novos antes da correção: 48 aprovados, **1 falha** (teste 47, `BigInt` foi invocado com entrada gigantesca).
3. Após a correção: `node --check src/tower_scope.mjs`, `node --check test/tower_scope.test.mjs` -> aprovados.
4. `node --test test/tower_scope.test.mjs` -> **49 aprovados, 0 falhas, 0 ignorados**.
5. SHAs Git do conteúdo local testado e dos blobs publicados na branch:
   - `src/tower_scope.mjs`: `fb8f1374fe9149a8b57d9c80959d287cc74212d7`
   - `test/tower_scope.test.mjs`: `02ed0090b6a70191372f799ae773f24c3af15501`

## Reproduzir
```bash
node --version
node --check src/tower_scope.mjs
node --check test/tower_scope.test.mjs
node --test test/tower_scope.test.mjs
```

## Dependências e limites
- Branch baseada na branch do PR #4, ainda não incorporado à `main`. Este é um **PR empilhado**, não independente da integração do PR #4.
- `git ls-remote`/clone HTTPS do GitHub falhou por DNS no ambiente local; o código executado foi verificado pelos hashes de blobs, não por checkout remoto.
- Contrato offline com dados fictícios; não valida a interface funcional, banco, Supabase, RLS, controle de acesso ou autenticação.
- O repositório estava **público** na inspeção de 02/11/2026; não publicar dados reais, credenciais ou código proprietário até confirmar privacidade.
- Nenhum merge, deploy, cobrança ou dado real.
