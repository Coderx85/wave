import { createRouter, createRootRoute, createRoute } from "@tanstack/react-router"
import App from "./App"
import HomePage from "./pages/HomePage"
import NotificationPage from "./components/NotificationPage"
import NotificationPreferencesPage from "./pages/NotificationPreferencesPage"
import TransactionsPage from "./pages/TransactionsPage"
import TransactionDetailPage from "./pages/TransactionDetailPage"
import AccountPage from "./pages/AccountPage"
import AccountTransactionsPage from "./pages/AccountTransactionsPage"
import AccountDetailPage from "./pages/AccountDetailPage"

const rootRoute = createRootRoute({
  component: App,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
})

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notifications",
  component: NotificationPage,
})

const notificationPreferencesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notifications/preferences",
  component: NotificationPreferencesPage,
})

const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transactions",
  component: TransactionsPage,
})

const transactionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transactions/$transactionId",
  component: TransactionDetailPage,
})

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account",
  component: AccountPage,
})

const accountDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account/$accountNumber",
  component: AccountDetailPage,
})

const accountTransactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account/transactions",
  component: AccountTransactionsPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  notificationsRoute,
  notificationPreferencesRoute,
  transactionsRoute,
  transactionDetailRoute,
  accountRoute,
  accountDetailRoute,
  accountTransactionsRoute,
])

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

export { router, rootRoute }
