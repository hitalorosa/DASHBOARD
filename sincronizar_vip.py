"""
Sincronizador VIP — Nouê Cosméticos
Rode este script no seu computador para sincronizar os dados do Grupo VIP.

Requisito: pip install requests
"""

import requests as req_lib
from datetime import datetime, timezone, timedelta
import calendar, time, json

# ── Configurações ─────────────────────────────────────────────────────────────

YAMPI_ALIAS  = 'noue-cosmeticos'
YAMPI_TOKEN  = '3BoVPpsSXiYyHE8GVkWMIYeTtWcXDbDItu96hXXt'
YAMPI_SECRET = 'sk_Zbv1QobeoUbb5svbWWIn3D7DqGRz7SyibCrHQ'

WORKER_URL    = 'https://yampi-proxy.hitalo-rosabr.workers.dev'
WORKER_SECRET = 'noue-vip-2026-xK9mP'

# ── Mês/ano a sincronizar ─────────────────────────────────────────────────────

BRT   = timezone(timedelta(hours=-3))
now   = datetime.now(BRT)
MONTH = now.month   # mude se quiser outro mês
YEAR  = now.year    # mude se quiser outro ano

# ─────────────────────────────────────────────────────────────────────────────

YAMPI_HEADERS = {
    'User-Token':      YAMPI_TOKEN,
    'User-Secret-Key': YAMPI_SECRET,
    'Accept':          'application/json',
    'Content-Type':    'application/json',
}

# Dooki v2 — endpoint correto (não api.yampi.io)
BASE_URL = f'https://api.dooki.com.br/v2/{YAMPI_ALIAS}'

PAID_STATUSES = {
    'paid', 'payment_approved', 'approved',
    'handling_products', 'in_separation', 'invoiced',
    'ready_for_shipping', 'on_carriage', 'shipped', 'delivered',
}

def is_vip(tracking):
    return (
        (tracking or {}).get('utm_source')   == 'grupo_vip' and
        (tracking or {}).get('utm_campaign') == 'whatsapp'
    )

def fetch_with_retry(url, params):
    for attempt in range(5):
        res = req_lib.get(url, headers=YAMPI_HEADERS, params=params, timeout=30)
        if res.status_code != 429:
            return res
        wait = (attempt + 1) * 2
        print(f'    429 rate-limit — aguardando {wait}s...')
        time.sleep(wait)
    return res

def extract_items(data):
    d = data.get('data') or {}
    if isinstance(d, list):
        return d
    return d.get('data') or d.get('items') or data.get('items') or []

def fetch_all_pages(endpoint: str, params: dict) -> list:
    results = []
    LIMIT   = 50
    BATCH   = 3

    # Página 1 → descobrir total de páginas
    p1 = {**params, 'page': 1, 'limit': LIMIT, 'skipCache': 'true',
          'include': 'customer,status,transactions'}
    res = fetch_with_retry(f'{BASE_URL}/{endpoint}', p1)

    if not res.ok:
        print(f'  [ERRO] {endpoint} p1: {res.status_code} — {res.text[:300]}')
        return []

    data       = res.json()
    items      = extract_items(data)
    results.extend(items)
    last_page  = (
        (data.get('data') or {}).get('last_page') or
        (data.get('meta') or {}).get('last_page') or 1
    )
    print(f'  Página 1/{last_page} — {len(items)} itens')

    for start in range(2, last_page + 1, BATCH):
        for bp in range(start, min(start + BATCH, last_page + 1)):
            pp = {**params, 'page': bp, 'limit': LIMIT, 'skipCache': 'true',
                  'include': 'customer,status,transactions'}
            r  = fetch_with_retry(f'{BASE_URL}/{endpoint}', pp)
            if r.ok:
                bi = extract_items(r.json())
                results.extend(bi)
                print(f'  Página {bp}/{last_page} — {len(bi)} itens')
            else:
                print(f'  [ERRO] p{bp}: {r.status_code}')

    return results


def main():
    last_day = calendar.monthrange(YEAR, MONTH)[1]
    date_min = f'{YEAR}-{MONTH:02d}-01'
    date_max = f'{YEAR}-{MONTH:02d}-{last_day}'

    print(f'\n=== Sincronizando VIP: {MONTH:02d}/{YEAR} ===')
    print(f'Período: {date_min} → {date_max}\n')

    # Pedidos pagos com UTM do grupo VIP
    print('Buscando pedidos (Dooki v2)...')
    raw_orders = fetch_all_pages('orders', {
        'date':         f'created_at:{date_min}|{date_max}',
        'utm_source':   'grupo_vip',
        'utm_campaign': 'whatsapp',
    })
    # Filtro duplo: status pago + ambas UTMs
    orders = [
        o for o in raw_orders
        if o.get('status') in PAID_STATUSES and is_vip(o.get('tracking'))
    ]
    print(f'  ✓ {len(orders)} pedidos VIP pagos (de {len(raw_orders)} retornados)\n')

    # Carrinhos abandonados
    print('Buscando carrinhos abandonados...')
    carts = []
    try:
        raw_carts = fetch_all_pages('carts', {
            'date':         f'created_at:{date_min}|{date_max}',
            'utm_source':   'grupo_vip',
            'utm_campaign': 'whatsapp',
        })
        carts = [c for c in raw_carts if is_vip(c.get('tracking'))]
        print(f'  ✓ {len(carts)} carrinhos VIP (de {len(raw_carts)} retornados)\n')
    except Exception as e:
        print(f'  (carrinhos não disponíveis: {e})\n')

    # Envia para o Worker → salva no KV
    print('Enviando dados para o dashboard...')
    res = req_lib.post(
        f'{WORKER_URL}/store',
        json={'orders': orders, 'carts': carts, 'month': MONTH, 'year': YEAR},
        headers={'X-Dashboard-Key': WORKER_SECRET, 'Content-Type': 'application/json'},
        timeout=60,
    )

    if res.ok:
        result = res.json()
        print(f'  ✓ Dados salvos! Chave: {result.get("key")}')
        print(f'  ✓ {result.get("orders")} pedidos | {result.get("carts")} carrinhos')
        print('\n✅ Sincronização concluída! Atualize o dashboard.')
    else:
        print(f'  ✗ Erro ao salvar: {res.status_code} — {res.text}')


if __name__ == '__main__':
    main()
