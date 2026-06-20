import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select } from "./ui/select"
import { formatCurrency } from "@/lib/utils"
import { deposit } from "@/actions/account.actions"
import type { IWalletTransaction, TBankAccountNumber } from "@/types"
import TransactionSuccess from "./ui/transaction-success"
import ProcessingOverlay from "./ui/processing-overlay"

export default function AddMoney({
  accounts,
  userId,
  onDeposit,
}: {
  accounts: { id: string; name: string; accountNumber: TBankAccountNumber; balance: number }[]
  userId: string
  onDeposit?: () => void
}) {
  const [accountNumber, setAccountNumber] = useState<TBankAccountNumber | undefined>(
    accounts.length > 0 ? accounts[0]!.accountNumber : undefined,
  )
  const [amount, setAmount] = useState("")
  const [depositing, setDepositing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<IWalletTransaction | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountNumber || !amount.trim()) return

    setDepositing(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await deposit({
        userId,
        accountNumber,
        amount: Number.parseFloat(amount),
      })
      if (!res.ok) throw new Error(res.error ?? "Failed to deposit funds")
      setSuccess(res.data)
      setAmount(res.data.balance.toString())
      onDeposit?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deposit funds")
    } finally {
      setDepositing(false)
    }
  }

  return (
    <Card id="deposit-section" className="w-full mx-auto">
      <CardHeader className="card-header-accent">
        <CardTitle>Add Money</CardTitle>
      </CardHeader>
      <CardContent className="w-full">
        {success ? (
          <TransactionSuccess
            title="Deposit completed"
            amount={formatCurrency(success.balance)}
            description={success.name}
            actionLabel="Deposit again"
            onReset={() => setSuccess(null)}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="addmoney-account">Into</Label>
              <Select
                id="addmoney-account"
                value={accountNumber as unknown as string}
                onChange={(e) => setAccountNumber(e.target.value as unknown as TBankAccountNumber)}
                required
              >
                <option value="" disabled>Select an account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.accountNumber as unknown as number}>
                    {acc.name} ({String(acc.accountNumber)}) · {formatCurrency(acc.balance)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addmoney-amount">Amount (USD)</Label>
              <Input
                id="addmoney-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              type="submit"
              disabled={!accountNumber}
              className="w-full"
            >
              {depositing ? "Processing..." : "Add Money"}
            </Button>
          </form>
        )}
      </CardContent>

      {depositing && (
        <ProcessingOverlay
          amount={formatCurrency(amount)}
          description={accounts.find((a) => a.accountNumber === accountNumber)?.name ?? "Account"}
          label="Processing deposit"
        />
      )}
    </Card>
  )
}
