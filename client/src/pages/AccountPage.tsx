import { useEffect, useState, useCallback } from "react"
import { useSearch } from "@tanstack/react-router"
import { signOut } from "../lib/auth-client"
import { useUser } from "../lib/user-context"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Skeleton } from "../components/ui/skeleton"
import ProfileSection from "../components/ProfileSection"
import WalletCardCarousel from "../components/WalletCardCarousel"
import type { TBankAccount, WaveResponse } from "@/types"
import { createAccount } from "@/actions/account.actions"

interface WalletTransaction {
  id: string
  userId: string
  senderAccountId: string
  senderName: string
  receiverAccountId: string
  receiverName: string
  amount: string
  status: "pending" | "success" | "failed"
  createdAt: string
  updatedAt?: string | null
}

type ApiResponse<T> = WaveResponse<T>

export default function AccountPage() {
  const user = useUser()
  const search = useSearch({ strict: false }) as { section?: string }
  const initialSection = search.section ?? null

  const [accounts, setAccounts] = useState<TBankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [accountName, setAccountName] = useState("")

  const [depositAccountId, setDepositAccountId] = useState("")
  const [depositAmount, setDepositAmount] = useState("")
  const [depositing, setDepositing] = useState(false)
  const [depositError, setDepositError] = useState<string | null>(null)
  const [depositSuccess, setDepositSuccess] = useState<TBankAccount | null>(null)

  const [transferring, setTransferring] = useState(false)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [transferSuccess, setTransferSuccess] = useState<WalletTransaction | null>(null)
  const [senderId, setSenderId] = useState("")
  const [receiverNumber, setReceiverNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [receiverLookup, setReceiverLookup] = useState<{ name: string; id: string } | null>(null)
  const [lookingUp, setLookingUp] = useState(false)

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/wallet/users/${user.id}/accounts`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: ApiResponse<TBankAccount[]> = await res.json()
      const data = json.ok ? json.data : []
      setAccounts(data)
      if (data.length > 0 && !senderId) {
        setSenderId(data[0]!.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts")
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    if (initialSection === "deposit") {
      const el = document.getElementById("deposit-section")
      if (el) el.scrollIntoView({ behavior: "smooth" })
      setDepositAccountId(accounts.length > 0 ? accounts[0]!.id : "")
    }
  }, [initialSection, accounts])

  useEffect(() => {
    if (!receiverNumber.trim() || receiverNumber.length < 8) {
      setReceiverLookup(null)
      return
    }
    const timer = setTimeout(async () => {
      setLookingUp(true)
      try {
        const res = await fetch(`/api/wallet/accounts/by-number/${encodeURIComponent(receiverNumber.trim())}`)
        if (res.ok) {
          const json: ApiResponse<TBankAccount> = await res.json()
          setReceiverLookup(json.ok ? { name: json.data.name, id: json.data.id } : null)
        }
      } catch {
        setReceiverLookup(null)
      } finally {
        setLookingUp(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [receiverNumber])

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountName.trim()) return

    setCreating(true)
    setCreateError(null)

    const accountNumber = `WAVE-${Array.from({ length: 8 }, () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)]
    ).join("")}`

    try {
      const res = await createAccount({
        userId: user.id,
        name: accountName.trim(),
        accountNumber,
        balance: 0,
      });

      if (!res.ok) {
        throw new Error(res.error ?? `HTTP ${res.status}`)
      }
      setAccounts((prev) => [...prev, res.data])
      setAccountName("")
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create account")
    } finally {
      setCreating(false)
    }
  }

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!depositAccountId || !depositAmount.trim()) return

    setDepositing(true)
    setDepositError(null)
    setDepositSuccess(null)

    try {
      const res = await fetch("/api/wallet/accounts/" + depositAccountId + "/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          accountId: depositAccountId,
          amount: Number.parseFloat(depositAmount),
        }),
      })
      const json: ApiResponse<TBankAccount> = await res.json()
      if (!json.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setDepositSuccess(json.data)
      setDepositAmount("")
      fetchAccounts()
    } catch (err) {
      setDepositError(err instanceof Error ? err.message : "Failed to deposit funds")
    } finally {
      setDepositing(false)
    }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!senderId || !receiverLookup || !amount.trim()) return

    setTransferring(true)
    setTransferError(null)
    setTransferSuccess(null)

    const sender = accounts.find((a) => a.id === senderId)

    try {
      const res = await fetch("/api/wallet/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          senderAccountId: senderId,
          senderName: sender?.name ?? "Unknown",
          receiverAccountId: receiverLookup.id,
          receiverName: receiverLookup.name,
          amount: Number.parseFloat(amount),
        }),
      })
      const json: ApiResponse<WalletTransaction> = await res.json()
      if (!json.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setTransferSuccess(json.data)
      setSenderId("")
      setReceiverNumber("")
      setAmount("")
      setReceiverLookup(null)
      fetchAccounts()
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : "Failed to send transfer")
    } finally {
      setTransferring(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const formatCurrency = (value: number | string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value))

  return (
    <>
      <header className="flex items-center justify-between flex-wrap gap-3 px-8 py-5 border-b border-border">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Account</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Button variant="outline" size="sm" onClick={fetchAccounts} disabled={loading}>
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-8 py-8 space-y-6">
        <ProfileSection />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Wallet Accounts</CardTitle>
            <span className="text-xs text-muted-foreground">{accounts.length} total</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            )}

            {error && !loading && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchAccounts}>
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && accounts.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No accounts yet. Create one below.</p>
              </div>
            )}

            {!loading && !error && accounts.length > 0 && (
              <WalletCardCarousel accounts={accounts} />
            )}

            <form onSubmit={handleCreateAccount} className="space-y-3 pt-4 border-t border-border">
              <div className="space-y-1.5">
                <Label htmlFor="account-name">New Account Name</Label>
                <Input
                  id="account-name"
                  placeholder="e.g. Checking, Savings"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  disabled={creating}
                />
              </div>
              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
              <Button type="submit" disabled={creating || !accountName.trim()} className="w-full">
                {creating ? "Creating..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card id="deposit-section">
          <CardHeader>
            <CardTitle>Add Money</CardTitle>
          </CardHeader>
          <CardContent>
            {depositSuccess ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-success/8 p-5 text-center space-y-1">
                  <p className="text-sm font-semibold text-success">Deposit completed</p>
                  <p className="text-lg font-mono font-bold text-foreground">
                    {formatCurrency(depositSuccess.balance)}
                  </p>
                  <p className="text-xs text-muted-foreground">{depositSuccess.name}</p>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setDepositSuccess(null)}>
                  Deposit again
                </Button>
              </div>
            ) : (
              <form onSubmit={handleDeposit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="deposit-account">Into</Label>
                  <select
                    id="deposit-account"
                    value={depositAccountId}
                    onChange={(e) => setDepositAccountId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  >
                    <option value="" disabled>Select an account</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.accountNumber}) · {formatCurrency(acc.balance)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="deposit-amount">Amount (USD)</Label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
                {depositError && (
                  <p className="text-sm text-destructive">{depositError}</p>
                )}
                <Button
                  type="submit"
                  disabled={!depositAccountId || !depositAmount.trim() || Number(depositAmount) <= 0}
                  className="w-full"
                >
                  Add Money
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Send Money</CardTitle>
          </CardHeader>
          <CardContent>
            {transferSuccess ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-success/8 p-5 text-center space-y-1">
                  <p className="text-sm font-semibold text-success">Transfer completed</p>
                  <p className="text-lg font-mono font-bold text-foreground">
                    {formatCurrency(transferSuccess.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {transferSuccess.senderName} &rarr; {transferSuccess.receiverName}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setTransferSuccess(null)}>
                  Send another
                </Button>
              </div>
            ) : (
              <form onSubmit={handleTransfer} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sender">From</Label>
                  <select
                    id="sender"
                    value={senderId}
                    onChange={(e) => setSenderId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  >
                    <option value="" disabled>Select an account</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.accountNumber}) · {formatCurrency(acc.balance)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="receiver">To (account number)</Label>
                  <Input
                    id="receiver"
                    placeholder="e.g. WAVE-XXXXXXXX"
                    value={receiverNumber}
                    onChange={(e) => setReceiverNumber(e.target.value)}
                  />
                  {lookingUp && (
                    <p className="text-xs text-muted-foreground">Looking up account...</p>
                  )}
                  {receiverLookup && !lookingUp && (
                    <p className="text-xs font-medium text-success">{receiverLookup.name}</p>
                  )}
                  {!receiverLookup && !lookingUp && receiverNumber.length >= 8 && (
                    <p className="text-xs text-muted-foreground">No account found with that number</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                {transferError && (
                  <p className="text-sm text-destructive">{transferError}</p>
                )}

                <Button
                  type="submit"
                  disabled={!senderId || !receiverLookup || !amount.trim() || Number(amount) <= 0}
                  className="w-full"
                >
                  Send Money
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="flex justify-between items-center px-8 py-4 text-sm text-muted-foreground/70 border-t border-border">
        <span>Wave Payment Platform</span>
        <span>{accounts.length} account{accounts.length !== 1 ? "s" : ""}</span>
      </footer>

      {(depositing || transferring) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card px-10 py-9 text-center space-y-6 max-w-sm w-full mx-4 rounded-xl shadow-xl">
            <div className="w-10 h-10 mx-auto rounded-full border-2 border-primary/30 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-a-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-mono font-bold text-foreground tracking-tight">
                {formatCurrency(depositing ? depositAmount : amount)}
              </p>
              <p className="text-sm text-muted-foreground">
                {depositing
                  ? accounts.find((a) => a.id === depositAccountId)?.name ?? "Account"
                  : `${accounts.find((a) => a.id === senderId)?.name ?? "Sender"} \u2192 ${receiverLookup?.name ?? "Receiver"}`}
              </p>
            </div>
            <p className="text-xs text-muted-foreground/70">
              {depositing ? "Processing deposit" : "Processing transfer"}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
