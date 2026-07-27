/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession, type NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";
import {
  hasPanelAccess,
  isActivePanelRole,
  resolveHighestRole,
} from "@/lib/roles";

export { resolveHighestRole, getAllowedRoleIds, hasPanelAccess } from "@/lib/roles";

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
        token.id = discordProfile.id || account.providerAccountId;
        token.accessToken = account.access_token;
      }

      if (token.accessToken) {
        try {
          const res = await fetch(`https://discord.com/api/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`, {
            headers: { Authorization: `Bearer ${token.accessToken}` },
            cache: "no-store",
          });

          if (res.ok) {
            const member = await res.json();
            token.roles = Array.isArray(member.roles) ? member.roles.map(String) : [];

            const avatarUrl = member.user?.avatar
              ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png?size=256`
              : null;

            token.picture = avatarUrl;
            token.name = member.nick || member.user?.global_name || member.user?.username || "Agente";

            const resolvedRole = resolveHighestRole(token.roles as string[]);

            if (token.id) {
              const existing = await prisma.member.findUnique({
                where: { discordId: String(token.id) },
              });

              const panelRole =
                resolvedRole ||
                (existing && isActivePanelRole(existing.panelRole || existing.role)
                  ? (existing.panelRole || existing.role)
                  : hasPanelAccess(token.roles as string[])
                    ? "ADM AFL"
                    : null);

              if (panelRole) {
                await prisma.member.upsert({
                  where: { discordId: String(token.id) },
                  update: {
                    avatar: token.picture as string | undefined,
                    name: token.name as string,
                    ...(resolvedRole ? { role: resolvedRole, panelRole: resolvedRole } : {}),
                  },
                  create: {
                    discordId: String(token.id),
                    name: token.name as string,
                    avatar: token.picture as string | undefined,
                    role: panelRole,
                    panelRole,
                  },
                });
              }
            }
          } else {
            console.error("Discord guild member fetch failed:", res.status, await res.text().catch(() => ""));
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
  const userRoles = (((session as any)?.user?.roles || []) as string[]).map(String);
  const discordId = String((session as any)?.user?.id || "");

  let highestRole = resolveHighestRole(userRoles);
  let isPanelMember = hasPanelAccess(userRoles);

  // Fallback: se o JWT não trouxe roles (token expirado / falha Discord),
  // libera quem já está ativo no banco com cargo válido.
  if (session && !isPanelMember && discordId) {
    const dbMember = await prisma.member.findUnique({
      where: { discordId },
    });

    if (dbMember && isActivePanelRole(dbMember.panelRole || dbMember.role)) {
      highestRole = dbMember.panelRole || dbMember.role;
      isPanelMember = true;
    }
  }

  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID || "";
  const masterRoleId = process.env.ROLE_MASTER || "";

  const isAdmin = Boolean(adminRoleId && userRoles.includes(String(adminRoleId)));
  const isMaster = Boolean(masterRoleId && userRoles.includes(String(masterRoleId)));

  return {
    session,
    userRoles,
    highestRole,
    isPanelMember,
    isAdmin,
    isMaster,
    canPostSales: isPanelMember,
    canPostExtras: isAdmin || isMaster,
    canApproveRecords: isAdmin || isMaster,
  };
}
