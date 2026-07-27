import { NextResponse } from 'next/server';
import { getCurrentAccess } from '@/lib/auth';
import { RecordService } from '@/services/record.service';

export const dynamic = 'force-dynamic';

const recordService = new RecordService();

export async function POST(req: Request) {
  try {
    const access = await getCurrentAccess();
    if (!access.session || !access.canApproveRecords) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const { recordId, action } = await req.json();
    if (!recordId || !action) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    const evaluatedBy =
      (access.session as { user?: { name?: string; id?: string } }).user?.name ||
      (access.session as { user?: { id?: string } }).user?.id ||
      'Sistema';

    await recordService.evaluateRecord(recordId, action, evaluatedBy);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao avaliar registro.' }, { status: 500 });
  }
}
