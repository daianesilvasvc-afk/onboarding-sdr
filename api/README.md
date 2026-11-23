# Registro de uso da Trilha de Onboarding

A trilha é uma página estática no GitHub Pages. Sem este Worker, nada do que o
executivo faz sai do navegador dele — o painel `?gestao` abre vazio.

- Worker: `onboarding-api`
- Banco: D1 `onboarding_trilha_db`
- Conta Cloudflare: **daiane.podiumeducacao@gmail.com** (subdomínio `podium-playbook`,
  a mesma do Playbook de Vendas — não é a conta do Simulador SDR)
- Endereço que a página chama: `https://onboarding-api.podium-playbook.workers.dev`

## Publicar pela primeira vez

```bash
cd api
npx wrangler login                      # abre o navegador; entre na conta daiane.podiumeducacao
npx wrangler d1 create onboarding_trilha_db
```

O comando acima imprime um `database_id`. Cole no `wrangler.toml`, no lugar de
`PREENCHER_APOS_d1_create`. Depois:

```bash
npx wrangler d1 execute onboarding_trilha_db --remote --file=schema.sql
npx wrangler deploy
```

O `deploy` imprime a URL. Se ela não for exatamente
`https://onboarding-api.podium-playbook.workers.dev`, troque a constante
`API_PADRAO` no `index.html` e publique a página de novo.

## Liberar progresso de quem trocou de navegador

O progresso mora no `localStorage`, que e por navegador. Quem troca de maquina
ou de navegador comeca do zero, e nao existe jeito de a gestao escrever no
navegador de outra pessoa. A saida e mandar um link de uso unico:

```
https://daianesilvasvc-afk.github.io/onboarding-sdr/?liberar=12
```

Isso marca as 12 primeiras aulas como feitas **naquele navegador** e abre o
modulo seguinte. O numero e a quantidade de aulas a marcar, ou seja, o indice
da primeira aula que a pessoa ainda vai estudar:

| abrir ate | numero |
|---|---|
| F1 · Ferramentas e nomenclaturas | 3 |
| F1 · Script e ligacao | 7 |
| F1 · Ligar de verdade | 9 |
| F2 · O metodo | 12 |
| F2 · A call | 15 |
| F2 · Fechar e entregar | 21 |

O parametro sai da barra de endereco assim que e aplicado, para o link nao
virar favorito que relibera tudo a cada visita. O painel `?gestao` registra o
evento como **"Liberado pela gestao"**, nunca como aula concluida: liberacao e
decisao de gestor, nao estudo, e os dois nao podem se confundir no relatorio.

## Rotas

| rota | o que faz |
| --- | --- |
| `POST /eventos` | grava um lote de eventos de uma pessoa |
| `GET /pessoas` | uma linha por pessoa, com os totais — é o que o painel `?gestao` lê |
| `GET /pessoas/:id` | o histórico completo daquela pessoa |

Não tem senha, igual ao histórico do Simulador e ao do Playbook: quem tiver o
endereço lê. O CORS só aceita a origem do GitHub Pages e `localhost`, o que
impede outro site de gravar, mas não impede alguém de abrir a URL na mão.

## Enquanto o Worker não estiver no ar

A página não quebra: os eventos ficam numa fila no navegador
(`podium-onboarding-fila`, até 400) e sobem na primeira visita em que o Worker
responder. O painel `?gestao` mostra o erro em vez de uma lista vazia.

## Testar sem Cloudflare

Rodando a página em `localhost`, `?api=http://localhost:8788` aponta para outro
endereço. Publicado, esse parâmetro é ignorado de propósito.
