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
import AccountSettingsPage from "./pages/AccountSettingsPage"
import SearchPage from "./pages/SearchPage"
import PerformancePage from "./pages/PerformancePage"

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

const accountSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account/settings",
  component: AccountSettingsPage,
})

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  component: SearchPage,
})

const performanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/performance",
  component: PerformancePage,
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
  accountSettingsRoute,
  searchRoute,
  performanceRoute,
])

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

export { router, rootRoute }
