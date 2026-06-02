import { useState } from "react"
import { signIn, signUp } from "../lib/auth-client"
import "./AuthPage.css"

export default function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === "sign-in") {
        const result = await signIn.email({ email, password })
        if (result.error) {
          setError(result.error.message ?? result.error.statusText)
        }
      } else {
        const result = await signUp.email({ name, email, password })
        if (result.error) {
          setError(result.error.message ?? result.error.statusText)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">
            {mode === "sign-in" ? "Sign In" : "Create Account"}
          </h1>
          <p className="auth-subtitle">Wave Notification Center</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {mode === "sign-up" && (
            <div className="auth-field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            />
          </div>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading && <span className="auth-spinner" />}
            {mode === "sign-in" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          {mode === "sign-in" ? (
            <p>
              Don't have an account?{" "}
              <button className="auth-link" onClick={() => { setMode("sign-up"); setError(null) }}>
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button className="auth-link" onClick={() => { setMode("sign-in"); setError(null) }}>
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}