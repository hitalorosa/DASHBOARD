/**
 * POST /api/webhooks/dooki
 *
 * Recebe eventos da Dooki/Yampi em tempo real.
 * Configurar na Dooki: Admin → Configurações → Webhooks → nova URL.
 * Copiar o "Segredo" gerado e salvar em DOOKI_WEBHOOK_SECRET no .env.local.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';

const WEBHOOK_SECRET = process.env.DOOKI_WEBHOOK_SECRET ?? '';
const SB_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Raw buffer para garantir que o HMAC bata nos bytes exatos enviados pela Dooki
// (JSON.parse → stringify muda a ordem dos campos e invalida a assinatura)
function verifySignature(rawBody: Buffer, signature: string): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;

  const expected    = `sha256=${createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')}`;
  const expectedBuf = Buffer.from(expected,  'utf8');
  const sigBuf      = Buffer.from(signature, 'utf8');

  // timingSafeEqual exige mesmo length — retorna false se diferente (sem vazar info de timing)
  if (expectedBuf.length !== sigBuf.length) return false;
  return timingSafeEqual(expectedBuf, sigBuf);
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-yampi-hmac-sha256') ?? '';

  // Rejeita imediatamente se não vier assinatura
  if (!signature) {
    return NextResponse.json({ ok: false, error: 'Assinatura ausente' }, { status: 401 });
  }

  // Lê o corpo como bytes crus (antes de qualquer parse)
  const rawBody = Buffer.from(await req.arrayBuffer());

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: 'Assinatura inválida' }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Payload inválido' }, { status: 400 });
  }

  const topic = (event.topic ?? event.event ?? 'unknown') as string;

  // Salva o evento no Supabase para processamento assíncrono
  try {
    const supabase = createClient(SB_URL, SB_SERVICE_KEY);
    await supabase.from('dooki_webhook_events').insert({
      topic,
      payload:     event,
      received_at: new Date().toISOString(),
    });
  } catch {
    // Responde 200 mesmo em falha de DB — evita retentativas da Dooki que gerariam duplicatas
  }

  return NextResponse.json({ ok: true, topic });
}
