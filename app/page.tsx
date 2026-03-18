import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "./api/auth/[...nextauth]/route";
import Dashboard from "./Dashboard";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const discordId = (session as any)?.user?.id;
  
  if (discordId) {
    const dbUser = await prisma.member.findUnique({
      where: { discordId }
    });
    
    const activeRoles = ["Resp.Vendas", "Master AFL", "Resp.AFL", "Auxiliar AFL", "Lider AFL", "Sub-Lider AFL", "Membro AFL"];
    const userRole = dbUser?.panelRole || dbUser?.role || "";
    
    if (!activeRoles.includes(userRole)) {
      redirect("/login");
    }
  }

  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID || "";
  const userRoles = (session as any)?.user?.roles || [];
  const isAdmin = userRoles.includes(adminRoleId);

  return <Dashboard initialIsAdmin={isAdmin} userSession={session} />;
}