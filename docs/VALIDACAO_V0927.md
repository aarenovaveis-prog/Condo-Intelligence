# Validação v0.9.27 — rejeição de zero negativo em BRL

## Defeito
`parseBrlCents('-0')`, `'-0.0'` e `'-0.00'` retornavam `0n`, normalizando silenciosamente representações não canônicas. `formatBrlCents` sempre imprime `0.00` para zero.

## Correção
Rejeitar zero negativo após a conversão exata em centavos; preservar zero positivo, valores negativos não nulos e o limite máximo de centavos. Dois testes de regressão adicionados em `test/tower_scope.test.mjs`.

## Reproduzir na branch
```sh
node --check src/tower_scope.mjs
node --check test/tower_scope.test.mjs
node --test test/tower_scope.test.mjs
node scripts/verify-offline.mjs
```

## Evidência disponível
Em 2026-11-03, Node.js 22.16.0: 4/4 testes aprovados em reprodução local **isolada da lógica monetária** (zero negativo, zero positivo, centavo negativo, limite). A suíte integral da branch não foi executada: o clone via GitHub falhou por resolução DNS. Não confundir o teste isolado com homologação do pacote; CI remoto do commit ainda requer verificação.

## Restrições
Somente dados sintéticos; nenhuma mudança na main, merge, deploy, Supabase, dados reais, cobrança ou outro repositório. O contrato offline não constitui autorização de acesso ou RLS.
