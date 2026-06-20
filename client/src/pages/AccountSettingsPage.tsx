import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, Bell, LogOut, Save, KeyRound } from "lucide-react"
import { signOut, useSession } from "../lib/auth-client"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Skeleton } from "../components/ui/skeleton"
import PageHeader from "../components/ui/page-header"
import PageFooter from "../components/ui/page-footer"

export default function AccountSettingsPage() {
  const { data: session, isPending } = useSession()
  const user = session?.user

  const [name, setName] = useState(user?.name ?? "")
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  async function handleSaveName() {
    if (!name.trim()) {
      setNameError("Name cannot be empty")
      return
    }
    setSaving(true)
    setSaveMessage(null)
    setNameError(null)
    try {
      const res = await fetch("/api/auth/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      const json = await res.json()
      if (!json?.user) throw new Error(json?.error ?? json?.statusText ?? "Failed to update name")
      setSaveMessage("Saved")
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      return
    }
    setChangingPassword(true)
    setPasswordMessage(null)
    setPasswordError(null)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const json = await res.json()
      if (!json?.status) throw new Error(json?.error ?? json?.statusText ?? "Failed to change password")
      setPasswordMessage("Password changed")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  if (isPending || !user) {
    return (
      <>
        <PageHeader title="Account Settings" email="" />
        <main className="flex-1 mx-auto w-full max-w-lg px-8 py-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="size-16 rounded-full mx-auto" />
              <Skeleton className="h-5 w-32 mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </CardContent>
          </Card>
        </main>
        <PageFooter />
      </>
    )
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null

  return (
    <>
      <PageHeader
        title="Account Settings"
        email={user.email}
        beforeTitle={
          <Link
            to="/account"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Back to Account"
          >
            <ArrowLeft className="size-4" />
          </Link>
        }
      />

      <main className="flex-1 mx-auto w-full max-w-lg px-8 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold text-primary">
                {user.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                {memberSince && (
                  <p className="text-xs text-muted-foreground mt-0.5">Member since {memberSince}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settings-name">Display name</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {nameError && <p className="text-xs text-destructive">{nameError}</p>}
              {saveMessage && <p className="text-xs text-success">{saveMessage}</p>}
            </div>

            <Button
              size="sm"
              onClick={handleSaveName}
              disabled={saving || name === user.name}
              className="w-full"
            >
              <Save className="size-4 mr-1" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Security</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="settings-current-password">Current password</Label>
                <Input
                  id="settings-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-new-password">New password</Label>
                <Input
                  id="settings-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-confirm-password">Confirm new password</Label>
                <Input
                  id="settings-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
              {passwordMessage && <p className="text-xs text-success">{passwordMessage}</p>}
              <Button
                type="submit"
                size="sm"
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full"
              >
                <KeyRound className="size-4 mr-1" />
                {changingPassword ? "Changing..." : "Change password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              to="/notifications/preferences"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-surface-hover transition-colors -mx-3"
            >
              <Bell className="size-4 text-muted-foreground" />
              <span className="flex-1">Notification preferences</span>
              <span className="text-xs text-muted-foreground">Configure</span>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-destructive">Sign out</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              You will be redirected to the sign-in page.
            </p>
            <Button variant="destructive" size="sm" onClick={handleSignOut} className="w-full">
              <LogOut className="size-4 mr-1" />
              Sign out
            </Button>
          </CardContent>
        </Card>
      </main>

      <PageFooter />
    </>
  )
}
