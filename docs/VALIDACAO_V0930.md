# Validação v0.9.30 — rejeição de opções desconhecidas

## Problema
`optionData` aceitava chaves próprias desconhecidas e as ignorava. Um erro de digitação em `field` podia fazer `sumBrlCents` somar `amount_brl` por padrão, produzindo resultado diferente do campo pretendido. Em filtros, `includeComon` era ignorado silenciosamente.

## Alteração
Exigir lista explícita de chaves permitidas por função: `towerId`, `knownTowers`, `includeCommon` no filtro e `field` no somatório. Chaves desconhecidas e chaves Symbol geram `TowerScopeError`; descritores acessores continuam rejeitados sem executar getters. Sem autenticação, banco ou dados reais.

## Reprodução
```sh
node --check src/tower_scope.mjs
node --check test/tower_scope.test.mjs
node --test test/tower_scope.test.mjs
node scripts/verify-offline.mjs
```

## Evidência e limitações
Node.js 22.16.0: cinco asserções isoladas de `optionData` aprovadas para chaves permitidas, chaves extras, Symbol e getter sem execução. Quatro testes de regressão foram publicados no repositório, mas a suíte integral da branch não foi executada localmente porque `git ls-remote` falhou ao resolver github.com. A aprovação do CI do novo commit deve ser verificada separadamente.

Sem merge, deploy, cobrança, Supabase, dados reais ou alterações em outros projetos.
