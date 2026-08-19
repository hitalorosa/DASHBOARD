'use client';

import { useStore } from '@/lib/store';
import { useBrand } from '@/lib/brand-context';
import { format, parseISO } from 'date-fns';
import { C, FONT, eyebrow, heading, metric, roasPill, roasTexto, fmtBRL } from '@/lib/theme';

const CARD: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20 };
const GRID_COLS = '52px minmax(120px,1fr) minmax(76px,.8fr) minmax(84px,.9fr) minmax(64px,.7fr)';

function KpiCard({ rotulo, valor, sub, destaque, progresso }: {
  rotulo: string; valor: string; sub: string; destaque?: boolean; progresso?: number;
}) {
  return (
    <div style={{ ...CARD, borderRadius: 16, padding: '18px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: destaque ? C.primary : C.borderMid, flex: 'none' }} />
        <span style={{ ...eyebrow(), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rotulo}</span>
      </div>
      <div style={{ ...metric(28), color: destaque ? C.primaryDeep : C.ink }}>{valor}</div>
      <div style={{ fontSize: 11.5, color: C.inkSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
      {progresso !== undefined && (
        <div style={{ height: 6, borderRadius: 999, background: C.surfaceAlt, overflow: 'hidden', marginTop: 2 }}>
          <div style={{ height: '100%', width: `${Math.min(progresso, 100)}%`, background: C.primary, borderRadius: 999 }} />
        </div>
      )}
    </div>
  );
}

export default function CentralPage() {
  const { brand, month, year } = useBrand();
  const { getDisparos, getBases } = useStore();
  const disparos = getDisparos(month, year);

  const totalInvest  = disparos.reduce((s, d) => s + d.investimentoBrl, 0);
  const totalFat     = disparos.reduce((s, d) => s + d.faturamentoPago, 0);
  const totalPedidos = disparos.reduce((s, d) => s + d.pedidos, 0);
  const totalLeads   = disparos.reduce((s, d) => s + d.tamanhoBase, 0);
  const roasGeral    = totalInvest > 0 && totalFat > 0 ? totalFat / totalInvest : 0;
  const metaPct      = (totalFat / brand.metaMensal) * 100;

  const melhor = disparos.filter((d) => d.roas > 0).sort((a, b) => b.roas - a.roas)[0] ?? null;
  const temDados = disparos.some((d) => d.faturamentoPago > 0 || d.investimentoBrl > 0);

  // Barras proporcionais ao maior valor do mês — sem biblioteca de gráfico
  const maxBarra = Math.max(...disparos.map((d) => Math.max(d.investimentoBrl, d.faturamentoPago)), 1);
  const comRoas  = disparos.filter((d) => d.roas > 0);
  const maxRoas  = Math.max(...comRoas.map((d) => d.roas), 1);

  const bases = getBases().slice(0, 3);
  const maxFatBase = Math.max(...bases.map((b) => b.faturamento), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))', gap: 14 }}>
        <KpiCard rotulo="Investimento" valor={totalInvest > 0 ? fmtBRL(totalInvest) : 'A preencher'} sub="BRL acumulado" />
        <KpiCard rotulo="Faturamento"  valor={totalFat > 0 ? fmtBRL(totalFat) : 'A preencher'} sub="status pago" destaque />
        <KpiCard rotulo="ROAS geral"   valor={roasGeral > 0 ? `${roasGeral.toFixed(1)}x` : 'A preencher'} sub={`meta ${brand.metaRoas}x`} />
        <KpiCard rotulo="Meta"         valor={metaPct > 0 ? `${metaPct.toFixed(1)}%` : '0%'} sub={`de ${fmtBRL(brand.metaMensal)}`} progresso={metaPct} />
        <KpiCard rotulo="Disparos"     valor={String(disparos.length)} sub="no mês" />
        <KpiCard rotulo="Melhor disparo" valor={melhor ? `${melhor.roas.toFixed(1)}x` : 'A preencher'} sub={melhor ? melhor.campanha : 'aguardando dados'} />
      </div>

      {/* Gráfico */}
      <div style={{ ...CARD, padding: '22px 20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <div style={eyebrow(C.inkSoft)}>Desempenho do mês</div>
            <h2 style={{ ...heading(19), marginTop: 4 }}>Investimento × faturamento por disparo</h2>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: C.inkSoft, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: C.borderMid }} />Investimento
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: C.accent }} />Faturamento
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 2, background: C.ink }} />ROAS
            </span>
          </div>
        </div>

        {temDados ? (
          <div className="scroll-x">
            <div style={{ position: 'relative', height: 280, display: 'flex', alignItems: 'flex-end', paddingBottom: 26, borderBottom: `1px solid ${C.border}`, minWidth: disparos.length * 44 }}>
              {/* Linha de ROAS por cima das barras */}
              {comRoas.length > 1 && (
                <svg
                  viewBox="0 0 100 100" preserveAspectRatio="none"
                  style={{ position: 'absolute', inset: '0 0 26px', width: '100%', height: 'calc(100% - 26px)', pointerEvents: 'none', overflow: 'visible' }}
                >
                  <polyline
                    points={disparos.map((d, i) => {
                      const x = ((i + 0.5) / disparos.length) * 100;
                      const y = 100 - (d.roas / maxRoas) * 88;
                      return d.roas > 0 ? `${x},${y}` : '';
                    }).filter(Boolean).join(' ')}
                    fill="none" stroke={C.ink} strokeWidth="1.4"
                    vectorEffect="non-scaling-stroke" strokeLinejoin="round"
                  />
                </svg>
              )}

              {disparos.map((d) => (
                <div key={d.id} style={{ flex: 1, minWidth: 36, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', height: '100%', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: '100%', width: '100%', justifyContent: 'center' }}>
                    <div
                      title={`Investimento ${fmtBRL(d.investimentoBrl)}`}
                      style={{ width: 12, height: `${(d.investimentoBrl / maxBarra) * 88}%`, background: C.borderMid, borderRadius: '4px 4px 0 0' }}
                    />
                    <div
                      title={`Faturamento ${fmtBRL(d.faturamentoPago)}`}
                      style={{ width: 12, height: `${(d.faturamentoPago / maxBarra) * 88}%`, background: C.accent, borderRadius: '4px 4px 0 0' }}
                    />
                  </div>
                  <div style={{ position: 'absolute', bottom: -26, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.mono, fontSize: 10, color: C.inkSoft }}>
                    {format(parseISO(d.data), 'dd/MM')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ height: 240, display: 'grid', placeItems: 'center', textAlign: 'center', border: `1px dashed ${C.borderMid}`, borderRadius: 16, background: C.bg }}>
            <div>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 16 }}>Nenhum dado financeiro preenchido ainda.</div>
              <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 6 }}>
                Vá em <strong style={{ color: C.primaryDeep }}>Disparos</strong> e clique em <strong style={{ color: C.primaryDeep }}>Preencher</strong>.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabela + coluna lateral */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: 20, alignItems: 'start' }}>

        <div style={{ ...CARD, overflow: 'hidden' }}>
          <div style={{ padding: '20px 20px 14px' }}>
            <div style={eyebrow(C.inkSoft)}>Lançamentos</div>
            <h2 style={{ ...heading(19), marginTop: 4 }}>Disparos do mês</h2>
          </div>

          <div className="scroll-x">
            <div style={{ minWidth: 460 }}>
              <div style={{
                display: 'grid', gridTemplateColumns: GRID_COLS, gap: 8, padding: '10px 18px',
                background: C.rail, borderTop: `1px solid ${C.railBorder}`, borderBottom: `1px solid ${C.railBorder}`,
                ...eyebrow(C.inkRail), letterSpacing: '.12em', whiteSpace: 'nowrap',
              }}>
                <span>Data</span><span>Campanha</span>
                <span style={{ textAlign: 'right' }}>Invest.</span>
                <span style={{ textAlign: 'right' }}>Fat.</span>
                <span style={{ textAlign: 'right' }}>ROAS</span>
              </div>

              {disparos.map((d) => (
                <div key={d.id} className="row-hover" style={{
                  display: 'grid', gridTemplateColumns: GRID_COLS, alignItems: 'center', gap: 8,
                  padding: '11px 18px', borderTop: `1px solid ${C.borderSoft}`, fontSize: 13.5,
                }}>
                  <span style={{ fontFamily: FONT.mono, color: C.inkSoft }}>{format(parseISO(d.data), 'dd/MM')}</span>
                  <span style={{ minWidth: 0, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.campanha}</span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: d.investimentoBrl > 0 ? C.ink : C.inkMut }}>
                    {d.investimentoBrl > 0 ? fmtBRL(d.investimentoBrl) : '—'}
                  </span>
                  <span style={{ textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: d.faturamentoPago > 0 ? C.ink : C.inkMut }}>
                    {d.faturamentoPago > 0 ? fmtBRL(d.faturamentoPago) : '—'}
                  </span>
                  <span style={{ textAlign: 'right' }}><span style={roasPill(d.roas)}>{roasTexto(d.roas)}</span></span>
                </div>
              ))}

              {disparos.length === 0 && (
                <div style={{ padding: '36px 24px', borderTop: `1px solid ${C.borderSoft}`, textAlign: 'center' }}>
                  <div style={{ fontWeight: 600 }}>Nenhum disparo lançado neste mês.</div>
                  <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 4 }}>
                    Vá em <strong style={{ color: C.primaryDeep }}>Calendário</strong> e clique em <strong style={{ color: C.primaryDeep }}>+ Novo</strong>.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ ...CARD, borderRadius: 16, padding: '18px 16px' }}>
              <div style={eyebrow()}>Pedidos</div>
              <div style={{ ...metric(30), marginTop: 6 }}>{totalPedidos > 0 ? totalPedidos.toLocaleString('pt-BR') : '—'}</div>
              <div style={{ fontSize: 11.5, color: C.inkSoft }}>via disparos</div>
            </div>
            <div style={{ ...CARD, borderRadius: 16, padding: '18px 16px' }}>
              <div style={eyebrow()}>Leads</div>
              <div style={{ ...metric(30), marginTop: 6 }}>{totalLeads > 0 ? totalLeads.toLocaleString('pt-BR') : '—'}</div>
              <div style={{ fontSize: 11.5, color: C.inkSoft }}>bases do mês</div>
            </div>
          </div>

          <div style={{ background: C.surfaceAlt, border: `1px solid ${C.borderMid}`, borderRadius: 20, padding: 20 }}>
            <div style={eyebrow(C.primaryDeep)}>Ranking</div>
            <h2 style={{ ...heading(17), margin: '4px 0 16px' }}>Top 3 bases</h2>

            {bases.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {bases.map((b) => {
                  const invest = b.roasMedio > 0 ? b.faturamento / b.roasMedio : 0;
                  return (
                    <div key={b.nome}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.nome}</span>
                        <span style={roasPill(b.roasMedio)}>{roasTexto(b.roasMedio)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                        <div style={{ flex: 1, height: 8, borderRadius: 999, background: C.surface, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(b.faturamento / maxFatBase) * 100}%`, background: C.primary, borderRadius: 999 }} />
                        </div>
                        <span style={{ fontFamily: FONT.mono, fontSize: 10.5, color: C.primaryDeep, width: 62, textAlign: 'right' }}>{fmtBRL(b.faturamento)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 999, background: C.surface, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(invest / maxFatBase) * 100}%`, background: C.borderMid, borderRadius: 999 }} />
                        </div>
                        <span style={{ fontFamily: FONT.mono, fontSize: 10.5, color: C.inkSoft, width: 62, textAlign: 'right' }}>{invest > 0 ? fmtBRL(invest) : '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: C.primaryDeep, padding: '18px 0' }}>
                Preencha resultados nos disparos para ver as bases.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
