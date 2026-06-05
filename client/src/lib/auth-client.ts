import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient()

export const { signIn, signUp, signOut, useSession, $Infer } = authClient

export type Session = typeof $Infer.Session
export type User = typeof $Infer.Session.user
