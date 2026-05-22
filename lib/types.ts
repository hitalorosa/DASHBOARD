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
  data: string;
  campanha: string;
  tipo: CampaignType;
  base: string;
  tamanhoBase: number;
  enviados: number;
  taxaEntrega: number;
  entregas: number;
  taxaLeitura: number;
  cliques: number;
  cotacaoUsd: number;
  investimentoUsd: number;
  investimentoBrl: number;
  faturamentoPago: number;
  pedidos: number;
  ticketMedio: number;
  roas: number;
  observacoes: string;
  // Campos de atribuição automática via Yampi
  cupom_usado?: string;       // Ex: "MAIO10"
  utm_source?: string;        // Ex: "noue_crm"
  utm_campaign?: string;      // Ex: "base_compradores_mai13"
}

export interface Base {
  nome: string;
  tamanho: number;
  disparos: number;
  entregas: number;
  faturamento: number;
  pedidos: number;
  roasMedio: number;
  decisao: DecisaoBase;
  notas: string;
}

export interface DataSazonal {
  data: string; // YYYY-MM-DD
  evento: string;
  categoria: 'diad' | 'ecommerce' | 'feriado' | 'relevante';
  relevancia: 'alta' | 'media' | 'baixa';
}
