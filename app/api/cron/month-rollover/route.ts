import { NextResponse } from 'next/server';
import { AdminService } from '@/services/admin.service';
import { getBrasiliaDateParts, getBrasiliaMonthKey } from '@/lib/brasilia';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const adminService = new AdminService();

function isAuthorized(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // Sem segredo configurado, ainda permite em desenvolvimento local.
    return process.env.NODE_ENV !== 'production';
  }

  const authHeader = req.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const headerSecret = req.headers.get('x-cron-secret') || '';
  const url = new URL(req.url);
  const querySecret = url.searchParams.get('secret') || '';

  return bearer === cronSecret || headerSecret === cronSecret || querySecret === cronSecret;
}

async function run(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const now = new Date();
  const parts = getBrasiliaDateParts(now);
  const result = await adminService.ensureAutomaticMonthRollover(now);

  return NextResponse.json({
    ok: true,
    brasilia: {
      monthKey: getBrasiliaMonthKey(now),
      day: parts.day,
      hour: parts.hour,
      minute: parts.minute,
    },
    ...result,
  });
}

/** Vercel Cron / agendadores: diário 03:00 UTC (= 00:00 Brasília). A virada só altera dados se ainda houver mês anterior aprovado. */
export async function GET(req: Request) {
  try {
    return await run(req);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha na virada automática.' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    return await run(req);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha na virada automática.' },
      { status: 500 },
    );
  }
}
