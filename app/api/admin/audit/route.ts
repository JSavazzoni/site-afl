import { NextResponse } from 'next/server';
import { AdminService } from '@/services/admin.service';

export const dynamic = 'force-dynamic';

const adminService = new AdminService();

export async function GET() {
  try {
    await adminService.runSystemAudit();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}