import { NextResponse } from 'next/server';
import { SpreadsheetService } from '@/services/spreadsheet.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.INTEGRATION_SECRET_TOKEN;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized integration access' }, { status: 401 });
    }

    const spreadsheetService = new SpreadsheetService();
    const payload = await spreadsheetService.generateExportPayload();
    
    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}