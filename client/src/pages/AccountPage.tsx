import { useEffect, useState, useCallback } from "react"
import { useSearch } from "@tanstack/react-router"
import { MoreVertical } from "lucide-react"
import { signOut, useSession } from "../lib/auth-client"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Select } from "../components/ui/select"
import { Skeleton } from "../components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu"
import ProfileSection from "../components/ProfileSection"
import WalletCardCarousel from "../components/WalletCardCarousel"
import { formatCurrency } from "@/lib/utils"
import type { IWalletTransaction, WaveResponse, ITransaction, TBankAccountNumber } from "@/types"
import { createAccount, fetchAccountData } from "@/actions/account.actions"
import AddMoney from "../components/AddMoney"
import TransactionSuccess from "../components/ui/transaction-success"
import ProcessingOverlay from "../components/ui/processing-overlay"
import PageHeader from "../components/ui/page-header"
import PageFooter from "../components/ui/page-footer"

export default function AccountPage() {
  const { data: session } = useSession()
  const user = session!.user
  const search = useSearch({ strict: false }) as { section?: string }
  const initialSection = search.section ?? null

  const [accounts, setAccounts] = useState<IWalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [accountName, setAccountName] = useState("")

  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<ITransaction | null>(null);
  const [senderAccountNumber, setSenderAccountNumber] = useState<TBankAccountNumber>();
  const [receiverNumber, setReceiverNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [receiverLookup, setReceiverLookup] = useState<{ name: string; accountNumber: TBankAccountNumber } | null>(null)
  const [lookingUp, setLookingUp] = useState(false)

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const res = await fetchAccountData(user.id);
      if(!res.ok) {
        setAccounts([])
        setError(res.message || "Failed to load accounts")
        
        return;
      }

      setAccounts(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load accounts")
      setAccounts([])
    } finally {
      setLoading(false);
    }
  }, [user.id])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    if (initialSection === "deposit" || initialSection === "transfer") {
      const id = initialSection === "deposit" ? "deposit-section" : "transfer-section"
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: "smooth" })
    }
  }, [initialSection])

  useEffect(() => {
    if (!receiverNumber.trim() || receiverNumber.length < 8) {
      setReceiverLookup(null)
      return
    }
    const timer = setTimeout(async () => {
      setLookingUp(true)
      try {
        const res = await fetch(`/api/wallet/accounts/by-number/${encodeURIComponent(receiverNumber.trim())}`)
        const json: WaveResponse<IWalletTransaction> = await res.json()
        if (json.ok) {
          setReceiverLookup({
            accountNumber: json.data.accountNumber,
            name: json.data.name,
          })
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

    const accountNumber = String(Math.floor(Math.random() * 9_000_000_000_000) + 1_000_000_000_000) as unknown as TBankAccountNumber;

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

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!senderAccountNumber || !receiverLookup || !amount.trim()) return

    setTransferring(true)
    setTransferError(null)
    setTransferSuccess(null)

    const sender = accounts.find((a) => a.accountNumber === senderAccountNumber)

    try {
      const res = await fetch("/api/wallet/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          senderAccountNumber: senderAccountNumber,
          senderName: sender?.name ?? "Unknown",
          receiverAccountNumber: receiverLookup.accountNumber,
          receiverName: receiverLookup.name,
          amount: Number.parseFloat(amount),
        }),
      })
      const json: WaveResponse<ITransaction> = await res.json()
      if (!json.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setTransferSuccess(json.data)
      setSenderAccountNumber(json.data.senderAccountNumber)
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

  return (
    <>
      <PageHeader
        title="Account"
        email={user.email}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={fetchAccounts} disabled={loading}>
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center justify-center w-8 h-8 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => window.location.href = "/account/settings"}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = "/account/transactions"}>
                  Transactions
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <main className="grid grid-cols-2 gap-6 mx-auto w-full px-8 py-8 space-y-6">
        <div className="space-y-6 flex flex-col px-6 w-full mx-auto">
          <ProfileSection />

          <Card className="w-full mx-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Wallet Accounts</CardTitle>
              <span className="text-xs text-muted-foreground">{accounts.length} total</span>
            </CardHeader>
            <CardContent className="space-y-3 w-full">
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
        </div>

        <div className="space-y-6 flex flex-col px-6 w-full mx-auto">
          <AddMoney accounts={accounts} userId={user.id} onDeposit={fetchAccounts} />

          <Card id="transfer-section" className="w-full mx-auto">
            <CardHeader className="card-header-accent">
              <CardTitle>Send Money</CardTitle>
            </CardHeader>
            <CardContent>
              {transferSuccess ? (
                <TransactionSuccess
                  title="Transfer completed"
                  amount={formatCurrency(transferSuccess.amount)}
                  description={`${transferSuccess.senderName} \u2192 ${transferSuccess.receiverName}`}
                  actionLabel="Send another"
                  onReset={() => setTransferSuccess(null)}
                />
              ) : (
                <form onSubmit={handleTransfer} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="sender">From</Label>
                    <Select
                      id="sender"
                      value={senderAccountNumber as unknown as number}
                      onChange={(e) => setSenderAccountNumber(e.target.value as unknown as TBankAccountNumber)}
                      required
                    >
                      <option value="" disabled>Select an account</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.accountNumber as unknown as number}>
                          {acc.name} ({acc.accountNumber}) · {formatCurrency(acc.balance)}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="receiver">To (account number)</Label>
                    <Input
                      id="receiver"
                      placeholder="e.g. 1000000000000"
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
                    disabled={!senderAccountNumber || !receiverLookup || !amount.trim() || Number(amount) <= 0}
                    className="w-full"
                  >
                    Send Money
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <PageFooter right={<span>{accounts.length} account{accounts.length !== 1 ? "s" : ""}</span>} />

      {transferring && (
        <ProcessingOverlay
          amount={formatCurrency(amount)}
          description={`${accounts.find((a) => a.accountNumber === senderAccountNumber)?.name ?? "Sender"} \u2192 ${receiverLookup?.name ?? "Receiver"}`}
          label="Processing transfer"
        />
      )}
    </>
  )
}
