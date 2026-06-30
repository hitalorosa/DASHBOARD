# CONTEXTO COMPLETO — Dashboard Disparos CRM (Nouê Cosméticos)

> Documento de transferência de contexto. Criado em 21/05/2026. Última atualização: 22/05/2026.  
> Cole este arquivo como a primeira mensagem ao iniciar uma nova sessão de Claude Code.

---

## 1. Visão Geral

**Produto:** Dashboard interno de CRM e analytics para a **Nouê Cosméticos** (e futuras marcas do mesmo grupo).

**URL de produção:** `https://dashboard-api-noue.vercel.app`

**Repositório GitHub:** `https://github.com/hitalorosa/DASHBOARD`

**Objetivo principal:** Centralizar o controle de disparos de WhatsApp/CRM, performance por base, calendário sazonalidade, e métricas do Grupo VIP (clientes que compraram via UTM `grupo_vip / whatsapp` na Yampi/Dooki).

**Marcas atualmente no sistema:**
| ID | Nome | Logo | Meta Mensal |
|----|------|------|-------------|
| `noue` | Nouê Cosméticos | `/public/logo-noue.png` | R$ 200.000 |
| `dryskin` | DrySkin | `/public/logo-dryskin.png` | R$ 25.000 |

**Páginas existentes:**
| Rota | Descrição |
|------|-----------|
| `/` | Central (KPIs gerais de disparos) |
| `/disparos` | Lista e edição de disparos CRM |
| `/bases` | Performance por base de contatos |
| `/calendario` | Calendário de sazonalidade / datas relevantes |
| `/vip` | Dashboard Grupo VIP — integrado à API Yampi/Dooki |

---

## 2. Instruções Personalizadas para o Claude

> Estas regras devem ser aplicadas em todas as sessões de trabalho neste projeto.

### 2.1 Regras Gerais de Comportamento

```
- Sempre rodar `npx tsc --noEmit` antes de qualquer commit. Zero erros TypeScript é obrigatório.
- Nunca usar `git add -A` ou `git add .`. Adicionar apenas os arquivos modificados explicitamente.
- Após qualquer alteração de código: rodar tsc, git add <arquivo>, git commit e git push — TUDO sem esperar o usuário pedir.
  Fluxo obrigatório: npx tsc --noEmit → git add <arquivo> → git commit → git push
  Não encerrar a resposta sem o push ter sido feito.
- Nunca criar arquivos de documentação (.md) sem solicitação explícita.
- Não usar retry em chamadas à Dooki API — ela limita a 429 e retenta piora o problema.
- Sempre usar `URLSearchParams` para montar URLs da Dooki (não template strings — os caracteres `[`, `]`, `|` precisam ser URL-encoded).
- Ao editar `app/vip/page.tsx`, lembrar que `aggregateOrders` roda no CLIENTE com dados brutos da API.
```

### 2.2 Regra sobre Next.js (do AGENTS.md)

```
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
```

### 2.3 Variáveis de Ambiente (Vercel)

> ⚠️ **NUNCA colar valores reais aqui.** Este arquivo está no Git. Os valores
> ficam APENAS no `.env.local` (local, gitignored) e no painel da Vercel.
> Os placeholders abaixo são só a lista de chaves necessárias.

```env
# Yampi / Dooki v2
YAMPI_ALIAS=noue-cosmeticos
YAMPI_TOKEN=<no .env.local / Vercel>
YAMPI_SECRET_KEY=<no .env.local / Vercel>

# Supabase (sincronização de dados entre dispositivos)
NEXT_PUBLIC_SUPABASE_URL=<url do projeto supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key do supabase>
SUPABASE_SERVICE_ROLE_KEY=<no .env.local / Vercel — só servidor>

# Autenticação do dashboard (login server-side via middleware)
DASHBOARD_PASSWORD=<senha de acesso — no .env.local / Vercel>
DASHBOARD_SESSION_VALUE=<token aleatório longo p/ o cookie de sessão>

# Webhook Dooki
DOOKI_WEBHOOK_SECRET=<segredo gerado no admin Dooki>
```

### 2.4 Autenticação

