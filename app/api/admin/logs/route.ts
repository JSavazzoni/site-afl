import { NextResponse } from 'next/server';
import { getCurrentAccess } from '@/lib/auth';
import { AdminService } from '@/services/admin.service';

export const dynamic = 'force-dynamic';

const adminService = new AdminService();

export async function DELETE(req: Request) {
  try {
    const access = await getCurrentAccess();
    if (!access.session || !access.isAdmin) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id || typeof id !== 'string' || id.length > 64) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    await adminService.deleteLog(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao excluir log.' }, { status: 500 });
  }
}