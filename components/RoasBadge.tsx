export default function RoasBadge({ roas }: { roas: number }) {
  if (roas === 0) {
    return <span className="text-xs" style={{ color: '#4B5563' }}>A preencher</span>;
  }

  let bg = '#3F1010', color = '#F87171';
  if (roas >= 7) { bg = '#0F2E1A'; color = '#4ADE80'; }
  else if (roas >= 4) { bg = '#2D2208'; color = '#FCD34D'; }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: bg, color }}>
      {roas.toFixed(1)}x
    </span>
  );
}
