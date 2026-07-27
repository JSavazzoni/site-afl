/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { getCurrentAccess } from '@/lib/auth';
import { RecordService } from '@/services/record.service';

export const dynamic = 'force-dynamic';

const recordService = new RecordService();

export async function GET() {
  try {
    const access = await getCurrentAccess();
    if (!access.session || !access.isPanelMember) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const records = await recordService.getActiveRecords();
    return NextResponse.json(records);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao carregar registros.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = await getCurrentAccess();
    if (!access.session || !access.canPostSales) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const body = await req.json();
    const recordType = body?.tipo || 'VENDA';

    if (recordType !== 'VENDA' && !access.isAdmin && !access.isMaster) {
      return NextResponse.json({ error: 'Somente Master/Admin podem criar este tipo de registro.' }, { status: 403 });
    }

    const canPostExtras = access.isAdmin || access.isMaster;
    const safePayload = canPostExtras
      ? body
      : {
          ...body,
          tipo: 'VENDA',
          vendedorId: (access.session as any).user.id,
          vendedorNome: (access.session as any).user.name || 'Agente',
        };

    const result = await recordService.createRecord(safePayload);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao criar registro.' }, { status: 500 });
  }
}