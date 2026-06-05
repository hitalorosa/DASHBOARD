export type BrandId = 'noue' | 'dryskin' | 'newhair';

export interface Brand {
  id: BrandId;
  name: string;
  logo: string;        // path in /public
  storageKey: string;  // localStorage key
  supabaseRowId: number;
  metaMensal: number;  // monthly revenue goal in BRL
  metaRoas: number;    // ROAS target (ex: 7 = 7x)
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
  },
  {
    id: 'dryskin',
    name: 'DrySkin',
    logo: '/logo-dryskin.png',
    storageKey: 'dryskin-dash-v1',
    supabaseRowId: 2,
    metaMensal: 25000,
    metaRoas: 7,
  },
  {
    id: 'newhair',
    name: 'New Hair',
    logo: '/logo-newhair.png',
    storageKey: 'newhair-dash-v1',
    supabaseRowId: 3,
    metaMensal: 150000,
    metaRoas: 7,
  },
];

export const DEFAULT_BRAND = BRANDS[0];