Login **server-side** via `middleware.ts` + `app/api/auth/login`:
- A senha vive na env var `DASHBOARD_PASSWORD` (servidor) — nunca no bundle do browser.
- Comparação com `timingSafeEqual` (anti timing-attack).
- Sessão em cookie `dash-session` (`httpOnly`, `secure`, `sameSite=strict`), valor = `DASHBOARD_SESSION_VALUE`.
- O `middleware.ts` protege todas as rotas exceto `/login`, `/api/auth/*` e `/api/webhooks/*`.

> ⚠️ A senha NUNCA deve aparecer neste arquivo nem em qualquer código versionado.
> Para trocar a senha: alterar `DASHBOARD_PASSWORD` no `.env.local` e na Vercel.

---

## 3. Stack Tecnológica

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| Next.js | 16.2.6 | Framework (App Router, `'use client'`) |
| React | 19.2.4 | UI |
| TypeScript | 5.x | Tipagem estrita |
| Tailwind CSS | 4.x | Estilos utilitários |
| Recharts | 3.8.x | Gráficos (BarChart, etc.) |
| date-fns | 4.1.x | Formatação de datas |
| lucide-react | 1.14.x | Ícones |
| @supabase/supabase-js | 2.x | Persistência em nuvem |
| Vercel | — | Deploy (Node.js runtime) |

**Deploy:** Vercel conectado ao GitHub (`main` branch → auto-deploy).  
**Supabase:** Tabela `dash_store` com colunas `id` (int), `data` (jsonb), `updated_at` (timestamp).

---

## 4. Arquitetura e Estrutura de Pastas

```
DASH DISPAROS/
├── app/
│   ├── layout.tsx              # Root layout: AuthGuard → BrandProvider → BrandStoreWrapper → Sidebar
│   ├── page.tsx                # Página Central (KPIs)
│   ├── globals.css             # Design system: tokens CSS, .kpi-card, .disparo-row
│   ├── disparos/page.tsx       # Disparos CRM
│   ├── bases/page.tsx          # Bases de contatos
│   ├── calendario/page.tsx     # Calendário sazonalidade
│   ├── vip/page.tsx            # Dashboard Grupo VIP ← arquivo mais complexo
│   └── api/
│       ├── yampi/route.ts        # GET /api/yampi?month=&year=&force= (cache 30min)
│       ├── atribuicao/route.ts   # GET /api/atribuicao?month=&year=&brand=&debug= (atribuição de faturamento por disparo)
│       └── yampi-debug/route.ts  # Diagnóstico — DELETE após confirmar VIP estável
│
├── components/
│   ├── AuthGuard.tsx           # Tela de login simples (senha local)
│   ├── Sidebar.tsx             # Navegação lateral (desktop)
│   ├── BottomNav.tsx           # Navegação inferior (mobile)
│   ├── Header.tsx              # Cabeçalho de página com seletor de mês/ano e marca
│   ├── BrandStoreWrapper.tsx   # Passa brand atual para o StoreProvider
│   ├── CampaignBadge.tsx       # Badge colorida por tipo de campanha
│   └── RoasBadge.tsx           # Badge colorida por nível de ROAS
│
├── lib/
│   ├── brands.ts               # Definição das marcas (id, nome, logo, metaMensal)
│   ├── brand-context.tsx       # Context React: brand ativa + mês/ano selecionados
│   ├── types.ts                # Tipos: Disparo, Base, CampaignType, etc.
│   ├── store.tsx               # Store global: localStorage + Supabase sync
│   ├── data.ts                 # Dados fixos de disparos (maio/2026, Nouê)
│   ├── supabase.ts             # Cliente Supabase (null se sem env vars)
│   └── yampi.ts                # Cliente Dooki v2 API ← arquivo crítico
│
├── public/
│   ├── logo-noue.png
│   └── logo-dryskin.png
│
├── sincronizar_vip.py          # Script Python legado (não usar — direto da Vercel agora)
├── CLAUDE.md                   # Aponta para AGENTS.md
├── AGENTS.md                   # Regra sobre Next.js versão nova
└── .env.local                  # Variáveis locais (não commitado)
```

---

## 5. Design System

