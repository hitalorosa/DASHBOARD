export type CampaignType =
  | 'sazonal'
  | 'esquenta'
  | 'ressaca'
  | 'comportamental'
  | 'produto'
  | 'brinde'
  | 'fimmes';

export type DecisaoBase =
  | 'reenviar'
  | 'monitorar'
  | 'testar'
  | 'descartar'
  | 'pendente';

export interface Disparo {
  id: string;
  data: string; // ISO date string YYYY-MM-DD
  campanha: string;
  tipo: CampaignType;
  base: string;
  enviados: number;
  taxaEntrega: number; // 0-1
  entregas: number;
  taxaLeitura: number; // 0-1
  cliques: number;
  cotacaoUsd: number;
  investimentoUsd: number;
  investimentoBrl: number;
  faturamentoPago: number;
  pedidos: number;
  ticketMedio: number;
  roas: number;
}

export interface Base {
  nome: string;
  disparos: number;
  entregas: number;
  faturamento: number;
  pedidos: number;
  roasMedio: number;
  decisao: DecisaoBase;
}

export interface DataSazonal {
  data: string; // YYYY-MM-DD
  evento: string;
  categoria: 'diad' | 'ecommerce' | 'feriado' | 'relevante';
  relevancia: 'alta' | 'media' | 'baixa';
}
