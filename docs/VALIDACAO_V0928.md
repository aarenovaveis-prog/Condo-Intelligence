# Validação v0.9.28 — opções inválidas

## Escopo
Correção isolada dos contratos demonstrativos offline `filterTowerRecords` e `sumBrlCents`. `null` e opções primitivas agora produzem `TowerScopeError` previsível, em vez de `TypeError` nativo (para `null`) ou comportamento implícito. Não é uma barreira de autorização, nem substitui Supabase RLS.

## Reprodução
```sh
node --check src/tower_scope.mjs
node --check test/tower_scope.test.mjs
node --test test/tower_scope.test.mjs
node --test scripts/verify-offline.test.mjs scripts/verify-offline-context.test.mjs
node scripts/verify-offline.mjs
```

## Evidência disponível
O código e três testes foram publicados em branch separada. Dez asserções isoladas no Node.js 22.16.0 confirmaram a guarda e a preservação dos parâmetros padrão; essas asserções não equivalem à suíte integral. O clone completo falhou por DNS (`Could not resolve host: github.com`). A validação do GitHub Actions deve ser confirmada no SHA final do PR.

Sem merge, deploy, cobranças, dados reais, Supabase ou mudanças em outros projetos.