**Paleta de cores (tokens CSS em `globals.css`):**
```css
--page-bg:         #111111   /* fundo de página */
--card-bg:         #1A1A1A   /* fundo de cards */
--card-border:     #2A2A2A   /* borda de cards */
--sidebar-bg:      #0D0D0D   /* fundo sidebar */
--noue-gold:       #D4A843   /* cor dourada principal */
--text-primary:    #ECECEC
--text-secondary:  #9CA3AF
--text-muted:      #5E5E5E
```

**Fontes:**
- `Inter` — corpo de texto
- `JetBrains Mono` — labels, KPIs, tags
- `Instrument Serif` — títulos decorativos

**Componente `.kpi-card`:**  
Card com fundo degradê `#1C1C1C → #181818`, linha dourada no topo esquerdo, e glow radial dourado no canto inferior direito.

---

## 6. Módulo Yampi/Dooki (`lib/yampi.ts`) — CRÍTICO

### 6.1 API Base

```
https://api.dooki.com.br/v2/{alias}
```

**NÃO usar** `api.yampi.io/v1` — está deprecated.

### 6.2 Autenticação

```typescript
headers: {
  'User-Token':      TOKEN,
  'User-Secret-Key': SECRET_KEY,
  'Accept':          'application/json',
}
```

### 6.3 Endpoints usados

| Endpoint | Uso |
|----------|-----|
| `GET /search/orders?utm_source[]=grupo_vip&utm_campaign[]=whatsapp&include=status,items,address` | Pedidos VIP — filtra UTM no servidor, retorna conjunto pequeno |
| `GET /checkout/carts?date=created_at:YYYY-MM-DD\|YYYY-MM-DD` | Carrinhos abandonados do mês |

### 6.4 Formato de resposta da Dooki v2 — ARMADILHAS

**Envelope raiz:**
```json
{ "scroll_id": null, "data": [...] }
```

**`created_at` é um OBJETO, não string:**
```json
{
  "date": "2026-05-20 09:39:07.000000",
  "timezone": "America/Sao_Paulo",
  "timezone_type": 3
}
```
→ Usar sempre `toIso(o.created_at)` antes de qualquer operação de data.

**Relações (items, address, status) são envelopes:**
```json
{ "items": { "data": [...] }, "address": { "data": [...] }, "status": { "data": {...} } }
```
→ Usar sempre `unwrapArray(o.items)` e `unwrapArray(o.address)` antes de iterar.

**UTMs estão no nível raiz do pedido:**
```json
{ "utm_source": "grupo_vip", "utm_campaign": "whatsapp" }
```
NÃO dentro de `tracking.utm_source`.

**Status pago** → `o.status?.data?.alias`. Aliases válidos (lista completa do `lib/yampi.ts`):
```
'paid', 'payment_approved', 'approved', 'handling_products',
'in_separation', 'invoiced', 'ready_for_shipping', 'on_carriage',
'shipped', 'delivered'
```
⚠️ NÃO usar subset menor — pedidos com `payment_approved` ou `in_separation` são reais e devem ser contados.

**Cupom/promocode** → o código está em `o.promocode?.data?.code` (ex: `"MAIO20"`). 
- `o.promocode_id` é um número interno (ex: `7902462`), NÃO é o código
- `o.promocode.data` pode ser `[]` array vazio (sem cupom) ou `{ code: string, ... }` (com cupom)
- Ler assim: `const p = o.promocode?.data; const code = Array.isArray(p) ? '' : p?.code ?? '';`

**`toIso()` e timezone** → `toIso()` retorna a string SP sem offset (ex: `"2026-05-21T22:16:19.000000"`). Node.js/Vercel interpreta como UTC. Para comparações de timestamp, sempre somar `SP_OFFSET_MS = 3 * 60 * 60 * 1000` quando não houver offset explícito na string.

**Valor total** → `o.value_total` (number), não `o.total` (string vazia/undefined).

### 6.5 Helpers exportados de `lib/yampi.ts`

