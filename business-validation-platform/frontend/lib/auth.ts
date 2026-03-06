import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import EmailProvider from "next-auth/providers/email"

const isRealGoogleCredentials =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_ID !== "placeholder" &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_SECRET !== "placeholder"

const isRealEmailServer =
  process.env.EMAIL_SERVER &&
  !process.env.EMAIL_SERVER.includes("localhost")

const providers = [
  ...(isRealGoogleCredentials
    ? [GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      })]
    : []),
  ...(isRealEmailServer
    ? [EmailProvider({
        server: process.env.EMAIL_SERVER,
        from: process.env.EMAIL_FROM ?? "noreply@bizvalidation.com",
      })]
    : []),
]

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
})
