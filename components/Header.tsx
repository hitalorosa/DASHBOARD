'use client';

import Image      from 'next/image';
import { useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useBrand } from '@/lib/brand-context';
import { BRANDS } from '@/lib/brands';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const YEARS = [2026, 2027];

export default function Header({ title }: { title: string }) {
  const { brand, setBrand, month, year, setMonth, setYear } = useBrand();
  const [brandOpen, setBrandOpen] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <header
      className="relative flex items-center justify-between px-4 md:px-8 py-3 border-b"
      style={{ backgroundColor: '#0D0D0D', borderColor: '#2A2A2A', minHeight: 64 }}
    >
      {/* Left — mobile brand switcher / desktop spacer */}
      <div className="flex-1 flex items-center">
        <button
          className="md:hidden flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
          style={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A' }}
          onClick={() => setBrandOpen((v) => !v)}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <Image
              src={brand.logo}
              alt={brand.name}
              width={20}
              height={20}
              style={{ objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <ChevronDown
            size={12}
            style={{ color: '#5E5E5E', transform: brandOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
          />
        </button>

        {/* Mobile brand dropdown */}
        {brandOpen && (
          <div
            className="md:hidden absolute left-4 top-14 rounded-xl border z-50 overflow-hidden"
            style={{ backgroundColor: '#161616', borderColor: '#2A2A2A', minWidth: 180 }}
          >
            {BRANDS.map((b) => (
              <button
                key={b.id}
                onClick={() => { setBrand(b); setBrandOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
                style={{ backgroundColor: b.id === brand.id ? '#1A1A1A' : 'transparent' }}
              >
                <div className="w-6 h-6 flex items-center justify-center rounded"
                  style={{ backgroundColor: '#0D0D0D', border: '1px solid #2A2A2A' }}>
                  <Image src={b.logo} alt={b.name} width={22} height={22}
                    style={{ objectFit: 'contain' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
                <span className="text-xs font-medium truncate"
                  style={{ color: b.id === brand.id ? '#D4A843' : '#9CA3AF' }}>
                  {b.name}
                </span>
                {b.id === brand.id && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#D4A843' }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Center — brand logo */}
      <div className="flex-1 flex items-center justify-center">
        <Image
          src={brand.logo}
          alt={brand.name}
          width={90}
          height={36}
          style={{ objectFit: 'contain' }}
          priority
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      {/* Right — month / year selectors + logout */}
      <div className="flex-1 flex items-center justify-end gap-1.5 md:gap-2">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="text-xs md:text-sm rounded-lg px-1.5 md:px-3 py-1.5 outline-none cursor-pointer border"
          style={{ borderColor: '#2A2A2A', color: '#D4A843', backgroundColor: '#1A1A1A', maxWidth: 80 }}
        >
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="text-xs md:text-sm rounded-lg px-1.5 md:px-3 py-1.5 outline-none cursor-pointer border"
          style={{ borderColor: '#2A2A2A', color: '#D4A843', backgroundColor: '#1A1A1A' }}
        >
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <button
          onClick={handleLogout}
          title="Sair"
          className="flex items-center justify-center rounded-lg p-1.5 transition-colors"
          style={{ color: '#5E5E5E', border: '1px solid #2A2A2A', backgroundColor: '#1A1A1A' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#5E5E5E'; }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
}
