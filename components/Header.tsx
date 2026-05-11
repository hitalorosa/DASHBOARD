'use client';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const YEARS = [2024, 2025, 2026];

interface HeaderProps {
  title: string;
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

export default function Header({ title, month, year, onMonthChange, onYearChange }: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between px-8 py-4 border-b"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', minHeight: 64 }}
    >
      <div className="flex-1" />

      <h1 className="flex-1 text-center text-lg font-semibold text-gray-800 tracking-wide">
        {title}
      </h1>

      <div className="flex-1 flex items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            className="text-sm font-medium border rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            style={{ borderColor: '#D4A843', color: '#0D0D0D', backgroundColor: '#FFF' }}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="text-sm font-medium border rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            style={{ borderColor: '#D4A843', color: '#0D0D0D', backgroundColor: '#FFF' }}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
