import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "./api/auth/[...nextauth]/route";
import Dashboard from "./Dashboard";

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Pega os cargos do cara direto do Discord no momento do login
  const userRoles = (session as any)?.user?.roles || [];
  
  // IDs válidos mapeados no seu .env
  const validRoles = [
    process.env.ROLE_RESP_VENDAS,
    process.env.ROLE_MASTER,
    process.env.ROLE_RESP_AFL,
    process.env.ROLE_AUXILIAR,
    process.env.ROLE_LIDER,
    process.env.ROLE_SUB_LIDER,
    process.env.ROLE_MEMBRO
  ].filter(Boolean); // Remove qualquer um que estiver vazio

  // Verifica se o cara tem pelo menos um dos cargos válidos
  const hasAccess = userRoles.some((role: string) => validRoles.includes(role));

  if (!hasAccess) {
    redirect("/access-denied");
  }

  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID || "";
  const isAdmin = userRoles.includes(adminRoleId);

  return <Dashboard initialIsAdmin={isAdmin} userSession={session} />;
}