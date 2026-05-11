import { Disparo, Base, DataSazonal } from './types';

export const META_MENSAL = 200000;

function d(id: string, data: string, campanha: string, tipo: Disparo['tipo'], base: string, tamanhoBase: number, enviados: number, taxaEntrega: number, taxaLeitura: number, cliques: number, cotacaoUsd: number, investimentoUsd: number, investimentoBrl: number): Disparo {
  return { id, data, campanha, tipo, base, tamanhoBase, enviados, taxaEntrega, entregas: Math.round(enviados * taxaEntrega), taxaLeitura, cliques, cotacaoUsd, investimentoUsd, investimentoBrl, faturamentoPago: 0, pedidos: 0, ticketMedio: 0, roas: 0, observacoes: '' };
}

export const disparosMaio: Disparo[] = [
  d('1',  '2025-05-05', 'Oferta 05/05',           'sazonal',        'Base Toda',                    0, 12000, 0.94, 0.62, 890,  5.72, 48.5,  277.4),
  d('2',  '2025-05-06', 'Ressaca 05/05',           'ressaca',        'Não Compraram 05/05',           0, 8000,  0.93, 0.58, 610,  5.72, 32.2,  184.2),
  d('3',  '2025-05-08', 'Esquenta Mês das Mães',   'esquenta',       'Base Toda',                    0, 13000, 0.95, 0.65, 1020, 5.75, 52.4,  301.3),
  d('4',  '2025-05-09', 'Esquenta Mês das Mães',   'esquenta',       'Carrinho Abandonado 60d',      0, 4200,  0.96, 0.71, 480,  5.75, 16.9,  97.2),
  d('5',  '2025-05-10', 'Dia das Mães',            'sazonal',        'Base Toda',                    0, 14000, 0.94, 0.68, 1350, 5.78, 56.4,  326.0),
  d('6',  '2025-05-11', 'Ressaca Dia das Mães',    'ressaca',        'Não Compraram Dia das Mães',   0, 7500,  0.92, 0.55, 520,  5.78, 30.2,  174.6),
  d('7',  '2025-05-13', 'LP Tonalizantes',         'produto',        'Base Toda',                    0, 11000, 0.93, 0.60, 780,  5.76, 44.3,  255.2),
  d('8',  '2025-05-15', 'Disparo da Madrugada',    'comportamental', 'Clientes Noturnos',            0, 3200,  0.97, 0.74, 390,  5.76, 12.9,  74.3),
  d('9',  '2025-05-18', 'Oferta Necessaire',       'brinde',         'Base Toda',                    0, 12500, 0.94, 0.63, 920,  5.80, 50.3,  291.7),
  d('10', '2025-05-20', 'Quarta Relâmpago',        'sazonal',        'Base Toda',                    0, 13500, 0.93, 0.66, 1100, 5.79, 54.4,  315.0),
  d('11', '2025-05-22', 'Disparo Base Popup',      'comportamental', 'Vieram do Popup',              0, 5500,  0.95, 0.69, 610,  5.79, 22.2,  128.6),
  d('12', '2025-05-24', 'LP Tonalizantes',         'produto',        'Carrinho Abandonado Camuflage',0, 3800,  0.96, 0.72, 450,  5.81, 15.3,  88.9),
  d('13', '2025-05-26', 'Body Splash',             'brinde',         'Nunca Compraram',              0, 9000,  0.92, 0.57, 640,  5.81, 36.2,  210.4),
  d('14', '2025-05-29', 'Oferta Fim de Mês',       'fimmes',         'Base Toda',                    0, 13000, 0.94, 0.61, 980,  5.82, 52.4,  304.9),
  d('15', '2025-05-30', 'Oferta Fim de Mês',       'fimmes',         'Não Compraram 29/05',          0, 8000,  0.93, 0.58, 620,  5.82, 32.2,  187.2),
  d('16', '2025-05-31', 'Oferta Fim de Mês',       'fimmes',         'Carrinho Abandonado Geral',    0, 6000,  0.94, 0.63, 540,  5.82, 24.2,  140.8),
];

export const basesMaio: Base[] = [
  { nome: 'Base Toda',                    tamanho: 0, disparos: 7, entregas: 0, faturamento: 0, pedidos: 0, roasMedio: 0, decisao: 'pendente', notas: '' },
  { nome: 'Carrinho Abandonado 60d',      tamanho: 0, disparos: 1, entregas: 0, faturamento: 0, pedidos: 0, roasMedio: 0, decisao: 'pendente', notas: '' },
  { nome: 'Carrinho Abandonado Geral',    tamanho: 0, disparos: 1, entregas: 0, faturamento: 0, pedidos: 0, roasMedio: 0, decisao: 'pendente', notas: '' },
  { nome: 'Carrinho Abandonado Camuflage',tamanho: 0, disparos: 1, entregas: 0, faturamento: 0, pedidos: 0, roasMedio: 0, decisao: 'pendente', notas: '' },
  { nome: 'Não Compraram 05/05',          tamanho: 0, disparos: 1, entregas: 0, faturamento: 0, pedidos: 0, roasMedio: 0, decisao: 'pendente', notas: '' },
  { nome: 'Não Compraram Dia das Mães',   tamanho: 0, disparos: 1, entregas: 0, faturamento: 0, pedidos: 0, roasMedio: 0, decisao: 'pendente', notas: '' },
  { nome: 'Clientes Noturnos',            tamanho: 0, disparos: 1, entregas: 0, faturamento: 0, pedidos: 0, roasMedio: 0, decisao: 'pendente', notas: '' },
  { nome: 'Vieram do Popup',              tamanho: 0, disparos: 1, entregas: 0, faturamento: 0, pedidos: 0, roasMedio: 0, decisao: 'pendente', notas: '' },
  { nome: 'Nunca Compraram',              tamanho: 0, disparos: 1, entregas: 0, faturamento: 0, pedidos: 0, roasMedio: 0, decisao: 'pendente', notas: '' },
  { nome: 'Não Compraram 29/05',          tamanho: 0, disparos: 1, entregas: 0, faturamento: 0, pedidos: 0, roasMedio: 0, decisao: 'pendente', notas: '' },
];

export const datasazonais2025: DataSazonal[] = [
  { data: '2025-05-01', evento: 'Dia do Trabalho', categoria: 'feriado', relevancia: 'media' },
  { data: '2025-05-05', evento: '5.5 Sale', categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-05-11', evento: 'Dia das Mães', categoria: 'diad', relevancia: 'alta' },
  { data: '2025-06-06', evento: '6.6 Sale', categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-06-12', evento: 'Dia dos Namorados', categoria: 'diad', relevancia: 'alta' },
  { data: '2025-06-19', evento: 'Corpus Christi', categoria: 'feriado', relevancia: 'baixa' },
  { data: '2025-07-07', evento: '7.7 Sale', categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-08-08', evento: '8.8 Sale', categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-09-07', evento: 'Independência do Brasil', categoria: 'feriado', relevancia: 'media' },
  { data: '2025-09-09', evento: '9.9 Sale', categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-10-10', evento: '10.10 Sale', categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-10-12', evento: 'Dia das Crianças', categoria: 'diad', relevancia: 'media' },
  { data: '2025-11-02', evento: 'Finados', categoria: 'feriado', relevancia: 'baixa' },
  { data: '2025-11-11', evento: '11.11 Sale', categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-11-28', evento: 'Black Friday', categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-12-12', evento: '12.12 Sale', categoria: 'ecommerce', relevancia: 'alta' },
  { data: '2025-12-25', evento: 'Natal', categoria: 'diad', relevancia: 'alta' },
];
