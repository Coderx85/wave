import { useState } from "react"
import { signIn, signUp } from "../lib/auth-client"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Button } from "../components/ui/button"

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
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-xl">Wave</CardTitle>
          <CardDescription>
            {mode === "sign-in" ? "Sign in to your account" : "Create a new account"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive text-center">
                {error}
              </div>
            )}

            {mode === "sign-up" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
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

            <Button type="submit" disabled={loading} className="w-full">
              {loading && (
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-a-spin" />
              )}
              {mode === "sign-in" ? "Sign In" : "Create Account"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center pt-6">
          {mode === "sign-in" ? (
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                className="font-semibold text-primary hover:text-accent-hover transition-colors bg-transparent border-none p-0 cursor-pointer"
                onClick={() => { setMode("sign-up"); setError(null) }}
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                className="font-semibold text-primary hover:text-accent-hover transition-colors bg-transparent border-none p-0 cursor-pointer"
                onClick={() => { setMode("sign-in"); setError(null) }}
              >
                Sign in
              </button>
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
