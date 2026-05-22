# Contexto de Debug — Sistema de Atribuição de Vendas (DrySkin Dashboard)

## Objetivo do sistema

Rota Next.js `GET /api/atribuicao?month=4&year=2026&brand=dryskin` que:
1. Lê disparos de WhatsApp do Supabase (tabela `dash_store`, id=2, coluna `data` jsonb)
2. Busca pedidos do mês na Yampi/Dooki v2 API
3. Atribui cada pedido pago a um disparo usando hierarquia:
   - **Regra 1 (UTM):** `order.utm_source + order.utm_campaign` batem com URL do disparo → atribui
   - **Regra 2 (Cupom + janela temporal):** `promocode.data.code` bate com cupom do disparo, dentro da janela de datas
   - **Regra 3:** sem match → ignora
4. Retorna `[{ id, faturamento, pedidos }]` por disparo

---

## Estrutura dos dados

### Supabase — `dash_store` row id=2

```json
{
  "customDisparos": [
    { "id": "c-1779374009763", "data": "2026-05-21", "campanha": "PAGAMENTO RECUSADO", ... }
  ],
  "disparoContent": {
    "c-1779374009763": {
      "utms": ["https://oferta.dryskin.com.br/?utm_source=car&utm_medium=whatsapp&utm_campaign=21-05"],
      "cupom": "MAIO20"
    }
  }
}
```

### Yampi/Dooki v2 — Pedido (campos relevantes)

```json
{
  "id": 163013496,
  "created_at": {
    "date": "2026-05-21 22:16:19.000000",
    "timezone": "America/Sao_Paulo",
    "timezone_type": 3
  },
  "utm_source": null,
  "utm_campaign": null,
  "promocode_id": 7902462,
  "promocode": {
    "data": {
      "code": "MAIO20",
      "id": 7902462
    }
  },
  "status": {
    "data": { "alias": "paid" }
  },
  "value_total": 155.75
}
```

**Armadilhas confirmadas da Dooki v2:**
- `created_at` é objeto `{ date, timezone, timezone_type }` — NÃO string
- `promocode_id` é um número inteiro (ID interno) — NÃO o código do cupom
- O código do cupom está em `promocode.data.code`
- `promocode.data` pode ser `[]` (array vazio) quando não há cupom
- UTMs ficam no nível raiz do pedido: `order.utm_source`, `order.utm_campaign`

---

## Output do debug (`?debug=1`) — estado atual

```json
{
  "month_recebido": 4,
  "month_usado": 5,
  "monthPrefix": "2026-05",
  "disparos_encontrados": [
    { "id": "c-1778793207274", "data": "2026-05-15" },
    { "id": "c-1779110812740", "data": "2026-05-19" },
    { "id": "c-1779115503700", "data": "2026-05-05" },
    { "id": "c-1779115522843", "data": "2026-05-06" },
    { "id": "c-1779115545042", "data": "2026-05-10" },
    { "id": "c-1779280589278", "data": "2026-05-20" },
    { "id": "c-1779311395280", "data": "2026-05-22" },
    { "id": "c-1779374009763", "data": "2026-05-21" }
  ],
  "utmMap": {
    "pagamento|15-05": "c-1778793207274",
    "car|21-05": "c-1779374009763"
  },
  "couponWindows": {
    "MAIO20": [
      { "disparo_id": "c-1778793207274", "from": "2026-05-15T03:00:00.000Z", "to": "2026-05-19T02:59:59.000Z" },
      { "disparo_id": "c-1779110812740", "from": "2026-05-19T03:00:00.000Z", "to": "2026-05-20T02:59:59.000Z" },
      { "disparo_id": "c-1779280589278", "from": "2026-05-20T03:00:00.000Z", "to": "2026-05-21T02:59:59.000Z" },
      { "disparo_id": "c-1779374009763", "from": "2026-05-21T03:00:00.000Z", "to": "sem limite" }
    ],
    "GANHEI20": [
      { "disparo_id": "c-1779311395280", "from": "2026-05-22T03:00:00.000Z", "to": "sem limite" }
    ]
  },
  "total_pedidos_yampi": 821,
  "total_pedidos_pagos": 510
}
```

**Resultado da atribuição atual (ERRADO — 21/05 deveria ter 4+ pedidos):**
```json
[
  { "id": "c-1778793207274", "faturamento": 1393.58, "pedidos": 11 },
  { "id": "c-1779374009763", "faturamento": 155.75,  "pedidos": 1  },
  { "id": "c-1779110812740", "faturamento": 0,       "pedidos": 0  },
  ...todos os outros zerados...
]
```

---

## Código atual da rota (`app/api/atribuicao/route.ts`)

