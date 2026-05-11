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
    <aside className="flex flex-col" style={{ width: 220, minHeight: '100vh', backgroundColor: '#0D0D0D', flexShrink: 0 }}>
      <div className="px-5 py-6 flex items-center justify-center">
        <Image
          src="/logo-noue.png"
          alt="Noue"
          width={110}
          height={44}
          style={{ objectFit: 'contain', filter: 'brightness(1)' }}
          priority
        />
      </div>

      <nav className="flex flex-col gap-1 px-3 mt-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
              style={{
                color: active ? '#D4A843' : '#A0A0A0',
                backgroundColor: active ? '#1A1A1A' : 'transparent',
                fontWeight: active ? 600 : 400,
                textDecoration: 'none',
              }}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
