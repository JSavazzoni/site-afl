import { NextResponse } from 'next/server';
import { RecordService } from '@/services/record.service';

export const dynamic = 'force-dynamic';

const recordService = new RecordService();

export async function POST(req: Request) {
  try {
    const { recordId, action, evaluatedBy } = await req.json();
    await recordService.evaluateRecord(recordId, action, evaluatedBy);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}