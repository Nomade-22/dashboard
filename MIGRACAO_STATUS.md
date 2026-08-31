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
- [x] Mão de Obra
- [x] Regra `Cliente + Profissional + Tipo de Hora = tarifa` preservada
- [x] Multiplicadores Normal / 50% / 100% / 120% preservados
- [x] Fórmula de venda `tarifa × multiplicador × horas × pessoas × dias` preservada
- [x] HH, resumo por profissional e detalhamento de equipe implementados
- [x] Tabela HH editável com importação/exportação local
- [x] Horas Viajadas — interface e cálculos migrados
- [x] Origem e Destino por cidade/estado preservados
- [x] Ida / Ida e Volta preservados
- [x] Horas automáticas ou manuais preservadas
- [x] Regra `Pagar todos / Limite de horas` preservada
- [x] Distância total, tempo total, tempo pago, pessoa-horas e custo preservados
- [x] KM total e número de viagens disponibilizados para a aba Despesas
- [x] Contrato da API `/api/calculate-route` preservado
- [ ] Backend privado da rota com OpenRouteService
- [ ] Despesas
- [ ] Nota Reversa
- [ ] Negociação
- [ ] Resumo Final
- [ ] Histórico
- [ ] Tabela de Preços interna
- [ ] Custos HH integrados
- [ ] Autenticação e usuários
- [ ] Banco remoto / API privada

### Regra crítica de BDI
Não existe um único BDI obrigatório para todos os clientes. A plataforma deve manter perfil e prazo por cliente. Valores default são apenas ponto de partida e não substituem configurações comerciais confirmadas.

### Segurança da tabela de Mão de Obra
O repositório `Nomade-22/dashboard` e o GitHub Pages são públicos. Por isso, as tarifas comerciais de produção não devem ser gravadas no código-fonte público. Nesta etapa, a tabela de HH fica no navegador do usuário (`localStorage`) e pode ser importada por CSV/JSON. Na etapa de produção, a base real deverá vir de uma API/banco privado com autenticação.

### Busca de rotas
O sistema original usa OpenRouteService: geocodifica Origem e Destino limitando a busca ao Brasil e depois calcula a rota `driving-car`. A chave `OPENROUTE_API_KEY` deve permanecer apenas no backend privado. Nunca inserir essa chave em `config.js`, `viagens.js` ou qualquer arquivo do GitHub Pages. A interface está pronta para consumir o mesmo retorno do endpoint original: endereço resolvido, distância em km e duração em minutos.

## 4. Tabela de Preços
- [ ] Migração ainda não iniciada

## 5. Dashboard sensível
- [ ] Integrar somente após os três sistemas estarem validados e a autenticação estar pronta.
