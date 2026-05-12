'use client';

import Image from 'next/image';
import { useBrand } from '@/lib/brand-context';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const YEARS = [2026, 2027];

interface HeaderProps {
  title: string;
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

export default function Header({ month, year, onMonthChange, onYearChange }: HeaderProps) {
  const { brand } = useBrand();

  return (
    <header
      className="flex items-center justify-between px-8 py-3 border-b"
      style={{ backgroundColor: '#0D0D0D', borderColor: '#2A2A2A', minHeight: 64 }}
    >
      <div className="flex-1" />

      {/* brand logo centered */}
      <div className="flex-1 flex items-center justify-center">
        <Image
          src={brand.logo}
          alt={brand.name}
          width={90}
          height={36}
          style={{ objectFit: 'contain' }}
          priority
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      <div className="flex-1 flex items-center justify-end gap-2">
        <select
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer border"
          style={{ borderColor: '#2A2A2A', color: '#D4A843', backgroundColor: '#1A1A1A' }}
        >
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer border"
          style={{ borderColor: '#2A2A2A', color: '#D4A843', backgroundColor: '#1A1A1A' }}
        >
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </header>
  );
}
