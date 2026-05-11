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
