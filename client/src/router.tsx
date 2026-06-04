import { createRouter, createRootRoute, createRoute } from "@tanstack/react-router"
import App from "./App"
import HomePage from "./pages/HomePage"
import NotificationPage from "./components/NotificationPage"
import TransactionsPage from "./pages/TransactionsPage"
import AccountPage from "./pages/AccountPage"

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

const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transactions",
  component: TransactionsPage,
})

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account",
  component: AccountPage,
})

const routeTree = rootRoute.addChildren([indexRoute, notificationsRoute, transactionsRoute, accountRoute])

const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

export { router, rootRoute }
