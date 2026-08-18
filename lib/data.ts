import { Disparo, Base, DataSazonal } from './types';

export const META_MENSAL = 200000;

function empty(id: string, data: string, campanha: string, tipo: Disparo['tipo'], base: string): Disparo {
  return { id, data, campanha, tipo, base, tamanhoBase: 0, enviados: 0, taxaEntrega: 0, entregas: 0, taxaLeitura: 0, cliques: 0, cotacaoUsd: 0, investimentoUsd: 0, investimentoBrl: 0, faturamentoPago: 0, pedidos: 0, ticketMedio: 0, roas: 0, observacoes: '' };
}

export const disparosMaio: Disparo[] = [
  empty('1',  '2026-05-05', 'Oferta 05/05',           'sazonal',        'Base Toda'),
  empty('2',  '2026-05-06', 'Ressaca 05/05',           'ressaca',        'Nao Compraram 05/05'),
  empty('3',  '2026-05-08', 'Esquenta Mes das Maes',   'esquenta',       'Base Toda'),
  empty('4',  '2026-05-09', 'Esquenta Mes das Maes',   'esquenta',       'Carrinho Abandonado 60d'),
  empty('5',  '2026-05-10', 'Dia das Maes',            'sazonal',        'Base Toda'),
  empty('6',  '2026-05-11', 'Ressaca Dia das Maes',    'ressaca',        'Nao Compraram Dia das Maes'),
  empty('7',  '2026-05-13', 'LP Tonalizantes',         'produto',        'Base Toda'),
  empty('8',  '2026-05-15', 'Disparo da Madrugada',    'comportamental', 'Clientes Noturnos'),
  empty('9',  '2026-05-18', 'Oferta Necessaire',       'brinde',         'Base Toda'),
  empty('10', '2026-05-20', 'Quarta Relampago',        'sazonal',        'Base Toda'),
  empty('11', '2026-05-22', 'Disparo Base Popup',      'comportamental', 'Vieram do Popup'),
  empty('12', '2026-05-24', 'LP Tonalizantes',         'produto',        'Carrinho Abandonado Camuflage'),
  empty('13', '2026-05-26', 'Body Splash',             'brinde',         'Nunca Compraram'),
  empty('14', '2026-05-29', 'Oferta Fim de Mes',       'fimmes',         'Base Toda'),
  empty('15', '2026-05-30', 'Oferta Fim de Mes',       'fimmes',         'Nao Compraram 29/05'),
  empty('16', '2026-05-31', 'Oferta Fim de Mes',       'fimmes',         'Carrinho Abandonado Geral'),
];

// Igual ao empty(), mas já com o tamanho da base (alcance planejado do disparo).
function seed(id: string, data: string, campanha: string, tipo: Disparo['tipo'], base: string, tamanhoBase: number): Disparo {
  return { ...empty(id, data, campanha, tipo, base), tamanhoBase };
}

/**
 * Planejamento de disparos da DrySkin — Agosto/2026.
 * Esqueleto pronto (data, campanha, tipo, base, alcance); copy e resultados
 * entram depois pela UII. IDs estáveis com prefixo 'da-' (dryskin/agosto) —
 * como não começam com 'c-', o store os trata como disparos fixos editáveis.
 */
export const disparosAgostoDryskin: Disparo[] = [
  seed('da-1',  '2026-08-14', 'Promessas',                   'comportamental', 'Promessas · recompra 60–96d',       1127),
  seed('da-2',  '2026-08-18', 'Pix Não Pago',                'comportamental', 'Pix não pago',                        707),
  seed('da-3',  '2026-08-19', 'VIP · Acesso Antecipado',     'comportamental', 'VIP · 4+ compras',                    408),
  seed('da-4',  '2026-08-20', 'Carrinho Abandonado',         'comportamental', 'Carrinho Abandonado',                2954),
  seed('da-5',  '2026-08-21', 'Quase Dormentes',             'comportamental', 'Quase Dormentes · 97–143d',          1118),
  seed('da-6',  '2026-08-22', 'Popup · Lead Frio',           'comportamental', 'Popup · nunca compraram',            8000),
  seed('da-7',  '2026-08-24', 'Novos Clientes · Upgrade',    'comportamental', 'Novos Clientes · até 59d',           1067),
  seed('da-8',  '2026-08-26', 'Carrinho Abandonado · 2ª rodada', 'comportamental', 'Carrinho Abandonado',            2900),
  seed('da-9',  '2026-08-27', 'Perdidos Recentemente',       'comportamental', 'Perdidos · 144–365d',                1432),
  seed('da-10', '2026-08-28', 'Hibernando',                  'comportamental', 'Hibernando · 144–365d',              1041),
  seed('da-11', '2026-08-29', 'Fim de Mês ① · Coringas',     'fimmes',         'Coringas · popup+carrinho+pix',     11700),
  seed('da-12', '2026-08-30', 'Fim de Mês ② · Base Toda',    'fimmes',         'Base de Compradores',                8738),
  seed('da-13', '2026-08-31', 'Fim de Mês ③ · Último Dia',   'fimmes',         'Base Toda + Coringas + RFM',        18000),
];

export const basesMaio: Base[] = [];

export const datasazonais2025: DataSazonal[] = [ // kept name for compatibility
  { data: '2026-05-01', evento: 'Dia do Trabalho',       categoria: 'feriado',   relevancia: 'media' },
  { data: '2026-05-05', evento: '5.5 Sale',              categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2026-05-11', evento: 'Dia das Maes',          categoria: 'diad',      relevancia: 'alta' },
  { data: '2025-06-06', evento: '6.6 Sale',              categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-06-12', evento: 'Dia dos Namorados',     categoria: 'diad',      relevancia: 'alta' },
  { data: '2025-06-19', evento: 'Corpus Christi',        categoria: 'feriado',   relevancia: 'baixa' },
  { data: '2025-07-07', evento: '7.7 Sale',              categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-08-08', evento: '8.8 Sale',              categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-09-07', evento: 'Independencia do Brasil',categoria: 'feriado',  relevancia: 'media' },
  { data: '2025-09-09', evento: '9.9 Sale',              categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-10-10', evento: '10.10 Sale',            categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-10-12', evento: 'Dia das Criancas',      categoria: 'diad',      relevancia: 'media' },
  { data: '2025-11-02', evento: 'Finados',               categoria: 'feriado',   relevancia: 'baixa' },
  { data: '2025-11-11', evento: '11.11 Sale',            categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-11-28', evento: 'Black Friday',          categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-12-12', evento: '12.12 Sale',            categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-12-25', evento: 'Natal',                 categoria: 'diad',      relevancia: 'alta' },
];