```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SP_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC-3

const PAID = new Set(['paid', 'on_carriage', 'shipped', 'delivered', 'complete', 'completed']);

// Converte created_at da Dooki para UTC ms
function orderUtcMs(createdAt: unknown): number {
  const iso = toIso(createdAt); // retorna "2026-05-21T22:16:19.000000" (sem offset)
  if (!iso) return 0;
  const hasOffset = /[Z+\-]\d{2}:?\d{2}$/.test(iso) || iso.endsWith('Z');
  const ms = new Date(iso).getTime();
  return hasOffset ? ms : ms + SP_OFFSET_MS; // +3h para corrigir SP → UTC
}

// Converte "YYYY-MM-DD" + hora SP → timestamp UTC ms
// Midnight SP (00:00) = UTC 03:00
function spDateToUtcMs(dateStr: string, hour = 0, min = 0, sec = 0): number {
  const utcMs = Date.UTC(
    parseInt(dateStr.slice(0, 4)),
    parseInt(dateStr.slice(5, 7)) - 1,
    parseInt(dateStr.slice(8, 10)),
    hour, min, sec,
  );
  return utcMs + SP_OFFSET_MS;
}

// Leitura do cupom no pedido Yampi
const promocode = order.promocode as { data?: { code?: string } | unknown[] } | undefined;
const promoData = Array.isArray(promocode?.data) ? null : promocode?.data as { code?: string } | undefined;
const couponRaw = promoData?.code ?? '';
const coupon    = couponRaw.trim().toUpperCase();

// Set de status pagos
const PAID = new Set(['paid', 'on_carriage', 'shipped', 'delivered', 'complete', 'completed']);
```

---

## O que já foi testado e corrigido

| # | Bug | Status |
|---|-----|--------|
| 1 | API lia `row.data.disparos` (sempre vazio) — correto é `customDisparos` | ✅ Corrigido |
| 2 | `month` chegava 0-indexed (4=maio) mas API usava como 1-indexed → buscava abril | ✅ Corrigido |
| 3 | Cupom: usava `promocode_id` (número ex: 7902462) em vez de `promocode.data.code` (string "MAIO20") | ✅ Corrigido |
| 4 | `toIso()` retorna data SP sem offset → Node.js interpretava como UTC (3h errado) | ✅ Corrigido com +SP_OFFSET_MS |
| 5 | 21/05 só retorna 1 pedido em vez de 4+ | ❌ AINDA ABERTO |

---

## Hipóteses não testadas para o bug #5

### Hipótese A — Set PAID incompleto
O `PAID` set da rota de atribuição tem apenas:
```
'paid', 'on_carriage', 'shipped', 'delivered', 'complete', 'completed'
```
Mas o `lib/yampi.ts` (que funciona no VIP) tem mais aliases:
```
'paid', 'payment_approved', 'approved', 'handling_products',
'in_separation', 'invoiced', 'ready_for_shipping', 'on_carriage',
'shipped', 'delivered'
```
**Pedidos com status `payment_approved`, `in_separation`, etc. são filtrados fora antes do match de cupom.**

### Hipótese B — Regex de offset falha para o formato Dooki
O `toIso()` retorna `"2026-05-21T22:16:19.000000"` (com microsegundos).
O regex `/[Z+\-]\d{2}:?\d{2}$/` testa o FIM da string — mas o fim é `".000000"`, não um offset.
**Resultado: `hasOffset = false` ✓ — o +3h é aplicado.** (Parece correto, mas confirmar)

### Hipótese C — `include: 'status'` não traz `promocode` para todos os pedidos
A busca usa `include=status`. O campo `promocode` pode não vir em todos os pedidos dependendo do endpoint/versão da Dooki.

### Hipótese D — Pedidos com UTM de Facebook sendo filtrados na Regra 1
Pedidos do Facebook têm `utm_source=facebook`. Se `facebook|[campanha]` bater com algum utmMap entry, a Regra 1 atribui ao disparo errado e a Regra 2 (cupom) nunca é avaliada.

---

## Pergunta central pro Gemini

Dado o debug acima, com as janelas de cupom corretas e 510 pedidos pagos no mês, por que apenas 1 pedido MAIO20 vai para o disparo `c-1779374009763` (21/05) em vez de 4+?

O campo `maio20_orders` do debug (adicionado na última versão) vai mostrar todos os pedidos MAIO20 com `ts_utc`, `janela_bateu` e `utm_source`. Mas ainda não temos esse retorno em mãos.

**Suspeita principal:** Hipótese A (PAID set incompleto) — pedidos com status `payment_approved` ou `in_separation` estão sendo ignorados.
