# Plataforma Multprest — status da migração

Branch de trabalho: `plataforma-multprest-v1`

A branch `main` permanece sem alterações durante a validação.

## 1. Portal principal
- [x] Entrada única da Plataforma Multprest
- [x] Três sistemas principais: Orçamentos, Calc HH e Tabela de Preços
- [x] Dashboard sensível reservado para a etapa final

## 2. Calc HH
- [x] Interface principal migrada
- [x] Abas Calculadora, Tabela de Valores e Custo Fixo
- [x] Fórmula de encargos preservada
- [x] Formação do preço final preservada
- [x] Antecipação de 0,1% ao dia preservada
- [x] Margem de negociação preservada
- [x] Prova real do lucro preservada
- [x] Cargos e salários atuais da base incluídos
- [x] Empresas e prazos da base incluídos
- [x] Exportação TXT/CSV
- [ ] Conexão com banco remoto (depois da validação da versão estática)

### Teste de referência Calc HH
Com os parâmetros padrão migrados, a fórmula deve retornar aproximadamente:
- Base de encargos: R$ 2.924,00
- Total de encargos: R$ 1.239,13
- Custo total mensal: R$ 9.115,00
- Preço final sem antecipação: R$ 16.829,29
- Preço final com 120 dias: R$ 20.286,77
- Valor hora sem antecipação: R$ 76,50
- Valor hora com antecipação: R$ 92,21
- Valor hora com margem de negociação: R$ 104,79
- Prova real: deve conferir com o lucro esperado

## 3. Orçamentos
- [x] Estrutura das abas originais criada
- [x] Módulo BDI iniciado
- [x] Clientes e prazos atuais da base migrados
- [x] Perfil BDI separado por cliente
- [x] Material pode utilizar o perfil do próprio cliente
- [x] Fórmula `Preço = Custo / (1 - soma dos percentuais)` preservada
- [x] Juros compostos por prazo preservados
- [ ] Mão de Obra
- [ ] Despesas
- [ ] Viagens
- [ ] Nota Reversa
- [ ] Negociação
- [ ] Resumo Final
- [ ] Histórico
- [ ] Tabela de Preços interna
- [ ] Custos HH integrados
- [ ] Autenticação e usuários
- [ ] Banco remoto

### Regra crítica de BDI
Não existe um único BDI obrigatório para todos os clientes. A plataforma deve manter perfil e prazo por cliente. Valores default são apenas ponto de partida e não substituem configurações comerciais confirmadas.

## 4. Tabela de Preços
- [ ] Migração ainda não iniciada

## 5. Dashboard sensível
- [ ] Integrar somente após os três sistemas estarem validados e a autenticação estar pronta.
