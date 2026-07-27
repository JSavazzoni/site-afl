import { redirect } from "next/navigation";
import { getCurrentAccess } from "@/lib/auth";
import { AdminService } from "@/services/admin.service";
import Dashboard from "./Dashboard";

export const dynamic = 'force-dynamic';

const adminService = new AdminService();

export default async function HomePage() {
  const access = await getCurrentAccess();
  const { session } = access;

  if (!session) {
    redirect("/login");
  }

  if (!access.isPanelMember) {
    redirect("/access-denied");
  }

  // Virada automática (Brasília): se ainda houver mês anterior aprovado, fecha ao abrir o painel.
  try {
    await adminService.ensureAutomaticMonthRollover();
  } catch (error) {
    console.error("Falha na virada automática de mês:", error);
  }

  return (
    <Dashboard
      initialPermissions={{
        isAdmin: access.isAdmin,
        isMaster: access.isMaster,
        canPostSales: access.canPostSales,
        canPostExtras: access.canPostExtras,
        canApproveRecords: access.canApproveRecords,
      }}
      userSession={session}
    />
  );
}