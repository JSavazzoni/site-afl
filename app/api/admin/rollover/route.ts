import { NextResponse } from 'next/server';
import { getCurrentAccess } from '@/lib/auth';
import { AdminService } from '@/services/admin.service';

export const dynamic = 'force-dynamic';

const adminService = new AdminService();

export async function POST() {
  try {
    const access = await getCurrentAccess();
    if (!access.session || !access.isAdmin) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    await adminService.executeMonthRollover();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}