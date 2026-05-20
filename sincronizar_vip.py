"""
Sincronizador VIP — Nouê Cosméticos
Rode este script no seu computador para sincronizar os dados do Grupo VIP.

Requisito: pip install requests
"""

import cloudscraper
import requests
from datetime import datetime
import calendar

# ── Configurações ─────────────────────────────────────────────────────────────

YAMPI_ALIAS  = 'noue-cosmeticos'
YAMPI_TOKEN  = '3BoVPpsSXiYyHE8GVkWMIYeTtWcXDbDItu96hXXt'
YAMPI_SECRET = 'sk_Zbv1QobeoUbb5svbWWIn3D7DqGRz7SyibCrHQ'

WORKER_URL    = 'https://yampi-proxy.hitalo-rosabr.workers.dev'
WORKER_SECRET = 'noue-vip-2026-xK9mP'

# ── Mês/ano a sincronizar ─────────────────────────────────────────────────────

MONTH = datetime.now().month   # mês atual (mude se quiser outro mês)
YEAR  = datetime.now().year    # ano atual

# ─────────────────────────────────────────────────────────────────────────────

YAMPI_HEADERS = {
    'User-Token':      YAMPI_TOKEN,
    'User-Secret-Key': YAMPI_SECRET,
    'Accept':          'application/json',
    'Content-Type':    'application/json',
}

BASE_URL = f'https://api.yampi.io/v1/{YAMPI_ALIAS}'

# cloudscraper resolve o desafio JS do Cloudflare automaticamente
scraper = cloudscraper.create_scraper(browser='chrome')


def fetch_all_pages(endpoint: str, params: dict) -> list:
    results = []
    page = 1
    while True:
        p = {**params, 'page': page, 'limit': 100}
        res = scraper.get(f'{BASE_URL}/{endpoint}', headers=YAMPI_HEADERS, params=p, timeout=30)

        if not res.ok:
            print(f'  [ERRO] {endpoint} página {page}: {res.status_code} — {res.text[:200]}')
            break

        data = res.json()
        items = (
            data.get('data', {}).get('data')
            or data.get('data', {}).get('items')
            or data.get('items')
            or (data['data'] if isinstance(data.get('data'), list) else None)
            or []
        )
        results.extend(items)

        total_pages = (
            (data.get('data') or {}).get('last_page')
            or (data.get('data') or {}).get('pagination', {}).get('total_pages')
            or (data.get('meta') or {}).get('last_page')
            or 1
        )
        print(f'  Página {page}/{total_pages} — {len(items)} itens')
        if page >= total_pages or not items:
            break
        page += 1
    return results


def main():
    last_day = calendar.monthrange(YEAR, MONTH)[1]
    date_min = f'{YEAR}-{MONTH:02d}-01'
    date_max = f'{YEAR}-{MONTH:02d}-{last_day}'

    print(f'\n=== Sincronizando VIP: {MONTH:02d}/{YEAR} ===')
    print(f'Período: {date_min} → {date_max}\n')

    # Pedidos pagos com UTM do grupo VIP
    print('Buscando pedidos...')
    orders = fetch_all_pages('orders', {
        'utm_source':     'grupo_vip',
        'utm_campaign':   'whatsapp',
        'status':         'paid',
        'created_at_min': date_min,
        'created_at_max': date_max,
    })
    print(f'  ✓ {len(orders)} pedidos encontrados\n')

    # Carrinhos abandonados
    print('Buscando carrinhos abandonados...')
    carts = []
    try:
        carts = fetch_all_pages('carts', {
            'utm_source':     'grupo_vip',
            'utm_campaign':   'whatsapp',
            'created_at_min': date_min,
            'created_at_max': date_max,
        })
        print(f'  ✓ {len(carts)} carrinhos encontrados\n')
    except Exception as e:
        print(f'  (carrinhos não disponíveis: {e})\n')

    # Envia para o Worker → salva no KV
    print('Enviando dados para o dashboard...')
    res = requests.post(
        f'{WORKER_URL}/store',
        json={'orders': orders, 'carts': carts, 'month': MONTH, 'year': YEAR},
        headers={'X-Dashboard-Key': WORKER_SECRET, 'Content-Type': 'application/json'},
        timeout=30,
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
