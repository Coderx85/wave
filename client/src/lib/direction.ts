import type { ITransaction } from "@/types"

export type Direction = "in" | "out" | "self"

/**
 * Determines whether a transaction is incoming, outgoing, or a self-transfer
 * relative to the user's accounts.
 *
 * @param tx - The transaction to classify
 * @param userAccountNumbers - Set of the user's account numbers (as strings)
 * @returns "in" if money came in, "out" if money went out, "self" if same account
 */
export function getDirection(
  tx: ITransaction,
  userAccountNumbers: Set<string>,
): Direction {
  const sender = String(tx.senderAccountNumber)
  const receiver = String(tx.receiverAccountNumber)

  if (sender === receiver) return "self"

  const senderIsUser = userAccountNumbers.has(sender)
  const receiverIsUser = userAccountNumbers.has(receiver)

  if (receiverIsUser && !senderIsUser) return "in"
  return "out"
}
