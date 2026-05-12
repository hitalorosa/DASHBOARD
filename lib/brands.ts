export type BrandId = 'noue' | 'dryskin';

export interface Brand {
  id: BrandId;
  name: string;
  logo: string;        // path in /public
  storageKey: string;  // localStorage key
  supabaseRowId: number;
}

export const BRANDS: Brand[] = [
  {
    id: 'noue',
    name: 'Nouê Cosméticos',
    logo: '/logo-noue.png',
    storageKey: 'noue-dash-v1',
    supabaseRowId: 1,
  },
  {
    id: 'dryskin',
    name: 'DrySkin',
    logo: '/logo-dryskin.png',
    storageKey: 'dryskin-dash-v1',
    supabaseRowId: 2,
  },
];

export const DEFAULT_BRAND = BRANDS[0];
