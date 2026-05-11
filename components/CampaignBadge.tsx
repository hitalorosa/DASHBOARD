import { CampaignType } from '@/lib/types';

const CONFIG: Record<CampaignType, { label: string; bg: string; color: string; border: string }> = {
  sazonal:       { label: 'Sazonal',        bg: 'rgba(212,168,67,0.10)', color: '#E5C475', border: 'rgba(212,168,67,0.22)' },
  esquenta:      { label: 'Esquenta',       bg: 'rgba(251,146,60,0.10)', color: '#FBA96A', border: 'rgba(251,146,60,0.22)' },
  ressaca:       { label: 'Ressaca',        bg: 'rgba(244,114,182,0.10)', color: '#F49DC8', border: 'rgba(244,114,182,0.22)' },
  comportamental:{ label: 'Comportamental', bg: 'rgba(107,168,229,0.10)', color: '#8BBFE0', border: 'rgba(107,168,229,0.22)' },
  produto:       { label: 'LP Produto',     bg: 'rgba(212,168,67,0.08)', color: '#D4A843', border: 'rgba(212,168,67,0.18)' },
  brinde:        { label: 'Brinde',         bg: 'rgba(124,198,138,0.10)', color: '#9FD9A8', border: 'rgba(124,198,138,0.22)' },
  fimmes:        { label: 'Fim de Mês',     bg: 'rgba(248,113,113,0.10)', color: '#EAA0A0', border: 'rgba(248,113,113,0.22)' },
};

export default function CampaignBadge({ type }: { type: CampaignType }) {
  const { label, bg, color, border } = CONFIG[type];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: bg, color, border: `1px solid ${border}` }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      {label}
    </span>
  );
}