```typescript
// Normaliza created_at (objeto Dooki, Unix ts, ou string) → string ISO
export function toIso(createdAt: string | number | DookiDate | unknown): string

// Desencapsula envelopes Dooki { data: [...] } → T[]
export function unwrapArray<T>(val: unknown): T[]

// Valor real do pedido (value_total ?? parseFloat(total))
export function orderValue(o: YampiOrder): number

// Agrega array de pedidos → { totalFat, totalPed, ticket, byHour, byState, byProduct }
export function aggregateOrders(orders: YampiOrder[])

// Valor de um carrinho
export function cartValue(c: YampiCart): number

// Retorna { dateMin, dateMax } para um mês/ano
export function getMonthRange(month: number, year: number)
```

### 6.6 Paginação

A Dooki usa cursor `scroll_id` (não `last_page`):
```json
{ "scroll_id": "abc123", "data": [...] }
```
`fetchAllPages` suporta ambos (scroll_id cursor e fallback por page number).

### 6.7 Rate Limiting

- **Sem retry** — 429 da Dooki é fail-fast com mensagem amigável.
- Cache em memória Vercel: **30 minutos** por chave `YYYY-MM`.
- Sem auto-refresh na página — apenas carga inicial + botão manual.

---

## 7. Rota API (`app/api/yampi/route.ts`)

```typescript
// GET /api/yampi?month=5&year=2026&force=1
// - month/year: padrão = mês/ano atual
// - force=1: ignora cache e busca ao vivo
// Retorna: { ok, source, fetchedAt, orders, carts, totalFat, totalPed, ticket, byHour, byState, byProduct }
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const TTL = 30 * 60 * 1000; // 30 min
```

---

## 8. Página VIP (`app/vip/page.tsx`)

### Comportamento
- **Carrega automaticamente** no mount via `useEffect`
- **Guard de marca**: se `brand.id !== 'noue'` → exibe tela "Em breve" (sem chamada à API)
- **Timeout de 30s** via `AbortController`
- **Botão "Sincronizar VIP"** → chama com `force=1` para ignorar cache
- **Erros visíveis** em box vermelho (nunca silenciosos)
- **Sem auto-refresh** (evita 429)

### Estados
```typescript
'idle' | 'loading' | 'done' | 'error'
```

### Seções da página
1. KPIs: Faturamento VIP, Pedidos, Ticket Médio, Carrinhos Abandonados
2. Gráfico de Pedidos por Horário (BarChart)
3. Faturamento por Estado (barras horizontais)
4. Produtos Mais Vendidos (barras horizontais)
5. Tabela: Todos os Pedidos VIP (horário, pedido, cliente, UF, produto, total)
6. Quebra Faturado vs Líquido: pedidos pagos, carrinhos, taxa de conversão, valor em risco

### Cuidado especial na tabela
```typescript
// CORRETO — desencapsula envelope Dooki
const prodNames = unwrapArray<{...}>(o.items).map(...).join(', ');
const addrArr   = unwrapArray<{uf?: string; state?: string}>(o.address);
const state     = addrArr[0]?.uf ?? addrArr[0]?.state ?? '—';
const total     = orderValue(o); // usa value_total, não o.total

// CORRETO — created_at é objeto, não string
const dt = new Date(toIso(o.created_at));
```

---

## 9. Store Global (`lib/store.tsx`)

Sistema dual-sync localStorage + Supabase:

```
Fluxo de carga:
1. Lê localStorage → exibe imediato
2. Busca Supabase → substitui se tiver dados
3. Se Supabase vazio + local tem dados → faz upload para Supabase

Fluxo de escrita:
1. Atualiza estado React
2. Salva localStorage imediato
3. Salva Supabase com debounce de 800ms
```

**Tabela Supabase:**
```sql
CREATE TABLE dash_store (
  id         int PRIMARY KEY,
  data       jsonb,
  updated_at timestamptz
);
-- id=1 → Nouê Cosméticos
-- id=2 → DrySkin
```

---

## 10. Rota de Atribuição — `GET /api/atribuicao`

**Arquivo:** `app/api/atribuicao/route.ts`

```
GET /api/atribuicao?month=4&year=2026&brand=dryskin
GET /api/atribuicao?month=4&year=2026&brand=dryskin&debug=1
```

