# Estado do projeto — 31/08/2026

Documento de retomada. Escrito para sobreviver a troca de máquina: as memórias do Claude
ficam em `C:\Users\hital\.claude\projects\...` e **não** vão junto com o repositório.

Último commit: `79d7f13` · tudo pushado e em produção.

---

## O que é

Painel Next.js 16 de disparos de WhatsApp e Grupo VIP.

| | |
|---|---|
| Pasta local | `CLAUDE\Dashboard CRM` (era "DASH DISPAROS") |
| Repositório | `hitalorosa/DASHBOARD` |
| Produção | https://dashboard-api-noue.vercel.app |
| Nome do painel | **DrySkin CRM** |

> A URL da Vercel ainda tem "noue" no nome mesmo com a marca arquivada. Renomear o
> projeto muda o endereço, então ficou como está.

### Marcas

Só a **DrySkin** está ativa. **Nouê** e **New Hair** estão `archived: true` em
`lib/brands.ts`: somem do seletor e caem numa tela "Painel em reforma". **Nenhum dado foi
apagado** — Supabase, `localStorage` e env vars continuam intactos.

Para acessá-las: digitar **`arquivo`** em qualquer tela (fora de campo de texto), ou
abrir com `?arquivo=1`. Desliga pelo "Sair do arquivo" no seletor, ou `?arquivo=0`.

---

## Arquitetura

```
app/
  page.tsx           Central — KPIs, gráfico, tabela do mês, top 3 bases
  calendario/        Grade mensal com chips de 3 estágios + modal "Novo"
  disparos/          Cards por disparo + painel de edição (Resultado | Conteúdo)
  bases/             Cards de segmento com decisão e notas
  vip/               Relatório do Grupo VIP (Yampi) + drawer de pedido
  roleta/            Roleta Recovery — tela nativa (ver seção abaixo)
  login/             Senha única por nível
  api/
    auth/login       Valida senha, decide o nível, assina o cookie
    auth/logout      Limpa os dois cookies
    yampi            Pedidos VIP por marca (?brand=)
    atribuicao       Cruza pedidos com cupom/UTM de cada disparo
    roleta           Ponte para o painel da Roleta Recovery (?dia=)
    webhooks/dooki   Webhook da Yampi com HMAC próprio

lib/
  theme.ts           Tokens do design (cores, fontes, pílulas) — estilos inline
  nav.ts             Navegação, níveis de acesso e mapa de API → área
  session.ts         Cookie de sessão assinado (Web Crypto, roda no Edge)
  brands.ts          As 3 marcas, metas, prefixo de env da Yampi
  store.tsx          Estado: Supabase + espelho em localStorage
  data.ts            disparosMaio (Nouê) e disparosAgostoDryskin (fixos)
  archive-mode.ts    Palavra secreta e o toggle do modo arquivo
  yampi.ts           Cliente da API Dooki/Yampi, credenciais por marca

components/
  Shell.tsx          Casca: sidebar + header + guards. Header mora aqui.
  Sidebar / Header / BottomNav
  AccessGuard        Tela "sem acesso a esta área"
  ArchivedGuard      Tela "painel em reforma"
  ArchiveToast       Confirmação ao ligar/desligar o modo arquivo

proxy.ts             Barreira real: valida a sessão e o nível antes de servir
```

### Design

Segue o **Painel Vante**, feito no Claude Design (projeto *Redesign do site Dryskin*,
arquivo `Painel Vante.dc.html`). Tema claro verde-menta.

Os tokens vivem em **dois lugares que precisam andar juntos**: `lib/theme.ts` (para os
estilos inline) e `app/globals.css` (as mesmas cores como variáveis CSS). Fontes Archivo
(títulos) + Inter (corpo). Os ícones da navegação são **glifos** (`◧ ▦ ➤ ◍ ♛`), não uma
biblioteca — foi assim que o `lucide-react` saiu do projeto.

