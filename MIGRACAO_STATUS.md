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
- [x] Despesas — Estadia, Transporte, Almoço, Janta e Café
- [x] BDI da despesa calculado pelo cliente selecionado
- [x] Transporte conectado ao KM total e nº de viagens de Horas Viajadas
- [x] Transporte permite dados automáticos ou KM/viagens manuais
- [x] Fórmula original do transporte preservada: `(KM × R$/km + pedágio) × viagens`
- [x] Totais com BDI e totais sem BDI separados para cálculos posteriores
- [x] Nota Reversa
- [x] ISSQN 5%, INSS 11% e Simples 14% conforme código original da Nota Reversa
- [x] Antecipação calculada sobre o líquido após os demais impostos
- [x] Dedução seletiva dos custos reais sem BDI
- [x] Mão de Obra e Horas Viajadas usam custo interno HH, não tarifa de venda
- [x] Custos internos HH mantidos fora do GitHub público e importáveis localmente
- [x] Valor líquido final, % descontos e lucro preservados
- [x] Negociação
- [x] Puxar valores e composição da Nota Reversa
- [x] Desconto por porcentagem ou valor fixo
- [x] Botões rápidos 5%, 10%, 15%, 20%, 25% e 30%
- [x] Recalcular impostos sobre o novo valor bruto após desconto
- [x] Recalcular antecipação sobre o novo líquido após impostos
- [x] Manter custos reais deduzidos durante a negociação
- [x] Mostrar lucro/prejuízo, margem final, perda de lucro e % do lucro perdido
- [x] Resumo Final
- [x] Preço Final Total consolidado conforme Dashboard original
- [x] Lucro Final e percentual vindos da Nota Reversa
- [x] Cards de Mão de Obra, Material, Despesas de Viagem, Estadia, Transporte, Alimentação e Horas Viajadas
- [x] Detalhamento completo e subtotal de alimentação
- [x] Distribuição percentual de custos preservada
- [x] Histórico local de Orçamentos
- [x] Salvar e atualizar orçamento com número, cliente, descrição, status e observações
- [x] Fotografia completa dos itens do orçamento
- [x] Fotografia dos parâmetros históricos BDI/HH para reproduzir cálculo antigo
- [x] Abrir/restaurar orçamento salvo
- [x] Opção de restaurar ou manter os parâmetros atuais ao abrir um histórico
- [x] Novo orçamento preservando configurações globais
- [x] Busca, duplicação, exclusão e exportação JSON
- [x] Importação de histórico JSON
- [ ] Persistência do Histórico no banco privado
- [ ] Tabela de Preços interna
- [ ] Custos HH integrados
- [ ] Autenticação e usuários
- [ ] Banco remoto / API privada

### Regra crítica de BDI
Não existe um único BDI obrigatório para todos os clientes. A plataforma deve manter perfil e prazo por cliente. Valores default são apenas ponto de partida e não substituem configurações comerciais confirmadas.

### Segurança da tabela de Mão de Obra e custos internos
O repositório `Nomade-22/dashboard` e o GitHub Pages são públicos. Por isso, tarifas comerciais de produção, custos internos HH, credenciais e chaves não devem ser gravados no código-fonte público. Nesta etapa, essas bases ficam no navegador do usuário (`localStorage`) e podem ser importadas por arquivos privados. Na etapa de produção, deverão vir de API/banco privado com autenticação.

### Busca de rotas
O sistema original usa OpenRouteService: geocodifica Origem e Destino limitando a busca ao Brasil e depois calcula a rota `driving-car`. A chave `OPENROUTE_API_KEY` deve permanecer apenas no backend privado. Nunca inserir essa chave em `config.js`, `viagens.js` ou qualquer arquivo do GitHub Pages. A interface está pronta para consumir o mesmo retorno do endpoint original: endereço resolvido, distância em km e duração em minutos.

### Despesas
A lógica segue o código original. Estadia/Alimentação usam custo unitário por pessoa por dia e aplicam BDI do cliente. Transporte utiliza `useKm = KM manual ou totalKm de Horas Viajadas`, `useViagens = viagens manuais ou totalViagens`, `R$/km = combustível ÷ km/l` e `base = (useKm × R$/km + pedágio) × useViagens`, aplicando depois o BDI do cliente. Os valores crus sem BDI são preservados separadamente para Nota Reversa.

### Nota Reversa
A lógica original foi preservada: ISSQN = 5% do bruto quando ativo; INSS = 11%; Simples = 14%; antecipação incide sobre o líquido após esses impostos. Em seguida, somente os custos marcados pelo usuário são deduzidos pelos valores sem BDI. `Valor Líquido Final = líquido após antecipação - custos selecionados`.

### Negociação
A negociação recebe uma fotografia dos valores da Nota Reversa. Ao aplicar desconto percentual ou fixo, o sistema cria o novo valor bruto, recalcula os impostos ativos e a antecipação, mantém os custos selecionados e calcula o lucro final. Também mostra o impacto do desconto e alerta se a proposta passa a gerar prejuízo.

### Resumo Final
Mantém a consolidação do `Dashboard.tsx` original: `Preço Final Total = Mão de Obra + Material + Estadia + Transporte + Almoço + Janta + Café + Horas Viajadas`. `Despesas de Viagem` é exibido também como subtotal visual, sem ser somado novamente no total geral. O Lucro Final continua sendo o resultado da Nota Reversa, como no sistema original.

### Histórico
Nesta etapa o Histórico usa `localStorage`, pois ainda não há autenticação/API privada na plataforma consolidada. Cada registro guarda uma fotografia dos estados do orçamento e, separadamente, dos parâmetros BDI, tarifas HH e custos internos usados naquele momento. Ao abrir um registro antigo, o usuário pode restaurar também esses parâmetros para reproduzir o cálculo histórico. Esses dados não são gravados no código público do GitHub.

## 4. Tabela de Preços
- [ ] Migração ainda não iniciada

## 5. Dashboard sensível
- [ ] Integrar somente após os três sistemas estarem validados e a autenticação estar pronta.