**Parâmetros:**
- `month` — 0-indexed (igual ao context do useBrand). A rota converte internamente com `month + 1`
- `year` — ano. Ex: `2026`
- `brand` — `noue` ou `dryskin`. Padrão: `dryskin`
- `debug=1` — retorna diagnóstico completo com reconciliação e lista de pedidos não atribuídos

**Env vars DrySkin (Vercel + .env.local):**
```
DRYSKIN_YAMPI_ALIAS=dryskin-tratamento-para-o-suor-e-mau-odor-nas-axilas
DRYSKIN_YAMPI_TOKEN=<no .env.local / Vercel>
DRYSKIN_YAMPI_SECRET_KEY=<no .env.local / Vercel>
```
(mesmo token/secret da Nouê — mesma conta Dooki, alias diferente)

**Estrutura no Supabase `dash_store` id=2:**
```json
{
  "customDisparos": [ { "id": "c-xxx", "data": "2026-05-21", ... } ],
  "disparoContent": {
    "c-xxx": {
      "utms": ["https://oferta.dryskin.com.br/?utm_source=car&utm_campaign=21-05"],
      "cupom": "MAIO20"
    }
  }
}
```
⚠️ Disparos da DrySkin são TODOS `customDisparos` (não há fixos em `data.ts`). A Nouê usa `disparosMaio` hardcoded + `customDisparos`.

### 10.1 Fetch de pedidos Yampi

```typescript
// CORRETO — include deve ter 'status' E 'promocode'
const base = new URLSearchParams({
  include: 'status,promocode',
  limit:   '100',
});
```
⚠️ `include: 'status'` sozinho NÃO retorna `promocode.data.code` de forma confiável em todos os pedidos.

### 10.2 PAID set (status que contam como pagos)

```typescript
const PAID = new Set([
  'paid', 'payment_approved', 'approved',
  'handling_products', 'in_separation',
  'invoiced', 'ready_for_shipping',
  'on_carriage', 'shipped', 'delivered',
]);
```
⚠️ Pedidos recém-aprovados ficam em `payment_approved` ou `in_separation` — sem eles o dash ignora vendas do mesmo dia.  
⚠️ NÃO usar subset menor como `['paid', 'on_carriage', 'shipped', 'delivered']`.

### 10.3 Hierarquia de atribuição

```
1. UTM match   → utm_source + utm_campaign do pedido batem com o utm do disparo
2. Cupom match → promocode.data.code do pedido dentro da janela temporal do cupom (SP timezone)
3. Ambos match para disparos DIFERENTES → tiebreaker: disparo com data mais recente vence
4. Sem match → pedido não atribuído (orgânico / outra origem)
```

### 10.4 Tiebreaker UTM vs Cupom

```typescript
// Mapa disparo_id → data para desempate por recência
const disparoDateMap = new Map(disparos.map(d => [d.id, d.data]));

// Na loop de atribuição:
let attributedId: string | null;
if (utmMatchId && couponMatchId && utmMatchId !== couponMatchId) {
  const utmDate    = disparoDateMap.get(utmMatchId)    ?? '';
  const couponDate = disparoDateMap.get(couponMatchId) ?? '';
  attributedId = couponDate > utmDate ? couponMatchId : utmMatchId;
} else {
  attributedId = utmMatchId ?? couponMatchId;
}
```

**Caso real resolvido (21/05/2026):** Pedido 162980221 (R$116.13) com cupom MAIO20 mas UTM stale `car|18-05` do cookie da sessão anterior. UTM apontava para disparo 19/05; cupom apontava para 21/05. Tiebreaker → cupom 21/05 > UTM 18/05 → atribuído corretamente ao 21/05. Resultado: R$688.30 → R$804.43. ✅

### 10.5 Janela de cupom (coupon window)

O mesmo cupom (ex: MAIO20) pode ser usado em vários disparos. Cada disparo "possui" o cupom:
- **Início:** meia-noite SP do dia do disparo (UTC = dia - 3h)
- **Fim:** 23:59:59 SP do dia anterior ao próximo disparo com o mesmo cupom  
- Se for o último disparo com aquele cupom no mês → fim = 23:59:59 do último dia do mês

### 10.6 Timezone

