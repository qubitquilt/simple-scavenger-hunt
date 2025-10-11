import { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      admin: boolean
    }
  }

  interface User {
    admin: boolean
  }

  interface JWT {
    admin: boolean
  }
}

export async function credentialsAuthorize(credentials: any) {
  if (credentials?.username === process.env.ADMIN_USERNAME && credentials?.password === process.env.ADMIN_PASSWORD) {
    return { id: 'admin', name: 'Admin User', email: 'admin@example.com', admin: true }
  }
  return null
}


export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        return credentialsAuthorize(credentials)
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.admin = token.admin as boolean
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.admin = user.admin as boolean
      }
      return token
    },
  },
  pages: {
    signIn: '/admin/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}