# Plataforma Multprest — status da migração

Branch de trabalho: `plataforma-multprest-v1`  
A branch `main` permanece sem alterações durante a validação.

## Portal principal
- [x] Entrada única da Plataforma Multprest
- [x] Orçamentos
- [x] Calc HH
- [x] Tabela de Preços
- [x] Adequações Civis / Dashboard sensível
- [x] Login administrativo único ligado ao portal

## Calc HH
- [x] Interface e três abas migradas
- [x] Fórmulas originais validadas numericamente
- [x] Leitura segura do banco original
- [x] Barra autenticada `Salvar no banco / Carregar do banco`
- [x] Snapshot remoto criptografado do estado `multprest_calc_hh_*`

## Orçamentos
- [x] BDI por cliente e prazo
- [x] Mão de Obra — Cliente + Profissional + Tipo de Hora
- [x] Horas Viajadas e gateway Origem → Destino
- [x] Despesas, Nota Reversa, Negociação, Resumo e Histórico
- [x] Integrações opcionais com Tabela de Preços e Calc HH
- [x] Barra autenticada `Salvar no banco / Carregar do banco`
- [x] Snapshot remoto criptografado do estado `multprest_orc_*`

## Tabela de Preços
- [x] Interface, busca, filtros, cadastro local e orçamentos próprios
- [x] Leitura do banco original e sincronização paginada
- [x] `Adicionar ao orçamento` continua opcional
- [x] Barra autenticada `Salvar no banco / Carregar do banco`
- [x] Snapshot remoto criptografado do estado `multprest_prices_*`

## Adequações Civis
- [x] Dashboard, Lançamentos, OFs, Fornecedores e Configurações
- [x] Mesmas chaves históricas `adq_civis_*`
- [x] Nenhuma OF, fornecedor, lançamento ou credencial no código público
- [x] Barra autenticada `Salvar no banco / Carregar do banco`
- [x] Snapshot remoto criptografado do estado `adq_civis_*`

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
- [ ] Smoke test final no domínio oficial após publicação da branch

## Etapa 3 — Login / Autenticação / Escrita remota
- [x] Página `login/` criada
- [x] Login administrativo único para os quatro módulos
- [x] Senha não é enviada em texto ao gateway
- [x] PBKDF2-SHA256 com 310.000 iterações para derivação da chave
- [x] Sessão guardada somente em `sessionStorage` da aba
- [x] Logout remove a chave de sessão
- [x] Gateway valida a chave derivada antes de ler/gravar
- [x] Estados são criptografados com AES-256-GCM antes da persistência remota
- [x] O backend original recebe somente ciphertext, nunca os dados empresariais em texto
- [x] Escopos separados: `orcamentos`, `calc-hh`, `precos`, `adequacoes`
- [x] CORS de autenticação restrito ao domínio oficial do GitHub Pages
- [x] Deploy de produção do gateway solicitado no Vercel (`dpl_9bNZCMiwigBeU5RMQqShpgndeSGQ`)
- [x] Vetor local de autenticação validado contra o verificador publicado
- [ ] Smoke test final de Login + Salvar + Carregar no domínio oficial após publicação da branch

### Observação sobre o Neon
O projeto privado `plataforma-multprest` continua reservado para a consolidação futura. Durante esta etapa, o conector Neon apresentou incompatibilidade interna nas operações SQL/provisionamento (`projectId` x `project_id`). Para não expor credenciais nem forçar alterações no banco, a escrita autenticada foi implementada por snapshots criptografados através do gateway. Os bancos originais continuam preservados.

## Etapa 4 — Bancos privados
- [x] Dumps mantidos fora do GitHub público
- [x] Projeto Neon separado `plataforma-multprest` criado
- [x] Banco do dashboard antigo não foi alterado
- [x] Leituras de Calc HH e Preços ligadas aos backends originais
- [x] Nenhuma senha, token, `DATABASE_URL` ou dump foi publicado

## Etapa 5 — Dashboard sensível
- [x] Adequações Civis integrado como Sistema 04
- [x] Fórmulas do dashboard antigo preservadas
- [x] Valores sensíveis não foram copiados para o novo módulo
- [x] CSV e impressão/PDF mantidos
- [x] Escrita compartilhada agora disponível pela camada autenticada/criptografada da Plataforma Multprest

## Segurança
O repositório `Nomade-22/dashboard` e o GitHub Pages são públicos. A autenticação controla o acesso à aplicação e às gravações remotas, mas não transforma o código-fonte do repositório em privado. Dados empresariais enviados ao armazenamento remoto são criptografados; credenciais, dumps e chaves privadas continuam fora do GitHub.

## Situação atual
As etapas 1, 2, 3, 4 e 5 estão implementadas na branch de trabalho. Antes de alterar a `main`, falta publicar/servir a nova branch para executar os smoke tests finais de rota, login e sincronização.
