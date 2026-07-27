/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession, type NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";

const ROLE_HIERARCHY = [
  { id: process.env.ROLE_RESP_VENDAS, name: "Resp.Vendas" },
  { id: process.env.ROLE_MASTER, name: "Master AFL" },
  { id: process.env.ROLE_RESP_AFL, name: "Resp.AFL" },
  { id: process.env.ROLE_AUXILIAR, name: "Auxiliar AFL" },
  { id: process.env.ROLE_LIDER, name: "Lider AFL" },
  { id: process.env.ROLE_SUB_LIDER, name: "Sub-Lider AFL" },
  { id: process.env.ROLE_MEMBRO, name: "Membro AFL" },
] as const;

export function resolveHighestRole(discordRoles: string[] = []) {
  for (const role of ROLE_HIERARCHY) {
    if (role.id && discordRoles.includes(role.id)) {
      return role.name;
    }
  }

  return null;
}

export function getAllowedRoleIds() {
  return ROLE_HIERARCHY.map((role) => role.id).filter(Boolean) as string[];
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify email guilds guilds.members.read" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const discordProfile = profile as any;
        token.id = discordProfile.id;
        token.accessToken = account.access_token;
      }

      if (token.accessToken) {
        try {
          const res = await fetch(`https://discord.com/api/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`, {
            headers: { Authorization: `Bearer ${token.accessToken}` },
          });

          if (res.ok) {
            const member = await res.json();
            token.roles = member.roles;

            const avatarUrl = member.user.avatar
              ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png?size=256`
              : null;

            token.picture = avatarUrl;
            token.name = member.nick || member.user.global_name || member.user.username || "Agente";

            await prisma.member.upsert({
              where: { discordId: String(token.id) },
              update: {
                avatar: token.picture as string | undefined,
                name: token.name as string,
                role: resolveHighestRole(member.roles) || "Membro AFL",
                panelRole: resolveHighestRole(member.roles) || "Membro AFL",
              },
              create: {
                discordId: String(token.id),
                name: token.name as string,
                avatar: token.picture as string | undefined,
                role: resolveHighestRole(member.roles) || "Membro AFL",
                panelRole: resolveHighestRole(member.roles) || "Membro AFL",
              },
            });
          }
        } catch (error) {
          console.error("Discord member sync failed:", error);
        }
      }

      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        session.user.roles = token.roles || [];
        session.user.image = token.picture;
        session.user.name = token.name;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getCurrentAccess() {
  const session = await getServerSession(authOptions);
  const userRoles = ((session as any)?.user?.roles || []) as string[];
  const highestRole = resolveHighestRole(userRoles);
  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID || "";
  const masterRoleId = process.env.ROLE_MASTER || "";

  const isPanelMember = Boolean(highestRole);
  const isAdmin = Boolean(adminRoleId && userRoles.includes(adminRoleId));
  const isMaster = Boolean(masterRoleId && userRoles.includes(masterRoleId));

  return {
    session,
    userRoles,
    highestRole,
    isPanelMember,
    isAdmin,
    isMaster,
    canPostSales: isPanelMember,
    canApproveRecords: isAdmin || isMaster,
  };
}