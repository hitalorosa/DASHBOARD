'use client';

import { useState, useRef } from 'react';
import { useRouter }        from 'next/navigation';
import Image                from 'next/image';

const GOLD = '#D4A843';

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
        router.push('/');
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

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#0A0A0A' }}
    >
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-4">
        <Image
          src="/logo-noue.png"
          alt="Vante Dashboard"
          width={100}
          height={40}
          style={{ objectFit: 'contain' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <p style={{ color: '#3A3A3A', fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Área restrita
        </p>
      </div>

      {/* Card */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs flex flex-col gap-3"
      >
        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha de acesso"
          autoFocus
          disabled={loading}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
          style={{
            backgroundColor: '#111111',
            borderColor:      error ? '#ef4444' : '#2A2A2A',
            color:            '#F5F5F5',
            caretColor:       GOLD,
          }}
        />

        {error && (
          <p style={{ color: '#ef4444', fontSize: 12, paddingLeft: 4 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !password.trim()}
          className="w-full rounded-xl py-3 text-sm font-medium transition-opacity"
          style={{
            backgroundColor: GOLD,
            color:            '#0A0A0A',
            opacity:          loading || !password.trim() ? 0.5 : 1,
            cursor:           loading || !password.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
