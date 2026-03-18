import { NextResponse } from 'next/server';
import { RecordService } from '@/services/record.service';

export const dynamic = 'force-dynamic';

const recordService = new RecordService();

export async function GET() {
  try {
    const records = await recordService.getActiveRecords();
    return NextResponse.json(records);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await recordService.createRecord(body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}