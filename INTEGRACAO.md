# Plataforma Multprest — Integração

Branch de trabalho: `plataforma-multprest-v1`.

A branch `main` permanece com o dashboard antigo até a nova plataforma estar validada.

## Ordem

1. Portal principal — três sistemas.
2. Calc HH — migrar mantendo interface, abas, fórmulas e regras originais.
3. Sistema de Orçamentos — preservar BDI e condições por cliente.
4. Tabela de Preços — preservar materiais, códigos, categorias e orçamento.
5. Dashboard antigo / dados sensíveis — incorporar somente no final, após revisão de segurança.

## Regras

- Não alterar os cálculos originais durante a migração.
- Não misturar bancos ou configurações entre sistemas sem uma camada explícita de integração.
- Não publicar `.env`, tokens, chaves, senhas ou credenciais no GitHub Pages.
- O dashboard sensível não será copiado para a nova plataforma antes da etapa 5.
- Antes de alterar a `main`, validar a plataforma em branch separada.
