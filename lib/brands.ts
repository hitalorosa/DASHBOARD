export type BrandId = 'noue' | 'dryskin';

export interface Brand {
  id: BrandId;
  name: string;
  logo: string;        // path in /public
  storageKey: string;  // localStorage key
  supabaseRowId: number;
  metaMensal: number;  // monthly revenue goal in BRL
}

export const BRANDS: Brand[] = [
  {
    id: 'noue',
    name: 'Nouê Cosméticos',
    logo: '/logo-noue.png',
    storageKey: 'noue-dash-v1',
    supabaseRowId: 1,
    metaMensal: 200000,
  },
  {
    id: 'dryskin',
    name: 'DrySkin',
    logo: '/logo-dryskin.png',
    storageKey: 'dryskin-dash-v1',
    supabaseRowId: 2,
    metaMensal: 25000,
  },
];

export const DEFAULT_BRAND = BRANDS[0];
