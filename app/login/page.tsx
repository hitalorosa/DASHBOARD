'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { C, FONT } from '@/lib/theme';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      });

      if (res.ok) {
        // O destino depende do nível liberado pela senha
        const { inicio } = await res.json() as { inicio?: string };
        router.push(inicio ?? '/');
        router.refresh();
      } else {
        setError('Senha incorreta.');
        setPassword('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const podeEnviar = !loading && password.trim().length > 0;

  return (
    <div
      style={{
        minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '40px 24px',
        background: `linear-gradient(155deg, ${C.bg} 0%, ${C.surfaceAlt} 65%, ${C.accent} 140%)`,
      }}
    >
      <div className="entra" style={{ width: '100%', maxWidth: 392 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Image
            src="/dryskin-simbolo.png"
            alt="DrySkin"
            width={52}
            height={52}
            priority
            style={{ objectFit: 'contain', display: 'block', margin: '0 auto 18px' }}
          />
          <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 30, letterSpacing: '-.02em', lineHeight: 1 }}>
            DrySkin
          </div>
          <div style={{
            fontFamily: FONT.display, fontWeight: 700, fontSize: 13, letterSpacing: '.22em',
            textTransform: 'uppercase', color: C.primary, marginTop: 2,
          }}>
            CRM
          </div>
          <div style={{
            fontFamily: FONT.mono, fontSize: 10, letterSpacing: '.22em',
            textTransform: 'uppercase', color: C.inkSoft, marginTop: 8,
          }}>
            Área restrita
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24,
            padding: 32, boxShadow: '0 18px 40px rgba(23,48,44,.08)',
          }}
        >
          <label htmlFor="senha" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Senha de acesso
          </label>
          <input
            id="senha"
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoFocus
            disabled={loading}
            style={{
              width: '100%', padding: '14px 16px', fontSize: 16,
              border: `1px solid ${error ? '#C97A3A' : C.borderMid}`,
              borderRadius: 12, background: C.bg, color: C.ink,
            }}
          />

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13,
              fontWeight: 600, color: C.ink, background: C.warn, borderRadius: 10, padding: '9px 12px',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ink, flex: 'none' }} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!podeEnviar}
            style={{
              width: '100%', marginTop: 18, background: C.primary, color: '#fff',
              fontFamily: FONT.display, fontWeight: 700, fontSize: 17, padding: 16,
              border: 0, borderRadius: 12, boxShadow: `0 6px 0 ${C.primaryDeep}`,
              cursor: podeEnviar ? 'pointer' : 'not-allowed', opacity: podeEnviar ? 1 : .5,
            }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
