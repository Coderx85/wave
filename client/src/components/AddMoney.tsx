import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { deposit } from "@/actions/account.actions"
import type { IWalletTransaction, TBankAccountNumber } from "@/types"

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value))

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
    <Card id="deposit-section">
      <CardHeader>
        <CardTitle>Add Money</CardTitle>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-success/15 p-5 text-center space-y-1">
              <p className="text-sm font-semibold text-success">Deposit completed</p>
              <p className="text-lg font-mono font-bold text-foreground">
                {formatCurrency(success.balance)}
              </p>
              <p className="text-xs text-muted-foreground">{success.name}</p>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => setSuccess(null)}>
              Deposit again
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="addmoney-account">Into</Label>
              <select
                id="addmoney-account"
                value={accountNumber as unknown as string}
                onChange={(e) => setAccountNumber(e.target.value as unknown as TBankAccountNumber)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                <option value="" disabled>Select an account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.accountNumber as unknown as number}>
                    {acc.name} ({String(acc.accountNumber)}) · {formatCurrency(acc.balance)}
                  </option>
                ))}
              </select>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card px-10 py-9 text-center space-y-6 max-w-sm w-full mx-4 rounded-xl shadow-xl">
            <div className="w-10 h-10 mx-auto rounded-full border-2 border-primary/30 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-a-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-mono font-bold text-foreground tracking-tight">
                {formatCurrency(amount)}
              </p>
              <p className="text-sm text-muted-foreground">
                {accounts.find((a) => a.accountNumber === accountNumber)?.name ?? "Account"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground/70">Processing deposit</p>
          </div>
        </div>
      )}
    </Card>
  )
}
