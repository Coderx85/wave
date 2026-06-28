import { describe, it, expect } from "vitest"
import { getDirection } from "../direction"
import type { ITransaction } from "@/types"

function tx(overrides: Partial<ITransaction> = {}): ITransaction {
  return {
    id: "tx_1" as any,
    amount: "100",
    userId: "user_1",
    senderAccountNumber: "1000000000001" as any,
    senderName: "Alice",
    receiverAccountNumber: "1000000000002" as any,
    receiverName: "Bob",
    status: "success",
    createdAt: new Date().toISOString(),
    updatedAt: null,
    ...overrides,
  }
}

describe("getDirection", () => {
  it("returns 'self' when sender equals receiver", () => {
    const t = tx({
      senderAccountNumber: "1000000000001" as any,
      receiverAccountNumber: "1000000000001" as any,
    })
    expect(getDirection(t, new Set(["1000000000001"]))).toBe("self")
  })

  it("returns 'in' when receiver is user and sender is not", () => {
    const t = tx({
      senderAccountNumber: "1000000000099" as any,
      receiverAccountNumber: "1000000000001" as any,
    })
    expect(getDirection(t, new Set(["1000000000001"]))).toBe("in")
  })

  it("returns 'out' when sender is user and receiver is not", () => {
    const t = tx({
      senderAccountNumber: "1000000000001" as any,
      receiverAccountNumber: "1000000000099" as any,
    })
    expect(getDirection(t, new Set(["1000000000001"]))).toBe("out")
  })

  it("returns 'out' when both sender and receiver are user accounts", () => {
    const t = tx({
      senderAccountNumber: "1000000000001" as any,
      receiverAccountNumber: "1000000000002" as any,
    })
    expect(getDirection(t, new Set(["1000000000001", "1000000000002"]))).toBe("out")
  })

  it("returns 'out' when neither account belongs to user", () => {
    const t = tx({
      senderAccountNumber: "1000000000098" as any,
      receiverAccountNumber: "1000000000099" as any,
    })
    expect(getDirection(t, new Set(["1000000000001"]))).toBe("out")
  })

  it("handles numeric account numbers by converting to string", () => {
    const t = tx({
      senderAccountNumber: 1000000000001 as any,
      receiverAccountNumber: 1000000000002 as any,
    })
    expect(getDirection(t, new Set(["1000000000001"]))).toBe("out")
  })

  it("handles bigint account numbers", () => {
    const t = tx({
      senderAccountNumber: BigInt("1000000000001") as any,
      receiverAccountNumber: BigInt("1000000000002") as any,
    })
    expect(getDirection(t, new Set(["1000000000001"]))).toBe("out")
  })

  it("returns 'in' for self-deposit (sender===receiver) even if in user set", () => {
    const t = tx({
      senderAccountNumber: "1000000000001" as any,
      receiverAccountNumber: "1000000000001" as any,
    })
    expect(getDirection(t, new Set(["1000000000001"]))).toBe("self")
  })
})
