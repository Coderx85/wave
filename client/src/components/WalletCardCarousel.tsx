import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import WalletCard from "./WalletCard"

interface WalletCardAccount {
  id: string
  name: string
  accountNumber: string
  balance: number
}

export default function WalletCardCarousel({ accounts }: { accounts: WalletCardAccount[] }) {
  const [current, setCurrent] = useState(0)

  if (accounts.length === 0) return null

  const prev = () => setCurrent((c) => Math.max(0, c - 1))
  const next = () => setCurrent((c) => Math.min(accounts.length - 1, c + 1))

  return (
    <div>
      <div className="overflow-hidden rounded-xl">
        <div
          className="flex transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {accounts.map((acc) => (
            <div key={acc.id} className="flex-[0_0_100%] min-w-0">
              <WalletCard account={acc} />
            </div>
          ))}
        </div>
      </div>

      {accounts.length > 1 && (
        <div className="flex items-center justify-between mt-3">
          <button
            type="button"
            onClick={prev}
            disabled={current === 0}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-background hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Previous account"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>

          <div className="flex items-center gap-1.5">
            {accounts.map((acc, i) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === current ? "bg-foreground" : "bg-border"
                }`}
                aria-label={`Show ${acc.name}`}
              />
            ))}
          </div>

          <span className="text-sm font-medium text-muted-foreground">{accounts[current]!.name}</span>

          <button
            type="button"
            onClick={next}
            disabled={current === accounts.length - 1}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-background hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Next account"
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>
      )}
    </div>
  )
}
