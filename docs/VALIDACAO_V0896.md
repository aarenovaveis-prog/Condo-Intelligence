# Validação isolada — Condo Intelligence v0.8.96

Data: 2026-11-02 (America/Fortaleza).

## Escopo
- Base GitHub dedicada estava vazia e pública. Foi criado apenas um README genérico na branch main.
- Esta branch contém um módulo independente de exportação CSV e testes sintéticos. Nenhum dado real, segredo, código proprietário da interface ou configuração Supabase foi publicado.
- Correção pequena: neutralizar fórmulas iniciadas após caracteres de formatação Unicode invisíveis, controles C0/C1 e marcadores bidirecionais.

## Reproduzir
Requer Node.js 20+ (testado localmente com Node.js v22.16.0).

```bash
node --test test/safe_csv.test.mjs
```

Resultado local em 02/11/2026: **47 testes aprovados; 0 falhas; 0 ignorados**.

## Limitações
- Testes unitários isolados, sem browser, sem Supabase, sem HTTP/SQLite e sem integração com a aplicação v0.8.5.
- Não foi possível clonar o repositório para repetir os testes diretamente do GitHub no ambiente de execução (DNS sem acesso a github.com); o código da branch foi publicado via conector GitHub.
- A mitigação de CSV é defesa em profundidade: validar também com Excel e LibreOffice antes de uso real.
- Repositório ainda público: NÃO importar a base funcional até torná-lo privado e revalidar permissões.
- Não houve deploy, merge, cobrança, nem processamento de dados reais.

## Próximo passo
Revisar o PR, tornar o repositório privado, recuperar a base funcional com autorização e integrar a rotina aos pontos reais de exportação; executar testes de interface e regressão antes de qualquer merge.