### Dados

Supabase, tabela `dash_store`, uma linha por marca: **1** Nouê, **2** DrySkin,
**3** New Hair. Espelhado em `localStorage` por marca.

Agosto/2026 (13 disparos, `disparosAgostoDryskin`) e setembro/2026 (15,
`disparosSetembroDryskin`) da DrySkin são **dataset fixo** em `lib/data.ts`, não estão no
banco. Copy, cupom e resultados entram pela UI e aí sim vão para o Supabase. Mês novo de
planejamento entra assim: array novo no `data.ts` e mais um item no `allDisparos` do
`store.tsx` — IDs com prefixo próprio, e nunca começando com `c-`, que é reservado para o
que foi criado pelo "+ Novo".

### Roleta Recovery

A tela `/roleta` é **nativa** desde 31/08 — era um iframe de `roletadry.vercel.app` e
parecia site dentro de site. Os números continuam vindo de outro projeto,
**`hitalorosa/RoletaRecovery`** (arquivo único `api/roleta_recovery.py`), que agora expõe
o mesmo `dash_dados` do painel de lá em **`?view=json`**, com CORS liberado e cache de 60s.
`?dia=YYYY-MM-DD` troca o dia da visão diária.

O fetch **passa pelo servidor**, em `app/api/roleta/route.ts`. Não é preciosismo: o CSP tem
`connect-src 'self' https://*.supabase.co`, então o browser não alcança o domínio de lá — e
recurso bloqueado por CSP **falha calado na tela**, só aparece no console. A rota valida o
`?dia=`, guarda 60s em memória por dia e corta em 30s, porque a origem consulta Supabase e
Yampi a cada chamada e leva de 10 a 15s (por isso a tela tem estado de carregando).

⚠️ **O JSON vive no outro repositório.** Se `?view=json` voltar a responder HTML, alguém
reverteu de lá — a tela mostra exatamente isso na caixa de aviso, não fique procurando bug
aqui.

O bloco **"ganho contra o grupo de controle"** usa `controle` e `ctrl_comprou`, que o painel
de origem calculava e nunca mostrava. Ele só aparece com `controle > 0`: sem grupo de
controle a "diferença" seria a conversão bruta com outro nome. Abaixo de 200 no controle ou
50 recebidos, avisa que o número ainda é ruído — mesma régua do robô (`AMOSTRA_MIN_CTRL`).

### Os 3 estágios do disparo

Derivados do que está preenchido, não de um campo de status:

| Estágio | Quando | Chip |
|---|---|---|
| a definir | sem copy nem cupom | `◆` tracejado |
| pronto | tem copy **e** cupom | `●` verde sólido |
| executado | tem faturamento ou envios | `✓` menta |

---

## Níveis de acesso

Definidos em `lib/nav.ts`:

| Nível | Env var | Áreas |
|---|---|---|
| `total` | `DASHBOARD_PASSWORD` | tudo |
| `financeiro` | `DASHBOARD_PASSWORD_FINANCEIRO` | Central · Disparos · Bases · VIP |
| `conteudo` | `DASHBOARD_PASSWORD_CONTEUDO` | Calendário · Disparos |

**Só a primeira é obrigatória.** As outras duas estão em branco hoje, então o painel
funciona com uma senha só, acesso total.

**Como a barreira funciona.** O login grava dois cookies:

- `dash-session` — httpOnly e **assinado**: `<nível>.<sha256 do segredo + nível>`
  (`lib/session.ts`). É o que o `proxy.ts` valida. Trocar o nível aqui invalida a
  assinatura e derruba a sessão.
- `dash-nivel` — legível, usado **só** para a interface montar a navegação. Adulterar
  não dá acesso.

