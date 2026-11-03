# Validação v0.9.29 — opções sem execução de getters

## Problema
A desestruturação direta das opções em `filterTowerRecords` e `sumBrlCents` executava getters de propriedades controladas pelo chamador e podia propagar exceções nativas. Os registros já eram lidos por descritores; as opções não.

## Correção
`optionData` inspeciona descritores próprios de opções e rejeita propriedades acessoras com `TowerScopeError`; proxies revogados são normalizados. A desestruturação passa a ocorrer apenas na cópia de descritores de dados, sem invocar `get` do objeto original. Objetos de opções em array são rejeitados.

## Reproduzir
```sh
node --check src/tower_scope.mjs
node --check test/tower_scope.test.mjs
node --test test/tower_scope.test.mjs
node scripts/verify-offline.mjs
```

## Evidências e limitações
Node.js 22.16.0: cinco asserções isoladas do helper passaram (acessor rejeitado sem leitura, proxy revogado normalizado, Proxy get trap ignorado, valor próprio preservado e padrão ausente preservado). Esses testes foram executados com cópia isolada do helper, não com a suíte integral do repositório. Quatro testes de regressão foram adicionados ao arquivo de testes do repositório, mas sua execução integral e CI ainda precisam ser confirmados. `git ls-remote` falhou por DNS ao resolver github.com; a publicação ocorreu via conector GitHub.

Sem merge, deploy, autenticação, Supabase, dados reais ou alterações em outros projetos.
