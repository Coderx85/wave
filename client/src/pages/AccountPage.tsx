import { useState, useEffect, useMemo } from "react"
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
import type { IWalletTransaction, ITransaction, TBankAccountNumber } from "@/types"
import { useAccounts, useCreateAccount } from "@/lib/queries/accounts"
import { useTransfer } from "@/lib/queries/transactions"
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

  const accountsQuery = useAccounts(user.id)
  const createAccountMutation = useCreateAccount(user.id)
  const transferMutation = useTransfer(user.id)

  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data])

  const [accountName, setAccountName] = useState("")

  const [senderAccountNumber, setSenderAccountNumber] = useState<TBankAccountNumber>()
  const [receiverNumber, setReceiverNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [receiverLookup, setReceiverLookup] = useState<{ name: string; accountNumber: TBankAccountNumber } | null>(null)
  const [lookingUp, setLookingUp] = useState(false)

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
        const json = await res.json()
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

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountName.trim()) return

    const accountNumber = String(Math.floor(Math.random() * 9_000_000_000_000) + 1_000_000_000_000) as unknown as TBankAccountNumber

    createAccountMutation.mutate(
      { name: accountName.trim(), accountNumber, balance: 0 },
      {
        onSuccess: () => {
          setAccountName("")
        },
      },
    )
  }

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!senderAccountNumber || !receiverLookup || !amount.trim()) return

    const sender = accounts.find((a) => a.accountNumber === senderAccountNumber)

    transferMutation.mutate(
      {
        senderAccountNumber: String(senderAccountNumber),
        senderName: sender?.name ?? "Unknown",
        receiverAccountNumber: String(receiverLookup.accountNumber),
        receiverName: receiverLookup.name,
        amount: Number.parseFloat(amount),
      },
      {
        onSuccess: (data) => {
          setSenderAccountNumber(data.senderAccountNumber as unknown as TBankAccountNumber)
          setReceiverNumber("")
          setAmount("")
          setReceiverLookup(null)
        },
      },
    )
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
            <Button variant="outline" size="sm" onClick={() => accountsQuery.refetch()} disabled={accountsQuery.isLoading}>
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
              {accountsQuery.isLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              )}

              {accountsQuery.isError && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <p className="text-sm text-muted-foreground">{accountsQuery.error?.message ?? "Failed to load accounts"}</p>
                  <Button variant="outline" size="sm" onClick={() => accountsQuery.refetch()}>
                    Retry
                  </Button>
                </div>
              )}

              {!accountsQuery.isLoading && !accountsQuery.isError && accounts.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">No accounts yet. Create one below.</p>
                </div>
              )}

              {!accountsQuery.isLoading && !accountsQuery.isError && accounts.length > 0 && (
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
                    disabled={createAccountMutation.isPending}
                  />
                </div>
                {createAccountMutation.isError && (
                  <p className="text-sm text-destructive">{createAccountMutation.error?.message ?? "Failed to create account"}</p>
                )}
                <Button type="submit" disabled={createAccountMutation.isPending || !accountName.trim()} className="w-full">
                  {createAccountMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 flex flex-col px-6 w-full mx-auto">
          <AddMoney accounts={accounts} userId={user.id} onDeposit={() => accountsQuery.refetch()} />

          <Card id="transfer-section" className="w-full mx-auto">
            <CardHeader className="card-header-accent">
              <CardTitle>Send Money</CardTitle>
            </CardHeader>
            <CardContent>
              {transferMutation.data && !transferMutation.isPending ? (
                <TransactionSuccess
                  title="Transfer completed"
                  amount={formatCurrency(transferMutation.data.amount)}
                  description={`${transferMutation.data.senderName} \u2192 ${transferMutation.data.receiverName}`}
                  actionLabel="Send another"
                  onReset={() => transferMutation.reset()}
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

                  {transferMutation.isError && (
                    <p className="text-sm text-destructive">{transferMutation.error?.message ?? "Failed to send transfer"}</p>
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

      {transferMutation.isPending && (
        <ProcessingOverlay
          amount={formatCurrency(amount)}
          description={`${accounts.find((a) => a.accountNumber === senderAccountNumber)?.name ?? "Sender"} \u2192 ${receiverLookup?.name ?? "Receiver"}`}
          label="Processing transfer"
        />
      )}
    </>
  )
}
