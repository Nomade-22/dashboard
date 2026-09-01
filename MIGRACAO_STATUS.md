# Plataforma Multprest — status da migração

Branch de trabalho: `plataforma-multprest-v1`  
A branch `main` permanece sem alterações durante a validação.

## 1. Portal principal
- [x] Entrada única da Plataforma Multprest
- [x] Orçamentos, Calc HH e Tabela de Preços
- [x] Navegação principal conferida
- [x] Dashboard sensível reservado para a etapa final

## 2. Calc HH
- [x] Interface principal migrada
- [x] Calculadora, Tabela de Valores e Custo Fixo
- [x] Fórmulas originais preservadas e validadas numericamente
- [x] Antecipação, margem de negociação e prova real
- [x] Exportação TXT/CSV
- [x] Núcleo reutilizado opcionalmente pelo Orçamento
- [x] Conexão de leitura com o banco original pela API própria do Calc HH
- [x] Tabela de Valores pode usar os valores atuais retornados pelo banco
- [x] Salários-base do banco só são aplicados ao Calc HH após confirmação explícita
- [x] Fallback Serralheiro/Soldador alinhado ao original (R$ 3.000,00)
- [ ] Escrita remota das configurações — habilitar após autenticação

## 3. Orçamentos
- [x] BDI separado por cliente e prazo
- [x] Fórmula por divisor e juros compostos preservados e validados
- [x] Mão de Obra — Cliente + Profissional + Tipo de Hora
- [x] Normal / 50% / 100% / 120%
- [x] Equipe padrão alinhada ao original: 9 quando não existe configuração salva
- [x] Horas Viajadas validadas: ida/volta, dias, pessoas, limite de horas e custo
- [x] Despesas corrigidas e validadas contra o original: múltiplos itens, veículos, BDI por cliente, KM/viagens automáticos ou manuais e sincronização com Mão de Obra
- [x] Nota Reversa validada numericamente
- [x] Negociação validada e alinhada ao comportamento matemático original
- [x] Resumo Final validado e sem dupla soma de Despesas de Viagem
- [x] Histórico local com fotografia completa do orçamento e parâmetros históricos
- [x] Integração opcional com Tabela de Preços
- [x] Aba interna Tabela de Preços aponta para o módulo real e não puxa itens automaticamente
- [x] Integração opcional com custo interno do Calc HH
- [x] Conexão do Histórico original preparada com fallback local
- [ ] Persistência compartilhada do Histórico — liberar somente através do login/gateway autenticado
- [ ] Backend privado de rotas OpenRouteService
- [ ] Autenticação e usuários

### Regra crítica de BDI
Não existe um BDI único para todos os clientes. Perfil, prazo e condições comerciais continuam específicos por cliente/orçamento. Valores default são apenas ponto de partida.

### Custo HH x tarifa de venda
`CUSTO HH INTERNO` continua separado de `TARIFA HH DE VENDA`. Sincronizar custos do Calc HH não altera automaticamente a tabela comercial Cliente + Profissional + Tipo de Hora.

## 4. Tabela de Preços
- [x] Interface principal migrada
- [x] Busca, fornecedor, categoria e subcategoria
- [x] Cadastro/edição/exclusão local para a fase de teste
- [x] Quantidade e total
- [x] Orçamentos próprios
- [x] Importação Excel/XLSX, CSV e JSON
- [x] Exportação Excel
- [x] Integração opcional `Adicionar ao orçamento`
- [x] Cliente obrigatório antes do envio ao Orçamento
- [x] Conexão de leitura com o banco real pela API própria da Tabela de Preços
- [x] Botão `Atualizar do banco` copia a base atual para o navegador sem expor credenciais
- [x] Sincronização paginada para carregar toda a base, não apenas os primeiros 500 registros
- [x] Categorias, subcategorias, fornecedor, unidade e preço vêm do banco original
- [ ] Escrita remota de materiais/orçamentos — habilitar após autenticação

### Integração Tabela de Preços → Orçamentos
Consultar ou atualizar a Tabela não altera o Orçamento. O material só é enviado após `Adicionar ao orçamento`, quantidade, cliente e confirmação. O preço da Tabela é custo/referência; o BDI continua sendo calculado no Orçamento conforme o cliente.

## Etapa 4 — Bancos privados
- [x] Dumps de produção dos três sistemas conferidos e mantidos fora do GitHub público
- [x] Projeto Neon separado `plataforma-multprest` criado para futura consolidação/staging
- [x] Banco do dashboard sensível original não foi alterado
- [x] Tabela de Preços ligada ao backend/banco original em leitura segura
- [x] Calc HH ligado ao backend/banco original em leitura segura
- [x] Histórico original configurado como fonte remota, com fallback local
- [x] Nenhuma `DATABASE_URL`, senha, token ou dump SQL foi publicado no GitHub
- [x] Escritas sensíveis ficaram deliberadamente bloqueadas até existir autenticação

## Etapa 1 — Validação comparativa
- [x] Códigos originais dos três ZIPs comparados com a migração
- [x] 31 testes numéricos de referência executados e aprovados
- [x] Calc HH validado
- [x] BDI validado
- [x] Mão de Obra validada
- [x] Horas Viajadas validadas
- [x] Despesas validadas após correção multi-item
- [x] Nota Reversa validada
- [x] Negociação validada
- [x] Resumo Final validado
- [x] Tabela de Preços validada, inclusive paginação da base
- [x] Navegação entre os três sistemas e abas principais conferida
- [x] Relatório detalhado disponível em `VALIDACAO_V1.md`

**Conclusão da etapa 1:** aprovada para continuar a implantação. As limitações restantes são deliberadas: busca real de rotas pertence ao passo 2; gravações compartilhadas dependem do passo 3 (autenticação); Dashboard sensível continua reservado para o passo 5.

## Próximos passos restantes
2. Backend privado da busca de rotas Origem → Destino
3. Login/autenticação e liberação das escritas remotas
5. Integração do Dashboard sensível por último

## Segurança
O repositório `Nomade-22/dashboard` e o GitHub Pages são públicos. Credenciais, tarifas confidenciais, custos internos, dumps SQL e chaves de API permanecem fora do código público. O Dashboard sensível só será integrado depois da autenticação.
