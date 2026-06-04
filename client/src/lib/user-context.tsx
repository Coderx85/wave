import { createContext, useContext } from "react"
import type { Session } from "./auth-client"

const UserContext = createContext<Session["user"] | null>(null)

export function UserProvider({ user, children }: { user: Session["user"]; children: React.ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export function useUser() {
  const user = useContext(UserContext)
  if (!user) throw new Error("useUser must be used within a UserProvider")
  return user
}
