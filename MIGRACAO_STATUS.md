# Plataforma Multprest — status da migração

Branch de trabalho: `plataforma-multprest-v1`  
A branch `main` permanece sem alterações durante a validação.

## Portal principal
- [x] Entrada única da Plataforma Multprest
- [x] Orçamentos
- [x] Calc HH
- [x] Tabela de Preços
- [x] Adequações Civis / Dashboard sensível
- [x] Navegação por hash para os quatro sistemas

## Calc HH
- [x] Interface e três abas migradas
- [x] Fórmulas originais validadas numericamente
- [x] Antecipação, margem e prova real preservadas
- [x] Leitura segura do banco original
- [ ] Escrita remota — depende do Login/Autenticação

## Orçamentos
- [x] BDI por cliente e prazo
- [x] Mão de Obra — Cliente + Profissional + Tipo de Hora
- [x] Horas Viajadas
- [x] Despesas multi-item
- [x] Nota Reversa
- [x] Negociação
- [x] Resumo Final
- [x] Histórico local
- [x] Integração opcional com Tabela de Preços
- [x] Integração opcional com Calc HH
- [x] Gateway Origem → Destino configurado
- [ ] Histórico compartilhado — depende do Login/Autenticação

## Tabela de Preços
- [x] Interface, busca, filtros, cadastro local e orçamentos próprios
- [x] Importação/exportação
- [x] Leitura segura do banco original
- [x] Sincronização paginada de toda a base
- [x] `Adicionar ao orçamento` continua opcional
- [ ] Escrita remota — depende do Login/Autenticação

## Etapa 1 — Validação
- [x] 31 testes numéricos de referência aprovados
- [x] Navegação e cálculos principais conferidos
- [x] Relatório `VALIDACAO_V1.md`

## Etapa 2 — Rotas
- [x] Endpoint original reanalisado
- [x] Chave OpenRouteService permanece no backend
- [x] Gateway Vercel criado
- [x] CORS restrito a `https://nomade-22.github.io`
- [x] `orcamentos/config.js` aponta para o gateway
- [ ] Smoke test final — executar quando a nova plataforma estiver servida no domínio oficial

## Etapa 4 — Bancos privados
- [x] Dumps mantidos fora do GitHub público
- [x] Projeto Neon separado `plataforma-multprest` criado
- [x] Banco do dashboard antigo não foi alterado
- [x] Leituras de Calc HH e Preços ligadas aos backends originais
- [x] Nenhuma senha, token, `DATABASE_URL` ou dump foi publicado

## Etapa 5 — Dashboard sensível / Adequações Civis
- [x] Módulo `adequacoes/` integrado ao portal como Sistema 04
- [x] Dashboard, Lançamentos, OFs, Fornecedores e Configurações locais
- [x] Fórmulas do dashboard antigo preservadas: dia útil/sábado/domingo, mão de obra, almoço, materiais, translado, total, orçamento e saldo
- [x] Mesmas chaves de `localStorage` do dashboard antigo preservadas para reaproveitar os dados existentes no mesmo navegador
- [x] Nenhuma OF, lançamento, fornecedor ou credencial foi copiado para o código público
- [x] Valores de fallback de Profissional/Ajudante/Almoço zerados no código novo
- [x] CSV e impressão/PDF mantidos
- [x] Google Sheets remoto bloqueado nesta fase
- [ ] Reativar Google Sheets/banco compartilhado somente após Login/Autenticação

**Conclusão da etapa 5:** o Dashboard sensível está integrado em modo local seguro. Ele pode reutilizar os dados já existentes no navegador porque mantém as chaves históricas, mas dados compartilhados e credenciais continuam bloqueados até a autenticação.

## Próximo passo funcional restante
3. Login/Autenticação e liberação das escritas remotas.

## Segurança
O repositório `Nomade-22/dashboard` e o GitHub Pages são públicos. Dados empresariais, tarifas confidenciais, custos internos, dumps, tokens e chaves permanecem fora do código público. A `main` só deve ser alterada depois da validação e da proteção por autenticação.
