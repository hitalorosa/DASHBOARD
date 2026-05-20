import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? '';
const GITHUB_OWNER = process.env.GITHUB_OWNER ?? 'hitalorosa';
const GITHUB_REPO  = process.env.GITHUB_REPO  ?? 'DASHBOARD';
const WORKFLOW_ID  = 'sync-vip.yml';

export async function POST(req: NextRequest) {
  try {
    const { month, year } = await req.json();

    if (!GITHUB_TOKEN) {
      return NextResponse.json({ ok: false, error: 'GITHUB_TOKEN não configurado' }, { status: 500 });
    }

    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept':        'application/vnd.github+json',
          'Content-Type':  'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            month: String(month ?? ''),
            year:  String(year  ?? ''),
          },
        }),
      },
    );

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json({ ok: false, error: `GitHub: ${res.status} ${txt.slice(0, 200)}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Sincronização iniciada! Aguarde ~30 segundos.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
