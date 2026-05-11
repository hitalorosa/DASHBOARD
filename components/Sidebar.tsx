'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Zap, Database } from 'lucide-react';
import Image from 'next/image';

const navItems = [
  { href: '/', label: 'Central', icon: LayoutDashboard },
  { href: '/calendario', label: 'Calendário', icon: Calendar },
  { href: '/disparos', label: 'Disparos', icon: Zap },
  { href: '/bases', label: 'Bases', icon: Database },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col" style={{ width: 220, minHeight: '100vh', backgroundColor: '#0E0E0E', borderRight: '1px solid #262626', flexShrink: 0 }}>
      {/* Logo + gold divider */}
      <div className="relative px-5 py-6 flex items-center justify-center">
        <Image
          src="/logo-noue.png"
          alt="Noue"
          width={110}
          height={44}
          style={{ objectFit: 'contain' }}
          priority
        />
        {/* thin gold gradient divider */}
        <span style={{
          position: 'absolute', bottom: 0, left: 8, right: 8, height: 1,
          background: 'linear-gradient(90deg, transparent 0%, #D4A843 18%, #D4A843 82%, transparent 100%)',
          opacity: 0.7,
        }} />
      </div>

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
              {/* 2px gold bar on left edge when active */}
              {active && (
                <span style={{
                  position: 'absolute', left: -12, top: 8, bottom: 8,
                  width: 2, background: '#D4A843', borderRadius: 2,
                }} />
              )}
              <Icon
                size={16}
                strokeWidth={active ? 2.2 : 1.8}
                style={{ color: active ? '#D4A843' : '#8A8A8A' }}
              />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
