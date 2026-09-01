# Regra de integração — Tabela de Preços x Orçamentos

A integração entre os dois sistemas deve ser sempre opcional.

## Princípios
- A Tabela de Preços continua funcionando como sistema independente.
- Consultar, cadastrar, editar ou pesquisar um material NÃO deve alterar o Orçamento automaticamente.
- Nenhum material deve ser puxado para o Orçamento ao abrir a Tabela de Preços, pesquisar, filtrar ou selecionar um item.
- O envio para o Orçamento só acontece após uma ação explícita do usuário.

## Fluxo previsto
1. Usuário pesquisa ou localiza um material na Tabela de Preços.
2. Pode apenas consultar o item e continuar usando a Tabela de Preços normalmente.
3. Se quiser usar o item no orçamento, clica em **Adicionar ao orçamento**.
4. Antes de confirmar, o sistema mostra os dados que serão enviados: código, descrição, unidade, preço de referência, quantidade e cliente/perfil BDI do orçamento quando aplicável.
5. Somente após confirmação o item é inserido na lista de materiais do Orçamento.

## Opções obrigatórias
- **Adicionar ao orçamento** — copia explicitamente o item selecionado.
- **Apenas consultar / fechar** — não altera nada no orçamento.
- A quantidade pode ser informada no momento da inclusão.
- O preço de referência vindo da Tabela pode ser editado no Orçamento sem modificar automaticamente o cadastro original.

## Regra de preço e BDI
A Tabela de Preços fornece o custo/preço de referência do material. O BDI pertence ao sistema de Orçamentos e deve ser calculado conforme o cliente/orçamento selecionado. Nunca gravar no cadastro do material um BDI de cliente como se fosse preço universal.

## Rastreabilidade
Quando um material for adicionado pela integração, o Orçamento deve guardar, quando disponível:
- id/código do material;
- descrição;
- unidade;
- preço de referência usado;
- fonte/data do preço;
- identificação de que o item veio da Tabela de Preços.

O usuário também continua podendo cadastrar um material manualmente no Orçamento sem usar a Tabela de Preços.