> ⚠️ **Toda rota de API que sirva dados de uma área precisa entrar em `API_AREA`, no
> `lib/nav.ts`.** Sem isso o nível `conteudo` conseguia ler `/api/yampi` direto e ver os
> pedidos do VIP sem ter acesso à tela. Já mapeadas: `/api/yampi` → vip,
> `/api/atribuicao` → disparos, `/api/roleta` → roleta.

---

## Como rodar e validar

```bash
npm run dev
```

Antes de commitar:

```bash
npx tsc --noEmit && npx next build
```

**Não confie no `npx eslint` isolado** — ele quase sempre morre em
`node_modules/globalthis/index.js` por causa do OneDrive, mesmo com o código correto.
O `next build` é a checagem confiável.

### ⚠️ OneDrive quebra o build

O repo vive dentro do OneDrive e o `node_modules` tem a maioria dos arquivos como
*online-only*. Com o OneDrive parado, lê-los falha com `os error 362` /
`UNKNOWN: unknown error, read`, e o erro **parece bug de código, mas não é**.

Se acontecer:

```bash
tasklist | grep -i onedrive
"C:\Users\hital\AppData\Local\Microsoft\OneDrive\OneDrive.exe" /background
```

Conserto definitivo: `npm ci`, que reescreve tudo localmente.

---

## Pendências — retomar por aqui

1. **Supabase não está na Vercel.** As três variáveis (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) existem só no
   `.env.local`. **Em produção o painel roda com localStorage**: cada navegador com seus
   próprios dados, sem sincronizar entre aparelhos. É a mais impactante.

2. **Tokens Yampi expostos no histórico do git.** Verificado com
   `git log -S "<valor>" --all`: os valores atuais de `YAMPI_*` (Nouê) e
   `DRYSKIN_YAMPI_*` aparecem em 3 commits. Regenerar no admin da Yampi e atualizar no
   `.env.local` **e** na Vercel. A senha do dashboard já foi rotacionada e está limpa.

3. **Wordmark da DrySkin.** O rodapé da sidebar usa símbolo + nome em tipografia. O
   wordmark branco existe em `assets/dryskin-wordmark-branca.png` dentro do projeto do
   Claude Design, mas a API só devolve base64 no contexto — inviável transcrever.
   **Caminho certo:** salvar o PNG em `public/dryskin-wordmark.png` e trocar no
   `components/Sidebar.tsx`.

4. **Senhas dos níveis** `financeiro` e `conteudo` continuam em branco.

5. **`NEWHAIR_YAMPI_*` não existe na Vercel** — o painel VIP da New Hair responde
   "credenciais não configuradas". Sem urgência: a marca está arquivada.

6. **A roleta está sem grupo de controle** (`controle` e `ctrl_comprou` em 0 em 31/08).
   Enquanto ficar assim, o bloco de ganho da tela `/roleta` não aparece — é ele que
   responde quanto do faturamento a roleta trouxe de verdade, em vez de contar compra
   que aconteceria de qualquer jeito. Ligar o holdout no robô é o que destrava.

---

## Histórico recente

| Commit | O quê |
|---|---|
| `79d7f13` | Mostra os pedidos de cada disparo na tabela da Central |
| `894beed` | Troca o iframe da roleta por uma tela nativa do dash |
| `0330eea` | Adiciona a tela `/roleta` como embed (substituído pelo commit acima) |
| `dc2a23f` | Alinha controles do header, símbolo na sidebar, tira aviso de nível do login |
| `95cc8ea` | Corrige preenchimento da tela e sidebar que rolava junto |
| `f4e3f85` | Fecha o Painel Vante e renomeia para DrySkin CRM |
| `e1d9738` | Implementa o Painel Vante e os níveis de acesso |
| `0d1454d` | Calendário com 3 estágios e arquiva New Hair |

> `ESTRUTURA-DO-DASH.md`, na raiz, era o briefing de estrutura enviado ao Claude Design.
> **Está desatualizado** — descreve o painel antes do redesign. Serve como registro
> histórico dos problemas que motivaram a mudança.
