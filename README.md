# Dashboard de Resultados — GhelPlus & De Bacco

Painel de resultados de redes sociais, site, blog, newsletter e assessoria de
imprensa, com login, múltiplos usuários, histórico de alterações, comparação
entre anos e um link público somente leitura.

## O que tem aqui

- **Redes sociais**: Instagram, Facebook, TikTok, YouTube, Pinterest, LinkedIn
- **Site, Blog, Newsletter, Assessoria de Imprensa**
- Gráficos de evolução de alcance e de seguidores por canal, ano a ano (interativos: passe o mouse para ver os valores, clique na legenda para ligar/desligar uma linha)
- Insights automáticos (texto gerado a partir dos números lançados)
- Conteúdos em destaque (os posts/vídeos/artigos com melhor resultado)
- Aba "Anos anteriores" comparando todos os anos já lançados
- Histórico de alterações (quem editou o quê)
- Duas marcas: **GhelPlus** e **De Bacco**, cada uma com seus próprios dados
- Link público (`/public`) para ver os resultados sem poder editar e sem login
- **Planilha modelo por canal**: baixe um Excel já formatado com os campos daquele canal, preencha e importe de volta — o sistema cria os meses novos e atualiza os que já existem
- **Relatórios em PDF**: baixe um PDF com indicadores, gráfico e tabelas — disponível na Visão Geral, em cada canal, em Conteúdos em Destaque, e também no link público
- Painel responsivo (funciona bem no computador e no celular)

O projeto já vem com **dados de exemplo** (2025 e 2026) só para você ver o
painel funcionando. Assim que você lançar dados reais, apague os de exemplo
pela própria tela (editar/excluir) ou rode `npm run seed` de novo para
recriá-los do zero (isso apaga os lançamentos e conteúdos existentes).

## Observações importantes

- **Pinterest não aparece para a GhelPlus**, **LinkedIn não aparece para a De Bacco**, e **Casoca aparece só para a De Bacco** — isso já vem configurado (em `public/config.js`, campo `excludeBrands` de cada canal). Para mudar isso no futuro, é só editar essa lista.
- O canal **Casoca** (catálogo B2B de produtos) foi adaptado do relatório de performance da plataforma: visitas, downloads, audiência, contatos, posição no ranking do segmento. Os itens de "Perfil por profissão", "Distribuição por estado" e "Ranking de concorrentes" viraram campos de texto livre (não gráficos dinâmicos com múltiplas marcas) — se precisar disso como gráfico de verdade no futuro, é uma extensão nova.
- O canal **Site** usa indicadores no estilo Google Analytics (usuários ativos, novos, recorrentes, sessões, tempo de engajamento, eventos, retenção) lançados **mês a mês**, e não dia a dia — se um dia for necessário acompanhar dia a dia, isso exigiria uma funcionalidade nova (lançamento diário), separada da lógica atual.

## Planilhas: baixar modelo e importar

Em cada página de canal (ex.: Instagram, Newsletter, Site), no topo, tem dois botões:

- **⭳ Baixar modelo (Excel)** — baixa uma planilha `.xlsx` já com os 12 meses
  do ano selecionado e as colunas certas para aquele canal específico
- **⭱ Importar planilha** — depois de preencher os números na planilha
  baixada, envie ela de volta aqui. O sistema identifica pelo mês/ano se é
  um lançamento novo (cria) ou um já existente (atualiza), e mostra um
  resumo no final

Cada canal tem sua própria planilha porque os campos são diferentes (ex.:
Instagram pede seguidores/alcance/engajamento, Newsletter pede
inscritos/aberturas/cliques).

## Relatórios em PDF

O botão **⭳ Baixar relatório (PDF)** aparece na Visão Geral, em cada canal e
em Conteúdos em Destaque — tanto no painel principal quanto no link público.
O PDF inclui os indicadores, uma imagem do gráfico daquela página e as
tabelas de dados.


## Rodando localmente

```bash
npm install
cp .env.example .env
# edite o .env e troque o JWT_SECRET por um valor aleatório
npm start
```

