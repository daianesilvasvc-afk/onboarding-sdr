# Trilha de Onboarding (Comercial, Farmer e Eventos)

> Documento de passagem — atualizado em 25/11/2026.

## Para que serve

Curso de entrada de quem chega ao time: aulas em sequência (vídeos, leituras, quizzes) que só destravam depois que a anterior foi concluída. São três trilhas no mesmo endereço, trocadas por abas: **Comercial** (Executivo de Vendas), **Farmer** (Revenue) e **Eventos** (quem vende Summit, Podium pelo Brasil e Cash Experience). Quem usa é cada pessoa nova nas primeiras semanas; a gestão acompanha quem fez o quê pelo modo `?gestao`. Em 25/11/2026 havia 15 pessoas registradas.

## Onde está

| O quê | Endereço | Hospedagem | Conta | Banco |
|---|---|---|---|---|
| Trilha | https://podium-educacao-salesops.github.io/onboarding-sdr/ | GitHub Pages (branch `main`, raiz) | GitHub `podium-educacao-salesops` | — |
| Modo gestão | https://podium-educacao-salesops.github.io/onboarding-sdr/?gestao | idem | idem | — |
| Scripts de eventos | https://podium-educacao-salesops.github.io/onboarding-sdr/scripts-eventos.html | idem | idem | — |
| Playbook Operacional | https://podium-educacao-salesops.github.io/onboarding-sdr/Playbook_Executivo_de_Vendas.html | idem | idem | — |
| Registro de uso (Worker) | https://onboarding-api.podium-playbook.workers.dev | Cloudflare Workers | Cloudflare `podium-playbook` | D1 `onboarding_trilha_db` |

Repositório: https://github.com/podium-educacao-salesops/onboarding-sdr (o código do Worker está em `api/`).

## Como funciona

```
index.html (estático)                                  Worker onboarding-api            D1 onboarding_trilha_db
 progresso, quiz, vídeos vistos -> localStorage
 cada clique vira evento -> fila local -> POST /eventos  ---------------------------->  tabelas pessoas, eventos
 ?gestao -> painel "Registros de uso" -> GET /pessoas, GET /pessoas/:id
```

- `index.html` — a trilha inteira (HTML, CSS e JS num arquivo, sem build). As aulas estão como dados no próprio arquivo: `STEPS_COMERCIAL`/`GROUPS_COMERCIAL`, `STEPS_FARMER`/`GROUPS_FARMER`, `STEPS_EVENTOS`/`GROUPS_EVENTOS`, registradas em `TRILHAS`.
- `scripts-eventos.html` — os três roteiros de eventos lado a lado (consulta).
- `Playbook_Executivo_de_Vendas.html` — Playbook Operacional do Executivo (HTML autocontido, imagens embutidas). Substituiu o PDF v1 em 05/11/2026.
- `simulacao.html` — só redireciona para a raiz. Não editar achando que é a página.
- `img/` e `video/` — capas e vídeos servidos pelo próprio repositório.
- Conteúdo externo: vídeos no YouTube, Loom e Google Drive; cursos no Skills do painel do CashBarber (`painel.cashbarber.com.br`, atrás de login); links para o Simulador SDR (`daianesilvasvc-afk.github.io/sdr-roleplay/...`), Call Intelligence, Pipedrive e 3C Plus.
- O progresso de cada pessoa fica **no navegador** (`localStorage`). O Worker só recebe o registro de uso para a gestão ver; ele não devolve progresso para a página.

## Rodar no computador

```bash
cd onboarding-sdr
python3 -m http.server 4173
# abrir http://localhost:4173/  e  http://localhost:4173/?gestao
```

Rodando local, a página continua mandando eventos para o Worker publicado. Para apontar para um Worker local: `http://localhost:4173/?api=http://localhost:8787` (o parâmetro `?api=` só vale em localhost). Como rodar o Worker local está na seção do Worker, abaixo.

## Publicar uma alteração

Push na `main` publica. O GitHub Pages reconstrói em cerca de 45 segundos; não há build. Criar branch não publica nada.

Ao avisar que algo foi publicado, mande o link com `?gestao`: no link normal tudo depois da primeira aula abre trancado e a mudança parece não ter entrado.

O Worker é publicado à parte, com `wrangler deploy` (ver abaixo).

## Variáveis de ambiente

Nenhuma. O site é estático e o Worker não usa secret nem variável, só o binding do banco (`DB`, no `api/wrangler.toml`). O endereço do Worker está fixo na constante `API_PADRAO` do `index.html`.

## Rotinas automáticas

Nenhuma. Sem cron nem webhook.

## Regras e cuidados

