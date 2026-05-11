'use client';

import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

const AUTH_KEY = 'noue-auth-v1';
const PASSWORD = 'dash@26';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [senha, setSenha] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setAuthed(localStorage.getItem(AUTH_KEY) === '1');
  }, []);

  if (authed === null) return null;
  if (authed) return <>{children}</>;

  function handleLogin() {
    if (senha === PASSWORD) {
      localStorage.setItem(AUTH_KEY, '1');
      setAuthed(true);
    } else {
      setError(true);
      setSenha('');
      setTimeout(() => setError(false), 2000);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full px-4"
      style={{ backgroundColor: '#0D0D0D' }}>

      {/* logo */}
      <div className="mb-10 text-center">
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 28,
          fontWeight: 300,
          letterSpacing: '0.28em',
          color: '#F2F2F2',
          textTransform: 'uppercase',
        }}>
          NOU<span style={{ fontWeight: 600 }}>Ê</span>
        </p>
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #D4A843, transparent)', marginTop: 6, opacity: 0.6 }} />
      </div>

      {/* card */}
      <div className="w-full max-w-sm rounded-2xl p-7 flex flex-col gap-5"
        style={{ backgroundColor: '#161616', border: '1px solid #222222' }}>

        {/* title */}
        <div className="flex items-center gap-2.5">
          <Lock size={16} style={{ color: '#8B6FCC' }} />
          <span className="font-semibold text-base" style={{ color: '#F2F2F2' }}>Acesso restrito</span>
        </div>

        {/* password input */}
        <div className="relative">
          <input
            autoFocus
            type={showPass ? 'text' : 'password'}
            placeholder="Senha"
            value={senha}
            onChange={(e) => { setSenha(e.target.value); setError(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none border pr-11 transition-all"
            style={{
              backgroundColor: '#0D0D0D',
              borderColor: error ? '#F87171' : '#2A2A2A',
              color: '#F2F2F2',
            }}
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
            style={{ color: '#5E5E5E' }}>
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && (
          <p className="text-xs -mt-2" style={{ color: '#F87171' }}>Senha incorreta. Tente novamente.</p>
        )}

        {/* button */}
        <button
          onClick={handleLogin}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity"
          style={{ backgroundColor: '#6B4FCE', color: '#F2F2F2' }}>
          Entrar
        </button>
      </div>

      {/* footer */}
      <p className="mt-8 text-xs" style={{ color: '#3A3A3A' }}>
        Nouê Cosméticos · Dashboard Interno
      </p>
    </div>
  );
}
