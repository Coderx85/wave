import { useSession } from "./lib/auth-client"
import NotificationPage from "./components/NotificationPage"
import AuthPage from "./components/AuthPage"
import "./App.css"

function App() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="App">
        <div className="app-loading">
          <span className="app-spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      {session ? <NotificationPage user={session.user} /> : <AuthPage />}
    </div>
  )
}

export default App