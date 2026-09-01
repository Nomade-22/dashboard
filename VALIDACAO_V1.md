# Validação V1 — Plataforma Multprest

Data: 01/09/2026  
Branch validada: `plataforma-multprest-v1`  
A branch `main` não foi alterada.

## Objetivo
Comparar a migração com os códigos-fonte originais dos três sistemas e confirmar que as fórmulas e fluxos principais continuam equivalentes antes de autenticação, backend de rotas e publicação definitiva.

## Resultado geral
**APROVADO PARA CONTINUAR A IMPLANTAÇÃO.**

Foram executados 31 testes numéricos de referência e todos passaram após as correções encontradas durante esta rodada. A navegação principal Portal → Orçamentos / Calc HH / Tabela de Preços também foi conferida.

## Calc HH — validado
- Base de encargos, férias, 1/3, 13º, FGTS, INSS patronal e provisão de rescisão conferidos.
- Rateio de custo operacional, seguro e treinamentos conferido.
- Formação do preço por divisor de impostos conferida.
- Antecipação de `0,1% ao dia` preservada conforme o sistema original.
- Margem de negociação por divisor preservada.
- Prova real preservada.
- Valores de referência: base de encargos R$ 2.924,00; custo mensal aproximadamente R$ 9.115,00; preço final aproximadamente R$ 16.829,29; preço com 120 dias aproximadamente R$ 20.286,77; hora com margem aproximadamente R$ 104,79.
- Correção aplicada na validação: fallback de Serralheiro e Soldador voltou para R$ 3.000,00, como no código original. Dados já salvos ou vindos do banco continuam tendo prioridade.

## Orçamentos — BDI
- Juros financeiros compostos conferidos: `((1 + jurosDia/100)^dias - 1) × 100`.
- Formação do preço preservada: `Preço = Custo / (1 - somaPercentuais)`.
- Perfil continua separado por cliente/orçamento.
- Nenhum BDI universal foi imposto.

Teste de referência com custo de R$ 1.000,00 e parâmetros-base de 120 dias: financeiro ≈ 12,7429%, preço ≈ R$ 2.836,31.

## Mão de Obra
- Fórmula validada: `tarifa × multiplicador × horas × pessoas × dias`.
- HH validado: `horas × pessoas × dias`.
- Normal / 50% / 100% / 120% preservados.
- Correção aplicada: equipe padrão do sistema original é 9; a migração agora usa 9 quando não existe configuração salva.

Teste de referência: R$ 100/h, hora 50%, 8,8 h, 3 pessoas e 2 dias = 52,8 HH e R$ 7.920,00.

## Horas Viajadas
- Horas manuais têm prioridade quando preenchidas; caso contrário usa duração da rota.
- Ida/Volta dobra tempo e distância.
- Dias multiplicam o trecho conforme o original.
- Regra `Pagar todos / Limite de horas` conferida.
- Pessoa-horas e custo por Cliente + Profissional + Tipo de Hora conferidos.

Teste de referência: trecho 180 km / 210 min, Ida/Volta, 2 dias, 3 pessoas, tarifa R$ 100 e hora 50% = 720 km, 14 h de deslocamento, 42 pessoa-horas e R$ 6.300,00. Com limite de 10 h, o trecho não é pago.

**Limitação atual esperada:** a busca real Origem → Destino depende do backend privado de rotas, que pertence ao passo 2 e ainda não foi ativado.

## Despesas — correção importante da validação
A primeira migração estava simplificada demais. O código original foi reanalisado e o módulo foi corrigido para preservar:
- múltiplos itens de Estadia;
- múltiplos itens de Transporte;
- múltiplos itens de Almoço, Janta e Café;
- adicionar/remover/zerar itens;
- veículos Gol, Montana e Kombi;
- BDI individual por cliente;
- KM e viagens automáticos vindos de Horas Viajadas;
- KM/viagens manuais substituindo os automáticos quando maiores que zero;
- botão para puxar equipe/dias de Mão de Obra para o primeiro item de Estadia/Refeição, como no original;
- totais de venda com BDI e custos crus sem BDI separados para Nota Reversa.

