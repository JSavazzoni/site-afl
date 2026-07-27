import { NextResponse } from 'next/server';
import { AdminService } from '@/services/admin.service';
import { getBrasiliaDateParts, getBrasiliaMonthKey } from '@/lib/brasilia';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const adminService = new AdminService();

function isAuthorized(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // Produção sem segredo = fechado. Dev local pode rodar sem CRON_SECRET.
    return process.env.NODE_ENV !== 'production';
  }

  const authHeader = req.headers.get('authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const headerSecret = req.headers.get('x-cron-secret') || '';

  // Nunca aceitar segredo em query string (vaza em logs/histórico).
  return bearer === cronSecret || headerSecret === cronSecret;
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

/** Vercel Cron / agendadores: diário 03:00 UTC (= 00:00 Brasília). */
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
