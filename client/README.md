# Wave Frontend

React 19 + TanStack Router + TanStack Query + TanStack Table frontend for the Wave payment platform.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Routing | TanStack Router |
| State/Data | TanStack Query (React Query) |
| Tables | TanStack Table |
| Auth | Better Auth (client) |
| Styling | Tailwind CSS 3 |
| Testing | Vitest + React Testing Library |
| Runtime | Bun |

## Project Structure

```
client/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # shadcn/ui primitives (Button, Card, Input, etc.)
│   │   ├── AuthPage.tsx
│   │   ├── NotificationPage.tsx
│   │   ├── DataTable.tsx
│   │   ├── ActivityTimeline.tsx
│   │   └── AddMoney.tsx
│   ├── pages/           # Route page components
│   │   ├── HomePage.tsx
│   │   ├── TransactionsPage.tsx
│   │   ├── TransactionDetailPage.tsx
│   │   ├── AccountPage.tsx
│   │   ├── AccountDetailPage.tsx
│   │   ├── AccountTransactionsPage.tsx
│   │   ├── AccountSettingsPage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── NotificationPreferencesPage.tsx
│   │   └── PerformancePage.tsx
│   ├── lib/             # Core utilities
│   │   ├── auth-client.ts
│   │   ├── queryClient.ts    # React Query client + fetchJSON adapter
│   │   ├── direction.ts      # Shared getDirection utility
│   │   └── queries/          # React Query hooks
│   │       ├── accounts.ts       # useAccounts, useCreateAccount, useDeposit
│   │       ├── transactions.ts   # useTransactions, useTransfer
│   │       ├── ledger.ts         # useLedgerEntries
│   │       ├── notifications.ts  # useNotifications, useDismissNotification
│   │       └── notificationPrefs.ts
│   ├── types/           # TypeScript type definitions
│   ├── styles.css       # Tailwind source
│   ├── index.css        # Compiled Tailwind output
│   ├── main.tsx         # Entry point (QueryClientProvider + RouterProvider)
│   ├── App.tsx          # Shell layout (nav + Outlet)
│   └── router.tsx       # TanStack Router route tree
├── index.html
├── vitest.config.ts
└── tsconfig.json
```

## Getting Started

```bash
# Install dependencies
bun install

# Start dev server (with HMR)
bun run dev
```

The dev server runs on `http://localhost:5173` by default.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server with hot reload |
| `bun run build` | Build for production |
| `bun run start` | Run production build |
| `bun run test` | Run test suite |
| `bun run test:watch` | Run tests in watch mode |
| `bun run tw` | Compile Tailwind CSS |
| `bun run tw:watch` | Compile Tailwind CSS in watch mode |
| `bun run typecheck` | Type-check without emitting |

## Data Fetching Pattern

All server data is fetched through React Query hooks in `src/lib/queries/`. The `fetchJSON` adapter in `src/lib/queryClient.ts` unwraps `WaveResponse<T>` at the seam boundary — React Query handles loading, error, and cache states.

```tsx
// Example: using hooks in a page
import { useAccounts } from "@/lib/queries/accounts"
import { useTransactions } from "@/lib/queries/transactions"

function MyPage() {
  const { data: accounts, isLoading } = useAccounts(userId)
  const { data: transactions } = useTransactions(userId)
  // ...
}
```

## Routes

| Path | Page |
|------|------|
| `/` | HomePage |
| `/transactions` | TransactionsPage |
| `/transactions/$transactionId` | TransactionDetailPage |
| `/account` | AccountPage |
| `/account/$accountNumber` | AccountDetailPage |
| `/account/transactions` | AccountTransactionsPage |
| `/account/settings` | AccountSettingsPage |
| `/notifications` | NotificationPage |
| `/notifications/preferences` | NotificationPreferencesPage |
| `/search` | SearchPage |
| `/performance` | PerformancePage |

## Testing

Tests are in `src/__tests__/` and co-located `__tests__/` directories. Run with:

```bash
bunx vitest run        # single run
bunx vitest            # watch mode
```

All page components that use React Query hooks must be wrapped in `<QueryClientProvider>` in tests.
