/**
 * Navegação e níveis de acesso.
 *
 * Os três níveis vêm do design "Painel Vante": cada senha abre um recorte do painel.
 * A senha de cada nível é configurada por env var (ver app/api/auth/login/route.ts).
 */

export type Area = 'central' | 'calendario' | 'disparos' | 'bases' | 'vip';
export type Nivel = 'total' | 'financeiro' | 'conteudo';

export const NIVEIS: Nivel[] = ['total', 'financeiro', 'conteudo'];

export function isNivel(v: unknown): v is Nivel {
  return typeof v === 'string' && (NIVEIS as string[]).includes(v);
}

/** Quais áreas cada nível enxerga. A ordem define qual é a área inicial. */
export const AREAS_POR_NIVEL: Record<Nivel, Area[]> = {
  total:      ['central', 'calendario', 'disparos', 'bases', 'vip'],
  financeiro: ['central', 'disparos', 'bases', 'vip'],
  conteudo:   ['calendario', 'disparos'],
};

export interface NavItem {
  area: Area;
  href: string;
  rotulo: string;
  rotuloCurto: string;
  /** Glifo em vez de ícone de biblioteca — ver nota sobre lucide/OneDrive no README. */
  icone: string;
  /** Linha pequena acima do título, no header. `{marca}` é substituído em runtime. */
  eyebrow: string;
}

export const NAV: Record<Area, NavItem> = {
  central:    { area: 'central',    href: '/',           rotulo: 'Central',    rotuloCurto: 'Central',  icone: '◧', eyebrow: 'visão do mês' },
  calendario: { area: 'calendario', href: '/calendario', rotulo: 'Calendário', rotuloCurto: 'Agenda',   icone: '▦', eyebrow: 'planejamento' },
  disparos:   { area: 'disparos',   href: '/disparos',   rotulo: 'Disparos',   rotuloCurto: 'Disparos', icone: '➤', eyebrow: 'execução e resultado' },
  bases:      { area: 'bases',      href: '/bases',      rotulo: 'Bases',      rotuloCurto: 'Bases',    icone: '◍', eyebrow: 'decisão por segmento' },
  vip:        { area: 'vip',        href: '/vip',        rotulo: 'Grupo VIP',  rotuloCurto: 'VIP',      icone: '♛', eyebrow: 'relatório de canal' },
};

/**
 * Rotas de API que servem dados de uma área específica.
 *
 * Sem isto, um nível sem acesso à tela do Grupo VIP ainda conseguiria ler
 * `/api/yampi` direto e ver os pedidos. **Toda rota de API nova que devolva
 * dados de uma área precisa ser mapeada aqui** — o que não estiver na lista
 * fica liberado para qualquer sessão válida.
 */
const API_AREA: { prefixo: string; area: Area }[] = [
  { prefixo: '/api/yampi',      area: 'vip' },
  { prefixo: '/api/atribuicao', area: 'disparos' },
];

export function areaDaRota(pathname: string): Area | null {
  if (pathname.startsWith('/api/')) {
    return API_AREA.find((r) => pathname.startsWith(r.prefixo))?.area ?? null;
  }
  if (pathname === '/') return 'central';
  const hit = (Object.keys(NAV) as Area[]).find((a) => a !== 'central' && pathname.startsWith(NAV[a].href));
  return hit ?? null;
}

export function areasDoNivel(nivel: Nivel): Area[] {
  return AREAS_POR_NIVEL[nivel] ?? AREAS_POR_NIVEL.total;
}

export function podeAcessar(nivel: Nivel, area: Area | null): boolean {
  if (!area) return true; // rota fora do mapa (ex.: 404) não é barrada aqui
  return areasDoNivel(nivel).includes(area);
}
