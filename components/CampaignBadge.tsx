import { CampaignType } from '@/lib/types';

const CONFIG: Record<CampaignType, { label: string; bg: string; color: string }> = {
  sazonal:       { label: 'Sazonal',      bg: '#DBEAFE', color: '#1D4ED8' },
  esquenta:      { label: 'Esquenta',     bg: '#FFEDD5', color: '#C2410C' },
  ressaca:       { label: 'Ressaca',      bg: '#FCE7F3', color: '#9D174D' },
  comportamental:{ label: 'Comportamental', bg: '#EDE9FE', color: '#6D28D9' },
  produto:       { label: 'LP Produto',   bg: '#FEF3C7', color: '#92400E' },
  brinde:        { label: 'Brinde',       bg: '#DCFCE7', color: '#15803D' },
  fimmes:        { label: 'Fim de Mês',   bg: '#FEE2E2', color: '#B91C1C' },
};

export default function CampaignBadge({ type }: { type: CampaignType }) {
  const { label, bg, color } = CONFIG[type];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  );
}