```typescript
const SP_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC-3 (SP não tem horário de verão)

function orderUtcMs(createdAt: unknown): number {
  const iso = toIso(createdAt); // retorna string SP sem offset, ex: "2026-05-21T14:06:45.000000"
  return new Date(iso).getTime() + SP_OFFSET_MS; // converte para UTC real
}
```
⚠️ `toIso()` retorna string sem sufixo de timezone. `new Date(iso)` interpreta como UTC. Somar SP_OFFSET_MS corrige.

### 10.7 Camadas de dados

| Dado | Fonte | Persistência |
|------|-------|-------------|
| `investimento`, `base`, `leitura` | Campos manuais editados no dash | Supabase `dash_store` (permanente) |
| `faturamento`, `pedidos`, `ticket` | Yampi API ao vivo | Nunca salvo — calculado a cada request |
| `customDisparos`, `disparoContent` | Supabase `dash_store` | Permanente |

**Consequência importante:** após salvar dados de um disparo no Supabase, os pedidos Yampi NÃO aparecem novamente na busca — eles permanecem na Yampi, mas o dash não os "grava" localmente. A atribuição sempre recalcula ao vivo.

### 10.8 Debug endpoint (`?debug=1`)

URL completa de produção:
```
https://dashboard-api-noue.vercel.app/api/atribuicao?month=4&year=2026&brand=dryskin&debug=1
```

Retorna (além dos dados normais):
```json
{
  "reconciliacao": {
    "total_pedidos_yampi":       999,
    "total_pedidos_pagos":       999,
    "total_faturamento_yampi":   99999.99,
    "total_faturamento_atribuido": 9999.99,
    "diferenca_nao_atribuida":   89999.99,
    "pedidos_por_regra": { "utm": 10, "cupom": 5, "nao_atribuido": 984 }
  },
  "pedidos_nao_atribuidos": [
    { "id": 162980221, "valor": 116.13, "utm_source": "car", "utm_campaign": "18-05", "coupon": "MAIO20", "created_at_sp": "...", "ts_utc": "..." }
  ],
  "pedidos_atribuidos": [
    { "order_id": 162980221, "disparo_id": "c-xxx", "regra": "cupom", "valor": 116.13, "created_at_sp": "...", "ts_utc": "..." }
  ]
}
```
`diferenca_nao_atribuida` alto é ESPERADO — a maioria dos pedidos Yampi chega por tráfego orgânico/pago que não tem UTM de disparo.

---

## 11. Status Atual das Funcionalidades

### ✅ Completo e funcionando

| Funcionalidade | Detalhe |
|---------------|---------|
| Autenticação | Login server-side (`DASHBOARD_PASSWORD` + cookie httpOnly) |
| Multi-marca | Nouê + DrySkin, troca via Sidebar |
| Central (KPIs) | Faturamento, ROAS, disparos do mês |
| Disparos | Lista, edição inline, adição, remoção |
| Bases | Performance por base, decisão, notas |
| Calendário | Datas sazonais relevantes |
| Grupo VIP (Nouê) | Carrega automaticamente da Dooki v2 |
| Guard DrySkin | Mostra "Em breve" sem chamar API |
| Cache 30min | Por mês/ano, bypass com `force=1` |
| Paginação Dooki | scroll_id cursor + fallback page number |
| created_at | `toIso()` normaliza objeto Dooki |
| Envelopes Dooki | `unwrapArray()` desencapsula `{data:[]}` |
| Total pedido | `orderValue()` usa `value_total` |
| Endereço/Produtos | `include=status,items,address` no request |
| Timeout 30s | AbortController no fetch do cliente |
| Erros visíveis | Box vermelho com mensagem exata |
| Atribuição DrySkin | `/api/atribuicao` — UTM + janela de cupom SP timezone |
| PAID set completo | 10 aliases válidos incluindo `payment_approved`, `in_separation`, etc. |
| include=status,promocode | Fetch da Yampi inclui cupom de forma confiável |
| Tiebreaker UTM vs Cupom | Quando conflito, disparo com data mais recente vence |
| Badge YAMPI no dash | Disparos sem preenchimento manual mostram valor Yampi com badge |
| Re-sync automático | 1.5s após fechar painel de edição de disparo |
| Debug endpoint | `?debug=1` retorna reconciliação completa + pedidos não atribuídos |

