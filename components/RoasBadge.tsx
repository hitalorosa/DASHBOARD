export default function RoasBadge({ roas }: { roas: number }) {
  if (roas === 0) {
    return <span className="text-gray-400 text-sm">—</span>;
  }

  let bg = '#FEE2E2', color = '#B91C1C';
  if (roas >= 7) { bg = '#DCFCE7'; color = '#15803D'; }
  else if (roas >= 4) { bg = '#FEF9C3'; color = '#CA8A04'; }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: bg, color }}
    >
      {roas.toFixed(1)}x
    </span>
  );
}
