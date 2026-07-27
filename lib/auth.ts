/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession, type NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";
import {
  hasPanelAccess,
  resolveHighestRole,
  ROLE_NAMES,
} from "@/lib/roles";

export { resolveHighestRole, getAllowedRoleIds, hasPanelAccess } from "@/lib/roles";

async function fetchGuildMemberRoles(discordId: string): Promise<string[] | null> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guild = process.env.DISCORD_GUILD_ID;
  if (!token || !guild || !discordId) return null;

  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guild}/members/${discordId}`,
      {
        headers: { Authorization: `Bot ${token}` },
        cache: "no-store",
      },
    );

    if (!res.ok) return null;
    const member = await res.json();
    return Array.isArray(member.roles) ? member.roles.map(String) : [];
  } catch {
    return null;
  }
}

async function syncMemberPanelRole(
  discordId: string,
  name: string | undefined,
  avatar: string | undefined,
  roles: string[],
) {
  const resolvedRole = resolveHighestRole(roles);
  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID || "";
  const isDiscordAdmin = Boolean(adminRoleId && roles.includes(String(adminRoleId)));

  if (resolvedRole) {
    await prisma.member.upsert({
      where: { discordId },
      update: {
        avatar,
        name,
        role: resolvedRole,
        panelRole: resolvedRole,
      },
      create: {
        discordId,
        name: name || "Agente",
        avatar,
        role: resolvedRole,
        panelRole: resolvedRole,
      },
    });
    return resolvedRole;
  }

  if (isDiscordAdmin || hasPanelAccess(roles)) {
    const panelRole = ROLE_NAMES.ADM;
    await prisma.member.upsert({
      where: { discordId },
      update: {
        avatar,
        name,
        role: panelRole,
        panelRole,
      },
      create: {
        discordId,
        name: name || "Agente",
        avatar,
        role: panelRole,
        panelRole,
      },
    });
    return panelRole;
  }

  // Cargos revogados no Discord: demote imediato (não mantém Master/ADM stale).
  await prisma.member.updateMany({
    where: { discordId },
    data: {
      ...(avatar ? { avatar } : {}),
      ...(name ? { name } : {}),
      role: "Ex-Membro",
      panelRole: "Ex-Membro",
    },
  });

  return null;
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
        token.id = discordProfile.id || account.providerAccountId;
        token.accessToken = account.access_token;
      }

      if (token.accessToken) {
        try {
          const res = await fetch(
            `https://discord.com/api/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`,
            {
              headers: { Authorization: `Bearer ${token.accessToken}` },
              cache: "no-store",
            },
          );

          if (res.ok) {
            const member = await res.json();
            token.roles = Array.isArray(member.roles) ? member.roles.map(String) : [];

            const avatarUrl = member.user?.avatar
              ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png?size=256`
              : null;

            token.picture = avatarUrl;
            token.name =
              member.nick || member.user?.global_name || member.user?.username || "Agente";

            if (token.id) {
              await syncMemberPanelRole(
                String(token.id),
                token.name as string,
                token.picture as string | undefined,
                token.roles as string[],
              );
            }
          } else {
            console.error(
              "Discord guild member fetch failed:",
              res.status,
              await res.text().catch(() => ""),
            );
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
  const jwtRoles = (((session as any)?.user?.roles || []) as string[]).map(String);
  const discordId = String((session as any)?.user?.id || "");

  // Fonte de verdade: cargos vivos no Discord (bot). JWT é fallback.
  const liveRoles = session && discordId ? await fetchGuildMemberRoles(discordId) : null;
  const userRoles = liveRoles ?? jwtRoles;

  if (session && discordId && liveRoles) {
    await syncMemberPanelRole(
      discordId,
      (session as any)?.user?.name,
      (session as any)?.user?.image,
      liveRoles,
    ).catch(() => null);
  }

  const highestRole = resolveHighestRole(userRoles);
  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID || "";
  const masterRoleId = process.env.ROLE_MASTER || "";

  // Privilégios elevados NUNCA vêm do banco — só de cargos Discord vivos/JWT.
  const isAdmin = Boolean(adminRoleId && userRoles.includes(String(adminRoleId)));
  const isMaster =
    Boolean(masterRoleId && userRoles.includes(String(masterRoleId))) ||
    highestRole === ROLE_NAMES.MASTER;
  const isAdmPanel = highestRole === ROLE_NAMES.ADM;

  const isPanelMember = hasPanelAccess(userRoles);

  return {
    session,
    userRoles,
    highestRole,
    isPanelMember,
    isAdmin,
    isMaster,
    canPostSales: isPanelMember,
    canPostExtras: isAdmin || isMaster || isAdmPanel,
    canApproveRecords: isAdmin || isMaster || isAdmPanel,
    rolesSource: liveRoles ? ("discord" as const) : ("jwt" as const),
  };
}
