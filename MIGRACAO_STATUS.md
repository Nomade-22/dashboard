# Plataforma Multprest — status da migração

Branch de trabalho: `plataforma-multprest-v1`  
A branch `main` permanece sem alterações durante a validação.

## 1. Portal principal
- [x] Entrada única da Plataforma Multprest
- [x] Orçamentos, Calc HH e Tabela de Preços
- [x] Dashboard sensível reservado para a etapa final

## 2. Calc HH
- [x] Interface principal migrada
- [x] Calculadora, Tabela de Valores e Custo Fixo
- [x] Fórmulas originais preservadas
- [x] Antecipação, margem de negociação e prova real
- [x] Exportação TXT/CSV
- [x] Núcleo reutilizado opcionalmente pelo Orçamento
- [x] Conexão de leitura com o banco original pela API pública própria do Calc HH
- [x] Tabela de Valores pode usar os valores atuais retornados pelo banco
- [x] Salários-base do banco só são aplicados ao Calc HH após confirmação explícita
- [ ] Escrita remota das configurações — habilitar após autenticação

## 3. Orçamentos
- [x] BDI separado por cliente e prazo
- [x] Fórmula por divisor e juros compostos preservados
- [x] Mão de Obra — Cliente + Profissional + Tipo de Hora
- [x] Normal / 50% / 100% / 120%
- [x] Horas Viajadas, Despesas, Nota Reversa, Negociação e Resumo Final
- [x] Histórico local com fotografia completa do orçamento e parâmetros históricos
- [x] Integração opcional com Tabela de Preços
- [x] Integração opcional com custo interno do Calc HH
- [x] Conexão do Histórico original preparada e verificada em tempo de execução
- [x] Fallback local preservado se a API remota não autorizar acesso cross-origin
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
- [x] Conexão de leitura com o banco real pela API pública própria da Tabela de Preços
- [x] Botão `Atualizar do banco` copia a base atual para o navegador sem expor credenciais
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

**Conclusão da etapa 4:** a camada de dados está conectada sem expor credenciais. A leitura dos dados atuais de Preços e Calc HH pode ser feita diretamente pelos endpoints próprios dos sistemas. O Histórico está preparado para o banco remoto, mas a sincronização compartilhada de escrita será ativada junto com o passo de autenticação, pois não é seguro abrir gravação do banco para um GitHub Pages público.

## Próximos passos restantes
1. Validação comparativa dos cálculos e navegação
2. Backend privado da busca de rotas
3. Login/autenticação e liberação das escritas remotas
5. Integração do Dashboard sensível por último

## Segurança
O repositório `Nomade-22/dashboard` e o GitHub Pages são públicos. Credenciais, tarifas confidenciais, custos internos, dumps SQL e chaves de API permanecem fora do código público. O Dashboard sensível só será integrado depois da autenticação.
