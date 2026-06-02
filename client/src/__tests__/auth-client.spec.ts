import { describe, it, expect } from "vitest"

describe("auth-client", () => {
  it("should re-export createAuthClient members", async () => {
    const mod = await import("../lib/auth-client")
    expect(typeof mod.signIn).toBe("function")
    expect(typeof mod.signUp).toBe("function")
    expect(typeof mod.signOut).toBe("function")
    expect(typeof mod.useSession).toBe("function")
    expect(mod.$Infer).toBeDefined()
  })
})
