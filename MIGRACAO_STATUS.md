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
- [x] Núcleo de cálculo reutilizado opcionalmente pelo sistema de Orçamentos
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
- [x] BDI separado por cliente e prazo
- [x] Fórmula `Preço = Custo / (1 - soma dos percentuais)` preservada
- [x] Juros compostos por prazo preservados
- [x] Mão de Obra — Cliente + Profissional + Tipo de Hora
- [x] Multiplicadores Normal / 50% / 100% / 120%
- [x] HH, resumo por profissional e detalhamento de equipe
- [x] Horas Viajadas — Origem/Destino, ida/volta, dias, pessoas e regra de pagamento
- [x] KM e número de viagens disponibilizados para Despesas
- [x] Contrato da API `/api/calculate-route` preservado
- [ ] Backend privado da rota com OpenRouteService
- [x] Despesas — Estadia, Transporte, Almoço, Janta e Café
- [x] Transporte conectado aos dados de Horas Viajadas
- [x] Totais com BDI e sem BDI separados
- [x] Nota Reversa
- [x] ISSQN 5%, INSS 11%, Simples 14% e antecipação conforme código original
- [x] Dedução seletiva dos custos reais sem BDI
- [x] Negociação com desconto percentual ou fixo e recálculo dos impostos
- [x] Resumo Final consolidado
- [x] Histórico local completo com fotografia dos parâmetros usados
- [x] Integração opcional com a Tabela de Preços
- [x] Material só entra no Orçamento após ação explícita e confirmação do cliente/BDI
- [x] Aba Custos HH consulta o núcleo real do Calc HH
- [x] Prévia de custo interno/h por cargo calculada com as configurações atuais do Calc HH
- [x] Aplicação dos custos internos somente após confirmação explícita
- [x] Tarifas comerciais de Mão de Obra não são sobrescritas pela integração de custos internos
- [x] Opção de manter custos manuais sem sincronizar
- [ ] Persistência do Histórico no banco privado
- [ ] Autenticação e usuários
- [ ] Banco remoto / API privada

### Regra crítica de BDI
Não existe um único BDI obrigatório para todos os clientes. A plataforma deve manter perfil e prazo por cliente. Valores default são apenas ponto de partida e não substituem configurações comerciais confirmadas.

### Segurança
O repositório `Nomade-22/dashboard` e o GitHub Pages são públicos. Tarifas comerciais de produção, custos internos HH, base real de materiais, credenciais e chaves não devem ser gravados no código-fonte público. Nesta etapa, as bases operacionais ficam no navegador e podem ser importadas. Na produção, deverão vir de API/banco privado com autenticação.

### Busca de rotas
O sistema original usa OpenRouteService para geocodificar Origem/Destino no Brasil e calcular a rota `driving-car`. `OPENROUTE_API_KEY` deve ficar somente no backend privado.

### Histórico
Nesta etapa o Histórico usa `localStorage`. Cada registro guarda uma fotografia dos estados do orçamento e dos parâmetros BDI/HH usados naquele momento, permitindo reproduzir um cálculo antigo.

### Custos HH
A integração não confunde `CUSTO HH` com `TARIFA HH DE VENDA`. O módulo consulta o mesmo `CalcHHCore` usado pelo Calc HH e calcula o custo interno por hora como `custoTotalMensal / jornada` para cada cargo. Esses valores só são enviados para a base interna da Nota Reversa quando o usuário confirma. Alterar o Calc HH não modifica automaticamente um orçamento.

## 4. Tabela de Preços
- [x] Interface principal migrada mantendo o visual claro do sistema original
- [x] Busca por material
- [x] Filtro por fornecedor
- [x] Filtro por categoria e subcategoria
- [x] Cadastro, edição e exclusão de material
- [x] Quantidade por item e valor total do orçamento
- [x] Salvar, carregar e excluir orçamentos próprios da Tabela de Preços
- [x] Importação Excel/XLSX, CSV e JSON
- [x] Importação preserva preços numéricos e casas decimais do Excel
- [x] Exportação Excel
- [x] Exclusão geral com dupla confirmação
- [x] Integração opcional `Adicionar ao orçamento`
- [x] `Apenas consultar / fechar` não altera o Orçamento
- [x] Cliente é obrigatório antes de enviar material, evitando BDI incorreto
- [x] Quantidade e preço de referência usados ficam registrados no item enviado
- [ ] Conexão com banco remoto original
- [ ] Categorias/subcategorias carregadas pelo backend privado
- [ ] API pública/privada do sistema original

### Integração Tabela de Preços → Orçamentos
Consultar, pesquisar, filtrar ou selecionar material nunca altera o Orçamento. O envio acontece somente ao clicar em `Adicionar ao orçamento`, informar quantidade, escolher o cliente e confirmar. O custo da Tabela é enviado como referência; o BDI é aplicado somente no sistema de Orçamentos conforme o cliente escolhido.

## 5. Dashboard sensível
- [ ] Integrar somente após os três sistemas estarem validados e a autenticação estar pronta.
