'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Zap, Database, ChevronDown, Crown } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { useBrand } from '@/lib/brand-context';
import { BRANDS } from '@/lib/brands';

const navItems = [
  { href: '/', label: 'Central', icon: LayoutDashboard },
  { href: '/calendario', label: 'Calendário', icon: Calendar },
  { href: '/disparos', label: 'Disparos', icon: Zap },
  { href: '/bases', label: 'Bases', icon: Database },
  { href: '/vip', label: 'Grupo VIP', icon: Crown },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { brand, setBrand } = useBrand();
  const [open, setOpen] = useState(false);

  return (
    <aside className="hidden md:flex flex-col" style={{ width: 220, minHeight: '100vh', backgroundColor: '#0E0E0E', borderRight: '1px solid #262626', flexShrink: 0 }}>

      {/* Brand selector */}
      <div className="relative px-3 py-4">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
          style={{ backgroundColor: open ? '#1A1A1A' : 'transparent' }}
        >
          {/* brand logo */}
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <Image
              src={brand.logo}
              alt={brand.name}
              width={32}
              height={32}
              style={{ objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: '#F2F2F2' }}>{brand.name}</p>
          </div>
          <ChevronDown size={14} style={{ color: '#5E5E5E', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>

        {/* dropdown */}
        {open && (
          <div className="absolute left-3 right-3 top-full mt-1 rounded-xl border overflow-hidden z-50"
            style={{ backgroundColor: '#161616', borderColor: '#2A2A2A' }}>
            {BRANDS.map((b) => (
              <button
                key={b.id}
                onClick={() => { setBrand(b); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-all text-left"
                style={{ backgroundColor: b.id === brand.id ? '#1A1A1A' : 'transparent' }}>
                <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#0D0D0D', border: '1px solid #2A2A2A' }}>
                  <Image
                    src={b.logo}
                    alt={b.name}
                    width={28}
                    height={28}
                    style={{ objectFit: 'contain' }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <span className="text-xs font-medium truncate" style={{ color: b.id === brand.id ? '#D4A843' : '#9CA3AF' }}>
                  {b.name}
                </span>
                {b.id === brand.id && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#D4A843' }} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* gold divider */}
        <span style={{
          position: 'absolute', bottom: 0, left: 8, right: 8, height: 1,
          background: 'linear-gradient(90deg, transparent 0%, #D4A843 18%, #D4A843 82%, transparent 100%)',
          opacity: 0.5,
        }} />
      </div>

      {/* nav */}
      <nav className="flex flex-col gap-0.5 px-3 mt-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
              style={{
                color: active ? '#F1E7CB' : '#B8B8B8',
                backgroundColor: active ? '#171513' : 'transparent',
                fontWeight: active ? 600 : 400,
                textDecoration: 'none',
              }}
            >
              {active && (
                <span style={{
                  position: 'absolute', left: -12, top: 8, bottom: 8,
                  width: 2, background: '#D4A843', borderRadius: 2,
                }} />
              )}
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} style={{ color: active ? '#D4A843' : '#8A8A8A' }} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
