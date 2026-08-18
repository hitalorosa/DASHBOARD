export type BrandId = 'noue' | 'dryskin' | 'newhair';

/**
 * Estado da integração do Grupo VIP por marca.
 *   'live'    → credenciais Yampi configuradas e painel liberado
 *   'standby' → painel pronto, mas ainda sem credenciais próprias.
 *               Fica atrás de uma tela de aviso com botão de pré-visualização.
 */
export type VipStatus = 'live' | 'standby';

export interface Brand {
  id: BrandId;
  name: string;
  logo: string;        // path in /public
  storageKey: string;  // localStorage key
  supabaseRowId: number;
  metaMensal: number;  // monthly revenue goal in BRL
  metaRoas: number;    // ROAS target (ex: 7 = 7x)
  /**
   * Marca fora de operação. Some do seletor e cai numa tela de manutenção,
   * mas NENHUM dado é apagado — Supabase, localStorage e env vars ficam intactos.
   * Visível apenas com o modo arquivo destravado (ver lib/archive-mode.ts).
   */
  archived?: boolean;
  vip: VipStatus;
  /** Prefixo das env vars da Yampi. Vazio = sem prefixo (YAMPI_ALIAS, ...). */
  yampiEnvPrefix: string;
}

export const BRANDS: Brand[] = [
  {
    id: 'noue',
    name: 'Nouê Cosméticos',
    logo: '/logo-noue.png',
    storageKey: 'noue-dash-v1',
    supabaseRowId: 1,
    metaMensal: 200000,
    metaRoas: 7,
    archived: true,
    vip: 'live',
    yampiEnvPrefix: '',
  },
  {
    id: 'dryskin',
    name: 'DrySkin',
    logo: '/logo-dryskin.png',
    storageKey: 'dryskin-dash-v1',
    supabaseRowId: 2,
    metaMensal: 25000,
    metaRoas: 7,
    vip: 'standby',
    yampiEnvPrefix: 'DRYSKIN_',
  },
  {
    id: 'newhair',
    name: 'New Hair',
    logo: '/logo-newhair.svg',
    storageKey: 'newhair-dash-v1',
    supabaseRowId: 3,
    metaMensal: 150000,
    metaRoas: 7,
    vip: 'standby',
    yampiEnvPrefix: 'NEWHAIR_',
  },
];

/** Marcas em operação — o que o dashboard mostra por padrão. */
export const ACTIVE_BRANDS = BRANDS.filter((b) => !b.archived);

export const DEFAULT_BRAND = ACTIVE_BRANDS[0];

/** Lista para os seletores: inclui as arquivadas só com o modo arquivo destravado. */
export function visibleBrands(showArchived: boolean): Brand[] {
  return showArchived ? BRANDS : ACTIVE_BRANDS;
}

export function findBrand(id: string | null | undefined): Brand | undefined {
  return BRANDS.find((b) => b.id === id);
}
