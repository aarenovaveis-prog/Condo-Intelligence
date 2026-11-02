# Condo Intelligence — v0.9.07 — integridade do catálogo de torres (contrato offline)

Data: 2026-11-02. Base: `fix/tower-own-scope-metadata-v0906` (PR #11, dependente de #5 e #4). Somente dados fictícios. Sem merge ou deploy.

## Defeito

`catalogIds(knownTowers)` construía o catálogo com `[...knownTowers]`, confiando em `Symbol.iterator` fornecido pelo chamador. Um array `['A']` com iterador adulterado podia apresentar a torre `B` como autorizada para **filtragem demonstrativa**. Um `Set` com iterador de instância sobrescrito tinha o mesmo problema. Slots de array definidos por getters também eram executados. Uma Proxy revogada propagava `TypeError` nativo.

## Alteração

- Arrays: ler cada posição com `Object.getOwnPropertyDescriptor`, exigindo slot próprio, de dados e ID canônico; não executar iteradores nem getters.
- Sets: usar `Set.prototype.values.call`, ignorando iteradores sobrescritos na instância.
- Erros de reflexão: converter em `TowerScopeError`.
- Preservar aceitação de arrays e Sets normais e rejeição de IDs repetidos, vazios ou não canônicos.
- Nenhuma mudança na lógica monetária ou no contrato de voto.

## Evidências e limites dos testes

**Testes executados nesta execução:** 9 cenários comportamentais em JavaScript V8 com a função `catalogIds` espelhada do patch (7 regressões e 2 cenários normais): **9/9 aprovados**. Os 7 cenários de regressão mostraram comportamento defeituoso na função anterior, incluindo autorização indevida da torre B e exceção nativa. Isto **não equivale** a executar o módulo GitHub com Node.

**Testes adicionados ao repositório:** 7 novos testes em `test/tower_scope.test.mjs`. A base anterior informava 53 testes, mas a suíte completa **não foi executada nesta execução** porque os ambientes de contêiner/Python retornaram `ConnectionError`. Portanto **não declarar 60/60 aprovados**, nem CI remoto, nem validação da interface.

Reprodução pendente em Node.js 22:

```sh
node --check src/tower_scope.mjs
node --check test/tower_scope.test.mjs
node --test test/tower_scope.test.mjs
```

## Restrições

Contrato isolado e offline. Filtragem no JavaScript não implementa autorização, isolamento entre condomínios, autenticação nem políticas Supabase RLS. Não usar dados reais, assembleias oficiais, deploy, cobrança ou merge. Repositório ainda público. Nenhum outro repositório foi alterado.

## Próxima ação

Executar a suíte diretamente sobre o commit do PR em Node.js, inspecionar CI, revisar a cadeia de PRs #4 → #5 → #11 → este PR, e integrar filtros aos módulos de consumo/manutenção/relatórios somente após revisão e recuperação da interface.
