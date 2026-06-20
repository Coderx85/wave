import { useState } from "react"
import { Eye, EyeOff, MoreVertical } from "lucide-react"
import { cn, formatCurrency } from "../lib/utils"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu"
import type { TBankAccountNumber } from "@/types"

interface WalletCardAccount {
  id: string
  name: string
  accountNumber: TBankAccountNumber
  balance: number
}

function maskNumber(num: string) {
  const prefix = "WAVE-"
  if (num.startsWith(prefix)) {
    const rest = num.slice(prefix.length)
    const vis = rest.slice(-4)
    const masked = rest.slice(0, -4).replace(/./g, "\u25CF")
    return `${masked}${masked ? " " : ""}${vis}`
  }
  if (num.length <= 4) return num
  const vis = num.slice(-4)
  return `${num.slice(0, -4).replace(/./g, "\u25CF")} ${vis}`
}

export default function WalletCard({
  account,
}: {
  account: WalletCardAccount
}) {
  const [showBalance, setShowBalance] = useState(true)

  return (
    <div className="group relative w-full aspect-[1.586/1] rounded-xl bg-gradient-to-br from-[var(--wallet-card-from)] to-[var(--wallet-card-to)] overflow-hidden shadow-lg shadow-black/20 transition-transform duration-500 ease-out hover:[transform:perspective(1200px)_rotateY(-3deg)_rotateX(1deg)] motion-reduce:hover:transform-none select-none">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-white/[0.02] to-transparent pointer-events-none transition-opacity duration-700 group-hover:opacity-[0.15] motion-reduce:transition-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--wallet-card-shine),transparent_60%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between h-full p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="w-10 h-7 rounded-[4px] bg-gradient-to-br from-[var(--wallet-chip-from)] to-[var(--wallet-chip-to)] shadow-inner flex items-center justify-center">
            <div className="w-6 h-4 rounded-[2px] border border-[var(--wallet-chip-border)] flex items-center justify-center">
              <div className="w-2 h-2 rounded-full border border-[var(--wallet-chip-dot)]" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowBalance((v) => !v)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white"
              aria-label={showBalance ? "Hide balance" : "Show balance"}
            >
              {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <div className="relative z-10">
                <DropdownMenu>
                <DropdownMenuTrigger className="flex z-10 items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white">
                  <MoreVertical className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => window.location.href = `/account/${account.accountNumber}`}>
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.location.href = "/account/settings"}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.location.href = "/account/transactions"}>
                    Transactions
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[10px] sm:text-xs font-medium tracking-[0.2em] text-white/50 uppercase">
            Balance
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-semibold font-mono tracking-tight transition-all duration-300",
              !showBalance && "blur-lg select-none"
            )}
            aria-hidden={!showBalance}
          >
            {formatCurrency(account.balance)}
          </p>
        </div>

        <div>
          <p className="text-xs sm:text-sm font-mono tracking-[0.15em] text-white/90">
            {account.balance}
          </p>
          <p className="mt-1 text-xs sm:text-sm font-medium text-white/50 truncate">
            {account.name}
          </p>
        </div>
      </div>
    </div>
  )
}