### ⚠️ Pendente / Próximos passos

| Item | Detalhe |
|------|---------|
| `app/api/yampi-debug/route.ts` | Deletar após confirmar que VIP está estável |
| DrySkin — integração VIP | Mudar guard de `brand.id !== 'noue'` para incluir `dryskin` |
| `sincronizar_vip.py` | Script Python legado — pode ser deletado |

---

## 12. Arquivos Críticos (ler antes de mexer)

| Arquivo | Por que é crítico |
|---------|------------------|
| `lib/yampi.ts` | Toda lógica da Dooki API — tipos, helpers, paginação |
| `app/vip/page.tsx` | `aggregateOrders` roda no cliente com dados brutos — muito sensível |
| `app/api/yampi/route.ts` | Cache em memória, validação de env vars |
| `lib/store.tsx` | Dual-sync localStorage+Supabase — cuidado com race conditions |
| `lib/brands.ts` | Adicionar/editar marcas aqui primeiro |

---

## 13. Fluxo de Deploy

```bash
# 1. Verificar TypeScript (obrigatório — zero erros)
npx tsc --noEmit

# 2. Commit com co-autoria
git add <arquivos específicos>
git commit -m "mensagem clara"

# 3. Push → Vercel deploya automaticamente
git push
```

**Branch:** `main` → deploy direto.  
**Vercel:** Runtime `nodejs`, `force-dynamic` em todas as rotas de API.

---

## 14. Problemas Conhecidos e Soluções

| Problema | Causa | Solução |
|---------|-------|---------|
| Timeout 30s na API | `/orders?filters[date]` escaneia tudo | Usar `/search/orders?utm_source[]=grupo_vip` que filtra no servidor |
| 429 Too Many Requests | Retry loops chamando Dooki repetidamente | Sem retry — fail-fast imediato |
| `X.slice is not a function` | `created_at` é objeto `{date, timezone}`, não string | `toIso(o.created_at).slice(0, 10)` |
| `object is not iterable` | `items`/`address` chegam como `{data:[]}` | `unwrapArray(o.items)` antes de iterar |
| Total = R$ 0 | `o.total` é string vazia; valor real em `o.value_total` | `orderValue(o)` que usa `value_total` primeiro |
| VIP aparecendo na DrySkin | Sem guard de marca | `if (brand.id !== 'noue') return <EmBreve />` |
| Build quebrado no Vercel | Erros TypeScript silenciosos | Sempre `npx tsc --noEmit` antes do push |
| Atribuição — pedidos faltando (payment_approved) | PAID set incompleto. Pedidos recém-aprovados ficam em `payment_approved`/`in_separation` e eram ignorados | Expandir PAID set para 10 aliases (ver Seção 10.2). **Corrigido 21/05/2026** |
| Atribuição — promocode não chegando | `include: 'status'` sem `promocode` não retorna o código do cupom em todos os pedidos | Mudar para `include: 'status,promocode'`. **Corrigido 21/05/2026** |
| UTM stale roubando atribuição | Cookie de sessão Yampi preserva UTM da campanha anterior; pedido com MAIO20 ia para disparo errado | Implementar tiebreaker por data: quando UTM e cupom apontam para disparos diferentes, o mais recente vence. **Corrigido 21/05/2026** |
| URL debug relativa não abre | Passar `/api/atribuicao?...` sem domínio não funciona como link | Sempre usar URL completa: `https://dashboard-api-noue.vercel.app/api/atribuicao?...` |

---

## 15. Contexto de Negócio

- **Nouê Cosméticos**: marca de cosméticos capilar, vende via e-commerce Yampi/Shopify.
- **Grupo VIP**: clientes que chegam via WhatsApp com UTM `utm_source=grupo_vip&utm_campaign=whatsapp`.
- **Disparos CRM**: campanhas enviadas via WhatsApp Business para bases segmentadas.
- **Métricas chave**: ROAS (faturamento ÷ investimento), taxa de entrega, taxa de leitura, ticket médio.
- **DrySkin**: segunda marca do mesmo grupo — dashboard conectado mas sem integração VIP ainda.
