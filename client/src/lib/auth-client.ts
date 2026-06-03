import { createAuthClient } from "better-auth/react"

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  $Infer,
} = createAuthClient()

export type Session = typeof $Infer.Session