Fórmula de Transporte validada: `(KM × (R$/litro ÷ km/l) + pedágio) × viagens`.
Teste: 720 km, 2 viagens, combustível R$ 6/l, 10 km/l e pedágio R$ 50 = base R$ 964,00.

## Nota Reversa
- ISSQN 5%, INSS 11% e Simples 14% sobre o bruto conferidos.
- Antecipação incide sobre o líquido após impostos.
- Custos selecionados são deduzidos sem BDI.
- Custo HH interno continua separado de tarifa comercial de venda.

Teste: bruto R$ 10.000,00, três impostos ativos, antecipação 5% e R$ 2.500,00 de custos = líquido final R$ 4.150,00, descontos 58,5%, resultado 41,5% do bruto.

## Negociação
- Desconto percentual ou fixo conferido.
- Impostos são recalculados sobre o novo bruto.
- Antecipação é recalculada sobre o novo líquido.
- Custos reais permanecem deduzidos.
- Correção aplicada: removida uma proteção introduzida na migração que zerava valores negativos; o código voltou ao comportamento matemático original.

Teste com 10% de desconto sobre R$ 10.000,00, impostos ativos, antecipação 5% e R$ 2.500,00 de custos: novo bruto R$ 9.000,00, novo líquido R$ 5.985,00 e lucro R$ 3.485,00.

## Resumo Final
Consolidação conferida:
`Mão de Obra + Material + Estadia + Transporte + Almoço + Janta + Café + Horas Viajadas`.

`Despesas de Viagem` continua sendo subtotal visual e não é somado novamente.

Teste combinado de referência = R$ 18.309,00.

## Histórico
O código original usa API autenticada para listar, salvar, abrir, excluir e marcar orçamento como fechado. A versão consolidada mantém a fotografia completa local e restauração dos estados enquanto o login não está pronto.

A estrutura foi validada para não perder os itens e parâmetros históricos. A persistência compartilhada continua bloqueada de propósito até o passo 3 (autenticação), portanto essa diferença é uma limitação de segurança planejada, não uma divergência de cálculo.

## Tabela de Preços
- Busca, fornecedor, categoria, subcategoria, quantidade e total conferidos.
- Importação/exportação e orçamentos próprios mantidos.
- Integração com Orçamento continua 100% opcional.
- Correção aplicada: a API original limita cada página a 500 registros e o dump de produção possui mais de 1.000 materiais. A sincronização agora pagina até carregar toda a base, em vez de parar nos primeiros 500.

## Navegação
Conferido:
- Portal → `orcamentos/`
- Portal → `calc-hh/`
- Portal → `precos/`
- Orçamentos contém as abas Mão de Obra, BDI, Despesas, Viagens, Nota Reversa, Negociação, Resumo Final, Histórico, Tabela de Preços e Custos HH.
- A aba interna Tabela de Preços agora abre a Tabela real; apenas consultar não altera o orçamento.
- Calc HH carrega núcleo, correção de fallback, interface e leitura remota na ordem correta.
- Tabela de Preços carrega interface local e camada de leitura do banco.

## Correções encontradas e aplicadas nesta validação
1. Despesas restauradas para a estrutura multi-item do original.
2. Serralheiro e Soldador do fallback Calc HH corrigidos para R$ 3.000,00.
3. Equipe padrão de Mão de Obra corrigida para 9.
4. Sincronização da Tabela de Preços passou a paginar toda a base (>500 itens).
5. Negociação voltou ao comportamento matemático exato do original em descontos acima do bruto.
6. Aba Tabela de Preços dentro de Orçamentos deixou de ser placeholder e passou a apontar para o módulo real, mantendo integração opcional.

## Itens que não fazem parte desta validação e continuam pendentes
- Passo 2: backend privado OpenRouteService para busca real Origem → Destino.
- Passo 3: login/autenticação e liberação das escritas remotas.
- Passo 5: Dashboard sensível, somente depois da autenticação.

## Segurança
Nenhuma credencial, chave, senha, `DATABASE_URL`, dump SQL, tarifa confidencial ou custo interno foi adicionado ao repositório público durante a validação.
