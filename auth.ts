import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { cleanEnvValue } from "@/lib/env/normalize";
import { resetTestPortfolioRuntime } from "@/lib/server/portfolio/runtime";

const githubClientId = cleanEnvValue(process.env.AUTH_GITHUB_ID);
const githubClientSecret = cleanEnvValue(process.env.AUTH_GITHUB_SECRET);
const authSecret =
  cleanEnvValue(process.env.AUTH_SECRET) ??
  (process.env.NODE_ENV === "production" ? undefined : "ghars-dev-secret");

const isE2ETestMode = process.env.E2E_TEST_MODE === "true";
const githubConfigured =
  Boolean(githubClientId) &&
  Boolean(githubClientSecret) &&
  Boolean(authSecret);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  providers: [
    ...(isE2ETestMode
      ? [
          Credentials({
            id: "e2e",
            name: "E2E Test Mode",
            credentials: {},
            async authorize() {
              resetTestPortfolioRuntime();
              return {
                id: "e2e-user",
                name: "E2E Tester",
                email: "e2e@example.com",
              };
            },
          }),
        ]
      : []),
    ...(githubConfigured
      ? [
          GitHub({
            clientId: githubClientId!,
            clientSecret: githubClientSecret!,
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "github") {
        token.accessToken = account.access_token;
        token.githubLogin =
          typeof profile?.login === "string"
            ? profile.login
            : typeof token.githubLogin === "string"
              ? token.githubLogin
              : undefined;
      }

      if (account?.provider === "e2e") {
        token.sub = user.id;
        token.accessToken = "e2e-test-token";
        token.githubLogin = "e2e-user";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.email ?? "unknown-user";
      }
      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.githubLogin = typeof token.githubLogin === "string" ? token.githubLogin : undefined;
      return session;
    },
  },
});
