/**
 * Tokens do design "Painel Vante" (Claude Design, projeto "Redesign do site Dryskin").
 *
 * O projeto estiliza por `style={{}}` inline, não por classes utilitárias — então os
 * tokens vivem aqui em vez de no tailwind.config. Importe daqui em vez de repetir hex.
 */

export const C = {
  // superfícies
  bg:        '#F9FCFB', // fundo da página
  surface:   '#FFFFFF', // cartão
  surfaceAlt:'#E2F1EC', // cartão de destaque (menta claro)
  surfaceMut:'#F0F7F5', // trilho de barra, chip neutro
  rail:      '#E4EAE9', // cabeçalho de tabela / moldura de grade
  railBorder:'#CBD6D3',

  // traços
  border:    '#E2F1EC', // borda padrão de cartão
  borderMid: '#C9DED7', // borda de input / botão secundário
  borderSoft:'#E4EFEB', // divisória interna de lista

  // texto
  ink:       '#17302C', // texto principal (verde quase preto)
  inkSoft:   '#557069', // texto secundário
  inkMut:    '#9BB3AC', // placeholder / texto apagado
  inkRail:   '#2C4A44', // rótulo sobre faixa cinza-esverdeada

  // marca
  primary:   '#2E9C86', // ação principal
  primaryDeep:'#1F7A68', // sombra sólida do botão + link
  accent:    '#43B89F', // realce / foco
  onDark:    '#7FA79E', // texto secundário sobre fundo escuro

  // atenção (usado em ROAS médio, avisos, fim de mês)
  warn:      '#FFE9A8',
  warnInk:   '#8A6C00',
  warnBg:    '#FFF6DC',
  warnBorder:'#C9A227',
} as const;

export const FONT = {
  display: "'Archivo', system-ui, sans-serif",
  body:    "'Inter', system-ui, sans-serif",
  mono:    "ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

/** Rótulo pequeno em caixa alta monoespaçada — o "eyebrow" que se repete em todo bloco. */
export function eyebrow(color: string = C.inkSoft, size = 9): React.CSSProperties {
  return {
    fontFamily: FONT.mono,
    fontSize: size,
    letterSpacing: '.14em',
    textTransform: 'uppercase',
    color,
  };
}

/** Título de bloco. */
export function heading(size = 19): React.CSSProperties {
  return {
    fontFamily: FONT.display,
    fontWeight: 800,
    fontSize: size,
    letterSpacing: '-.02em',
    margin: 0,
  };
}

/** Número grande de KPI. */
export function metric(size = 30): React.CSSProperties {
  return {
    fontFamily: FONT.display,
    fontWeight: 800,
    fontSize: size,
    letterSpacing: '-.02em',
    lineHeight: 1.1,
    fontVariantNumeric: 'tabular-nums',
  };
}

export const CARD: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 20,
};

export const INPUT: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  border: `1px solid ${C.borderMid}`,
  borderRadius: 10,
  background: C.bg,
  color: C.ink,
};

/** Botão primário — o "empurrado" com sombra sólida embaixo. */
export const BTN_PRIMARY: React.CSSProperties = {
  background: C.primary,
  color: '#fff',
  fontFamily: FONT.display,
  fontWeight: 700,
  fontSize: 15,
  padding: '13px 22px',
  border: 0,
  borderRadius: 12,
  boxShadow: `0 5px 0 ${C.primaryDeep}`,
  cursor: 'pointer',
};

export const BTN_GHOST: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.borderMid}`,
  borderRadius: 10,
  padding: '12px 18px',
  fontSize: 13,
  fontWeight: 600,
  color: C.inkSoft,
  cursor: 'pointer',
};

const PILL_BASE: React.CSSProperties = {
  display: 'inline-block',
  fontFamily: FONT.mono,
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '.04em',
  padding: '3px 9px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
};

/** ROAS: ≥7 bom · ≥4 atenção · >0 ruim · 0 ainda não medido. */
export function roasPill(r: number): React.CSSProperties {
  if (!r) return { ...PILL_BASE, padding: '2px 8px', background: 'transparent', border: `1px dashed ${C.borderMid}`, color: C.inkMut };
  if (r >= 7) return { ...PILL_BASE, background: C.primary, color: '#fff' };
  if (r >= 4) return { ...PILL_BASE, background: C.warn, color: C.ink };
  return { ...PILL_BASE, background: C.ink, color: '#fff' };
}

export function roasTexto(r: number): string {
  return r ? `${r.toFixed(1)}x` : 'A preencher';
}

/** Tipo de campanha — Fim de Mês recebe destaque, o resto é neutro. */
export function tipoPill(isFimMes: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-block',
    fontFamily: FONT.mono,
    fontSize: 9,
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: 999,
    whiteSpace: 'nowrap',
    flex: 'none',
  };
  return isFimMes
    ? { ...base, background: C.warn, color: C.ink }
    : { ...base, background: C.surfaceMut, border: `1px solid ${C.border}`, color: C.inkSoft };
}

/** Decisão de base. */
export function decisaoPill(d: string): React.CSSProperties {
  if (d === 'reenviar')  return { ...PILL_BASE, background: C.primary, color: '#fff' };
  if (d === 'monitorar') return { ...PILL_BASE, background: C.surfaceAlt, color: C.primaryDeep };
  if (d === 'testar')    return { ...PILL_BASE, background: C.warn, color: C.ink };
  if (d === 'descartar') return { ...PILL_BASE, background: C.ink, color: '#fff' };
  return { ...PILL_BASE, background: 'transparent', border: `1px dashed ${C.borderMid}`, color: C.inkMut };
}

/** Status de pedido da Yampi. */
export function statusPedidoPill(label: string): React.CSSProperties {
  if (label === 'Cancelado') return { ...PILL_BASE, background: C.ink, color: '#fff' };
  if (label === 'Pago' || label === 'Pagto. aprovado' || label === 'Aprovado')
    return { ...PILL_BASE, background: C.surfaceAlt, color: C.primaryDeep };
  return { ...PILL_BASE, background: C.surfaceMut, color: C.inkSoft, border: `1px solid ${C.border}` };
}

export function fmtBRL(n: number, comCentavos = false): string {
  return comCentavos
    ? `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `R$ ${Math.round(n).toLocaleString('pt-BR')}`;
}
