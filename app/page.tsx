import { redirect } from "next/navigation";
import { getCurrentAccess } from "@/lib/auth";
import Dashboard from "./Dashboard";

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const access = await getCurrentAccess();
  const { session } = access;

  if (!session) {
    redirect("/login");
  }

  if (!access.isPanelMember) {
    redirect("/access-denied");
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