- **Desbloqueio em sequência** nas três trilhas (decisão da Daiane, out/2026). Desmarcar uma aula zera as posteriores.
- **Progresso é por navegador, não por pessoa.** A mesma pessoa em outro aparelho começa do zero; duas pessoas no mesmo computador dividem o progresso. Para liberar quem trocou de navegador existe o link `?liberar=N` (tabela no `api/README.md`). O registro marca isso como "Liberado pela gestão", não como aula concluída.
- **Mudar o número de aulas de uma trilha apaga o progresso salvo de todo mundo nessa trilha**: `carregarProgresso()` descarta o que tem tamanho diferente do total (vale também para as notas de quiz). Avisar o time antes de incluir ou retirar aula.
- **`aulaAtual` é a única fonte da verdade** da navegação; `moduloAtual` é derivado dela. E `aulaAtual` precisa estar declarado antes do primeiro `carregarProgresso()`, senão a página abre em branco.
- **Quiz é portão**: a aula com quiz só pode ser concluída com a nota mínima. Alternativas são sorteadas a cada tentativa e quem reprova não vê o gabarito. Em aulas com galeria de vídeos, o quiz só aparece depois de todos os vídeos marcados como assistidos.
- **Páginas `referencia: true`** (Links úteis, Consulta rápida) nunca trancam e não contam no progresso.
- **Farmer e Comercial são setores diferentes**: não padronizar uma trilha pela outra, mesmo quando usam o mesmo material.
- O acesso ao CashBarber é criado pela Podium e enviado direto para a pessoa; as calls de referência para assistir são indicadas pelo gestor.
- Capa de vídeo do Loom só existe pela URL com hash que vem do oEmbed; capa do Google Drive nem sempre carrega (a página cai num fundo escuro, sem quebrar). Para saber se um vídeo do Drive abre para o time, testar o `/preview` numa janela anônima.
- **Grafias pendentes de confirmação**: em 25/11/2026 os nomes foram normalizados para Lincohn Agner, Rapha Barber e Deivisson Santos (os materiais traziam Lincoln Wagner, Rafa Barber e Davidson). A Daiane não confirmou.
- O tempo de uso conta só com a aba visível, com teto de 45 minutos por trecho. Exigir foco na janela foi testado e zera o tempo em uso normal.

## Worker `onboarding-api` (registro de uso)

Código em `api/src/index.js`, schema em `api/schema.sql`. Detalhes de operação (incluindo a tabela do `?liberar=N`) em [`api/README.md`](api/README.md).

| Item | Valor |
|---|---|
| Endereço | https://onboarding-api.podium-playbook.workers.dev |
| Conta Cloudflare | `podium-playbook` (subdomínio `podium-playbook`; a mesma do Playbook de Vendas, outra que não a do Simulador SDR) |
| Banco | D1 `onboarding_trilha_db` (id no `api/wrangler.toml`): tabelas `pessoas` e `eventos` |

Rotas:

| Rota | O que faz |
|---|---|
| `POST /eventos` | Grava um lote de eventos de uma pessoa (até 200 por lote, 256 KB). Aceita `text/plain` porque chega por `sendBeacon` ao fechar a aba |
| `GET /pessoas` | Uma linha por pessoa com totais (aulas abertas e concluídas, vídeos, quizzes, segundos). É o que o painel `?gestao` lê |
| `GET /pessoas/:id` | Até 3.000 eventos daquela pessoa, do mais novo para o mais velho |

Tipos de evento aceitos: `entrou`, `aula_abriu`, `aula_concluiu`, `aula_desmarcou`, `video_abriu`, `video_assistido`, `video_desmarcou`, `quiz_tentativa`, `tempo`, `liberado`. Tipo fora da lista é descartado.

Rodar local e publicar (não há `package.json`; o `npx` baixa o wrangler):

```bash
cd api
npx wrangler d1 execute onboarding_trilha_db --local --file=schema.sql
npx wrangler dev                      # http://localhost:8787
npx wrangler login                    # conta podium-playbook
npx wrangler deploy                   # publica; push no GitHub não publica o Worker
```

Cuidados do Worker:

- **Sem senha, por decisão da Daiane (13/11/2026).** Antes de mudar isso, ver o documento de passagem do time.
- **CORS aceita o GitHub Pages da organização (`https://podium-educacao-salesops.github.io`), o endereço antigo e localhost** (constante `ORIGENS`). Se o site mudar de endereço de novo, incluir a origem nova e republicar o Worker antes, senão o painel `?gestao` e a gravação param.
- **Pessoa = id gerado por navegador + nome digitado uma vez** (`podium-onboarding-quem`). Dois aparelhos aparecem como duas pessoas.
- Fila local no navegador (`podium-onboarding-fila`, até 400 eventos), enviada em lote inteiro ou nada: Worker fora do ar não perde nem duplica evento.

## Pendências da passagem

- [x] Repositório transferido para `podium-educacao-salesops` e Worker republicado com a origem nova (25/11/2026).
- [ ] **Antes de mudar o endereço**, incluir a nova origem (`https://<org>.github.io`) em `ORIGENS` no `api/src/index.js` e fazer `wrangler deploy`. Sem isso o painel `?gestao` não carrega, e os envios por `fetch` chegam ao banco mas a página não consegue ler a resposta, trata como falha e reenvia (risco de evento duplicado).
- [ ] Na mudança de endereço do Pages, o `localStorage` não acompanha: **todo mundo perde o progresso, as notas de quiz e o nome salvo**, e reaparece como pessoa nova no registro. Avisar o time e usar `?liberar=N` para quem estava no meio. Não contar com redirecionamento do endereço antigo.
- [ ] Atualizar os links absolutos para `daianesilvasvc-afk.github.io/sdr-roleplay/...` no `index.html` quando o Simulador SDR também mudar de endereço.
- [ ] Passar a conta Cloudflare `podium-playbook` para outra pessoa (convidar um membro com acesso ao Workers e D1, ou trocar o e-mail/login da conta). Se o Worker for recriado em outra conta, o endereço muda: trocar `API_PADRAO` no `index.html` e migrar os dados do D1 (`wrangler d1 export`).
- [ ] O arquivo `api/.wrangler/cache/wrangler-account.json` está versionado (id e nome da conta Cloudflare, sem chave). Não é segredo, mas não deveria estar no repositório; `.wrangler/` foi incluído no `.gitignore`, e falta tirar o arquivo do controle de versão (`git rm --cached`).
- [ ] Confirmar com a gestão as grafias Lincohn Agner, Rapha Barber e Deivisson Santos.
- [ ] Pendências de conteúdo da trilha de Eventos: onde o lead de evento é registrado e onde se marca a vaga garantida; material próprio da Certificação/GDV.
