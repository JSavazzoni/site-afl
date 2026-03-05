import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: 'identify email guilds guilds.members.read' } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }: any) {
      if (account && profile) {
        token.id = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) { (session as any).user.id = token.id; }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};