Abra `http://localhost:3000`. No primeiro acesso, o próprio site vai pedir
para você criar o usuário administrador.

## Colocando no ar (Railway)

1. Crie um repositório no GitHub e suba os arquivos deste projeto **via
   terminal** (`git add`, `git commit`, `git push`) — não pelo botão de
   upload do site do GitHub, porque ele pode desorganizar as pastas.
2. No [Railway](https://railway.app), crie um novo projeto a partir desse
   repositório.
3. Em **Variables**, adicione `JWT_SECRET` com um valor aleatório e longo.
4. Em **Settings → Volumes**, monte um volume persistente no caminho
   `/app/data` (é onde fica o arquivo `data/db.json` — sem isso, os dados
   somem a cada novo deploy).
5. Gere o domínio público em **Settings → Networking → Generate Domain**.
6. Acesse o link gerado e crie o usuário administrador no primeiro acesso.

### Se o deploy automático (GitHub → Railway) travar em "Queued"

Isso já aconteceu antes por instabilidade do lado do GitHub e não tem a ver
com o seu projeto. Nesse caso, publique direto do computador com a CLI do
Railway:

```bash
npm install -g @railway/cli
railway login
cd pasta-do-projeto
railway link      # escolhe o workspace, projeto e serviço já criados
railway up        # envia os arquivos e faz o deploy
```

Depois do `railway up`, se o terminal mostrar "Failed to stream build logs",
não é falha do deploy — é só o log que não conseguiu ficar "ao vivo".
Confirme sempre pela aba **Deployments** do site do Railway se o status
ficou **Active** / **Deployment successful**.

## Compartilhando o link público

Dentro do painel, vá em **Link público** (no menu lateral) para copiar o
link de cada marca — algo como:

```
https://seu-dominio.up.railway.app/public?brand=ghelplus
https://seu-dominio.up.railway.app/public?brand=debacco
```

Quem acessa esse link vê os gráficos, tabelas e conteúdos em destaque, mas
não vê nenhum botão de criar/editar/excluir e não precisa de senha.

## Lançando dados todo mês

1. Entre no painel, escolha a marca no topo do menu lateral.
2. Clique no canal (ex.: Instagram) e em **"+ Lançar mês"**.
3. Preencha os números daquele mês (seguidores, alcance, etc.) — o próprio
   canal já mostra só os campos que fazem sentido para ele.
4. Em **Conteúdos em destaque**, cadastre os posts/vídeos/artigos que mais
   se destacaram no mês, com alcance e engajamento.

Tudo isso fica registrado em **Histórico de alterações**, com data, usuário
e o que foi feito.

## Estrutura de pastas

```
dashboard-redes-sociais/
├── server.js              # Express app, monta rotas e serve o frontend
├── db.js                  # conexão lowdb, cria data/db.json com os defaults
├── seed.js                # dados de exemplo (`npm run seed`)
├── middleware/auth.js      # requireAuth (verifica JWT) e requireAdmin
├── utils/audit.js          # logAudit() — chamado em toda rota que cria/edita/apaga
├── utils/id.js              # gerador simples de IDs
├── routes/
│   ├── auth.js             # setup do 1º admin, login, CRUD de usuários
│   ├── metrics.js          # CRUD das métricas mensais por canal
│   ├── content.js          # CRUD dos conteúdos em destaque
│   ├── audit.js            # GET do histórico de alterações
│   ├── settings.js         # título/tagline editável por marca
│   └── public.js           # rotas somente-leitura, sem autenticação (link público)
└── public/
    ├── index.html          # painel completo (login + edição)
    ├── public.html          # versão somente leitura (link público)
    ├── style.css            # estilos compartilhados
    ├── config.js            # lista de marcas/canais e funções de formatação
    ├── app.js               # lógica do painel completo
    └── public-app.js        # lógica da versão somente leitura
```

Para adicionar um canal novo ou mudar os campos de métricas de um canal
existente, edite a lista `CHANNELS` em `public/config.js` — o resto do
painel (formulários, tabelas, gráficos) se adapta automaticamente.
