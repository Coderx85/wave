import { useState, useCallback, useEffect, useMemo } from "react"
import { useSession } from "../lib/auth-client"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Skeleton } from "../components/ui/skeleton"
import PageHeader from "../components/ui/page-header"
import PageFooter from "../components/ui/page-footer"
import { fetchJSON } from "../lib/queryClient"
import { formatCurrency } from "../lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
  type TooltipProps,
} from "recharts"

// ─── Types ────────────────────────────────────────────────────

interface BenchmarkAccount {
  id: string
  name: string
  accountNumber: string
  balance: number
}

interface LatencyStats {
  min: number
  max: number
  avg: number
  p50: number
  p95: number
  p99: number
}

interface BenchmarkResult {
  config: {
    numTransactions: number
    amountPerTransaction: number
    accountPairsCount: number
    concurrency?: number
  }
  summary: {
    totalTimeMs: number
    transactionsPerSecond: number
    successfulTransactions: number
    failedTransactions: number
    latency: LatencyStats
  }
  latencies: number[]
  errors: Array<{ index: number; error: string }>
}

interface SSEBenchmarkResult {
  config: {
    numConnections: number
    durationMs: number
  }
  summary: {
    successfulConnections: number
    failedConnections: number
    connectionEstablishment: LatencyStats
    timeToFirstByte: LatencyStats
    heartbeatReceived: LatencyStats
  }
  perConnection: Array<{
    index: number
    establishedMs: number
    ttfbMs: number
    heartbeatsReceived: number
    error?: string
  }>
}

// ─── Chart Colors ─────────────────────────────────────────────

const COLORS = {
  primary: "hsl(221.2, 83.2%, 53.3%)",
  success: "hsl(142.1, 76.2%, 36.3%)",
  destructive: "hsl(0, 84.2%, 60.2%)",
  muted: "hsl(215.4, 16.3%, 46.9%)",
  sequential: "hsl(221.2, 83.2%, 53.3%)",
  concurrent: "hsl(142.1, 76.2%, 36.3%)",
}

// ─── Helpers ──────────────────────────────────────────────────

function formatLatency(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`
  if (ms < 1000) return `${ms.toFixed(1)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function buildHistogram(latencies: number[], bucketCount = 20): Array<{ range: string; count: number }> {
  if (latencies.length === 0) return []
  const min = Math.min(...latencies)
  const max = Math.max(...latencies)
  const bucketSize = (max - min) / bucketCount || 1

  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    range: `${formatLatency(min + i * bucketSize)}-${formatLatency(min + (i + 1) * bucketSize)}`,
    count: 0,
  }))

  for (const lat of latencies) {
    const idx = Math.min(Math.floor((lat - min) / bucketSize), bucketCount - 1)
    buckets[idx]!.count++
  }

  return buckets
}

function buildTimeSeries(latencies: number[], sampleSize = 100): Array<{ tx: number; latency: number }> {
  if (latencies.length === 0) return []
  const step = Math.max(1, Math.floor(latencies.length / sampleSize))
  const result: Array<{ tx: number; latency: number }> = []

  for (let i = 0; i < latencies.length; i += step) {
    const slice = latencies.slice(i, i + step)
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length
    result.push({ tx: i, latency: avg })
  }

  return result
}

// ─── Custom Tooltip ───────────────────────────────────────────

function LatencyTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-background border border-border rounded-md px-3 py-2 shadow-md text-sm">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-mono font-bold">{formatLatency(payload[0]!.value as number)}</p>
    </div>
  )
}

function CountTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-background border border-border rounded-md px-3 py-2 shadow-md text-sm">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-mono font-bold">{payload[0]!.value} txns</p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────

export default function PerformancePage() {
  const { data: session } = useSession()
  const user = session!.user

  // Shared config state
  const [accounts, setAccounts] = useState<BenchmarkAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)
  const [senderAccount, setSenderAccount] = useState<string>("")
  const [receiverAccount, setReceiverAccount] = useState<string>("")
  const [numTransactions, setNumTransactions] = useState(100)
  const [amountPerTransaction, setAmountPerTransaction] = useState(1.0)

  // Sequential benchmark state
  const [seqRunning, setSeqRunning] = useState(false)
  const [seqProgress, setSeqProgress] = useState(0)
  const [seqResult, setSeqResult] = useState<BenchmarkResult | null>(null)
  const [seqError, setSeqError] = useState<string | null>(null)

  // Concurrent benchmark state
  const [concRunning, setConcRunning] = useState(false)
  const [concProgress, setConcProgress] = useState(0)
  const [concResult, setConcResult] = useState<BenchmarkResult | null>(null)
  const [concError, setConcError] = useState<string | null>(null)
  const [concurrency, setConcurrency] = useState(2)

  // SSE benchmark state
  const [sseRunning, setSseRunning] = useState(false)
  const [sseProgress, setSseProgress] = useState(0)
  const [sseResult, setSseResult] = useState<SSEBenchmarkResult | null>(null)
  const [sseError, setSseError] = useState<string | null>(null)
  const [sseNumConnections, setSseNumConnections] = useState(100)
  const [sseDuration, setSseDuration] = useState(10)

  // Fetch accounts on mount
  const fetchAccounts = useCallback(async () => {
    try {
      setAccountsLoading(true)
      setAccountsError(null)
      const res = await fetchJSON<BenchmarkAccount[]>(
        `/api/performance/benchmark/accounts/${user.id}`,
      )
      setAccounts(res)
      if (res.length >= 2) {
        setSenderAccount(res[0]!.accountNumber)
        setReceiverAccount(res[1]!.accountNumber)
      }
    } catch (err) {
      setAccountsError(err instanceof Error ? err.message : "Failed to load accounts")
    } finally {
      setAccountsLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // ─── Sequential Benchmark ──────────────────────────────────

  const runSequential = async () => {
    if (!senderAccount || !receiverAccount) return
    const sender = accounts.find((a) => a.accountNumber === senderAccount)
    const receiver = accounts.find((a) => a.accountNumber === receiverAccount)
    if (!sender || !receiver) return

    setSeqRunning(true)
    setSeqProgress(0)
    setSeqResult(null)
    setSeqError(null)

    const progressInterval = setInterval(() => {
      setSeqProgress((prev) => Math.min(prev + 1, 95))
    }, 100)

    try {
      const res = await fetchJSON<BenchmarkResult>("/api/performance/benchmark/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          accountPairs: [{
            senderAccountNumber: senderAccount,
            senderName: sender.name,
            receiverAccountNumber: receiverAccount,
            receiverName: receiver.name,
          }],
          numTransactions,
          amountPerTransaction,
        }),
      })
      clearInterval(progressInterval)
      setSeqProgress(100)
      setSeqResult(res)
    } catch (err) {
      clearInterval(progressInterval)
      setSeqError(err instanceof Error ? err.message : "Benchmark failed")
    } finally {
      setSeqRunning(false)
    }
  }

  // ─── Concurrent Benchmark ──────────────────────────────────

  const runConcurrent = async () => {
    if (!senderAccount || !receiverAccount) return
    const sender = accounts.find((a) => a.accountNumber === senderAccount)
    const receiver = accounts.find((a) => a.accountNumber === receiverAccount)
    if (!sender || !receiver) return

    setConcRunning(true)
    setConcProgress(0)
    setConcResult(null)
    setConcError(null)

    const progressInterval = setInterval(() => {
      setConcProgress((prev) => Math.min(prev + 1, 95))
    }, 100)

    try {
      const res = await fetchJSON<BenchmarkResult>("/api/performance/benchmark/transfers/concurrent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          accountPairs: [{
            senderAccountNumber: senderAccount,
            senderName: sender.name,
            receiverAccountNumber: receiverAccount,
            receiverName: receiver.name,
          }],
          numTransactions,
          amountPerTransaction,
          concurrency,
        }),
      })
      clearInterval(progressInterval)
      setConcProgress(100)
      setConcResult(res)
    } catch (err) {
      clearInterval(progressInterval)
      setConcError(err instanceof Error ? err.message : "Benchmark failed")
    } finally {
      setConcRunning(false)
    }
  }

  // ─── SSE Benchmark ─────────────────────────────────────────

  const runSSE = async () => {
    setSseRunning(true)
    setSseProgress(0)
    setSseResult(null)
    setSseError(null)

    const progressInterval = setInterval(() => {
      setSseProgress((prev) => Math.min(prev + 1, 95))
    }, 500)

    try {
      const res = await fetchJSON<SSEBenchmarkResult>("/api/performance/benchmark/sse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          numConnections: sseNumConnections,
          durationMs: sseDuration * 1000,
        }),
      })
      clearInterval(progressInterval)
      setSseProgress(100)
      setSseResult(res)
    } catch (err) {
      clearInterval(progressInterval)
      setSseError(err instanceof Error ? err.message : "SSE benchmark failed")
    } finally {
      setSseRunning(false)
    }
  }

  return (
    <>
      <PageHeader title="Performance" email={user.email} />

      <main className="flex-1 mx-auto w-full max-w-4xl px-8 py-6 space-y-6">
        {/* ─── Account Loading ───────────────────────────────── */}
        {accountsLoading && (
          <Card>
            <CardContent className="space-y-3 py-6">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </CardContent>
          </Card>
        )}

        {accountsError && (
          <Card className="border-destructive">
            <CardContent className="flex items-center gap-2 py-4">
              <p className="text-sm text-destructive">{accountsError}</p>
              <Button variant="outline" size="sm" onClick={fetchAccounts}>Retry</Button>
            </CardContent>
          </Card>
        )}

        {/* ─── Shared Config ─────────────────────────────────── */}
        {!accountsLoading && !accountsError && (
          <Card>
            <CardHeader className="card-header-accent">
              <CardTitle>Benchmark Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sender">Sender Account</Label>
                  <select id="sender" value={senderAccount} onChange={(e) => setSenderAccount(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Select sender</option>
                    {accounts.map((a) => (
                      <option key={a.accountNumber} value={a.accountNumber}>
                        {a.name} ({String(a.accountNumber)}) — {formatCurrency(a.balance)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="receiver">Receiver Account</Label>
                  <select id="receiver" value={receiverAccount} onChange={(e) => setReceiverAccount(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">Select receiver</option>
                    {accounts.map((a) => (
                      <option key={a.accountNumber} value={a.accountNumber}>
                        {a.name} ({String(a.accountNumber)}) — {formatCurrency(a.balance)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="num-tx">Number of Transactions</Label>
                  <Input id="num-tx" type="number" min={1} max={10000} value={numTransactions}
                    onChange={(e) => setNumTransactions(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Amount per Transaction (USD)</Label>
                  <Input id="amount" type="number" step="0.01" min="0.01" value={amountPerTransaction}
                    onChange={(e) => setAmountPerTransaction(Number(e.target.value))} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ SECTION 1: SEQUENTIAL ════════════════════════════ */}

        {!accountsLoading && !accountsError && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Sequential Transfer Benchmark</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Runs transfers one at a time (single-threaded) to measure raw backend performance with no contention.
              </p>
              <Button onClick={runSequential}
                disabled={seqRunning || !senderAccount || !receiverAccount || senderAccount === receiverAccount}
                className="w-full">
                {seqRunning ? `Running... ${seqProgress}%` : "Run Sequential Benchmark"}
              </Button>
              {seqRunning && <ProgressBar progress={seqProgress} />}
              {seqError && <p className="text-sm text-destructive text-center">{seqError}</p>}
              {seqResult && <BenchmarkCharts result={seqResult} label="Sequential" />}
            </CardContent>
          </Card>
        )}

        {/* ═══ SECTION 2: CONCURRENT ════════════════════════════ */}

        {!accountsLoading && !accountsError && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Concurrent Transfer Benchmark</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Runs transfers in parallel with controlled concurrency to measure throughput under contention.
              </p>
              <div className="space-y-1.5">
                <Label>Concurrency Level</Label>
                <div className="flex gap-2">
                  {[1, 2, 5, 10, 20, 50].map((level) => (
                    <Button key={level} variant={concurrency === level ? "default" : "outline"}
                      size="sm" onClick={() => setConcurrency(level)} disabled={concRunning}>
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={runConcurrent}
                disabled={concRunning || !senderAccount || !receiverAccount || senderAccount === receiverAccount}
                className="w-full">
                {concRunning ? `Running... ${concProgress}%` : "Run Concurrent Benchmark"}
              </Button>
              {concRunning && <ProgressBar progress={concProgress} />}
              {concError && <p className="text-sm text-destructive text-center">{concError}</p>}
              {concResult && <BenchmarkCharts result={concResult} label={`Concurrent (c=${concurrency})`} />}
            </CardContent>
          </Card>
        )}

        {/* ═══ SECTION 3: SSE ═══════════════════════════════════ */}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. SSE Connection Capacity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Opens N server-side SSE connections simultaneously to measure establishment time, TTFB, and heartbeat delivery.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sse-connections">Number of Connections</Label>
                <Input id="sse-connections" type="number" min={1} max={500} value={sseNumConnections}
                  onChange={(e) => setSseNumConnections(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sse-duration">Duration (seconds)</Label>
                <Input id="sse-duration" type="number" min={1} max={60} value={sseDuration}
                  onChange={(e) => setSseDuration(Number(e.target.value))} />
              </div>
            </div>
            <Button onClick={runSSE} disabled={sseRunning} className="w-full">
              {sseRunning ? `Running... ${sseProgress}%` : "Run SSE Benchmark"}
            </Button>
            {sseRunning && <ProgressBar progress={sseProgress} />}
            {sseError && <p className="text-sm text-destructive text-center">{sseError}</p>}
            {sseResult && <SSEResults result={sseResult} />}
          </CardContent>
        </Card>

        {/* ═══ SECTION 4: TPS COMPARISON ════════════════════════ */}

        {seqResult && concResult && <ComparisonCharts sequential={seqResult} concurrent={concResult} concurrency={concurrency} />}
      </main>

      <PageFooter left="Wave Performance Monitor" right={<span>Benchmarks</span>} />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// CHART COMPONENTS
// ═══════════════════════════════════════════════════════════════

function BenchmarkCharts({ result, label }: { result: BenchmarkResult; label: string }) {
  const histogram = useMemo(() => buildHistogram(result.latencies), [result.latencies])
  const timeSeries = useMemo(() => buildTimeSeries(result.latencies), [result.latencies])

  const pieData = useMemo(() => [
    { name: "Success", value: result.summary.successfulTransactions },
    { name: "Failed", value: result.summary.failedTransactions },
  ], [result.summary])

  return (
    <>
      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Time" value={`${(result.summary.totalTimeMs / 1000).toFixed(2)}s`} />
        <StatCard label="Throughput" value={`${result.summary.transactionsPerSecond.toFixed(1)} TPS`} />
        <StatCard label="Successful" value={String(result.summary.successfulTransactions)} accent="text-green-600" />
        <StatCard label="Failed" value={String(result.summary.failedTransactions)}
          accent={result.summary.failedTransactions > 0 ? "text-destructive" : undefined} />
      </div>

      {/* Latency Percentiles */}
      <Card>
        <CardHeader><CardTitle className="text-base">Latency Percentiles</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4 text-center">
            <LatencyStat label="Min" value={result.summary.latency.min} />
            <LatencyStat label="P50" value={result.summary.latency.p50} />
            <LatencyStat label="Avg" value={result.summary.latency.avg} />
            <LatencyStat label="P95" value={result.summary.latency.p95} />
            <LatencyStat label="P99" value={result.summary.latency.p99} />
            <LatencyStat label="Max" value={result.summary.latency.max} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Latency Distribution Histogram */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Latency Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={histogram} margin={{ top: 5, right: 5, bottom: 25, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3, 31.8%, 91.4%)" />
                <XAxis dataKey="range" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" interval={Math.floor(histogram.length / 8)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CountTooltip />} />
                <Bar dataKey="count" fill={COLORS.primary} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Success/Failure Pie */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Success vs Failure</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill={COLORS.success} />
                  <Cell fill={COLORS.destructive} />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Latency Over Time */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Latency Over Time ({label})</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeSeries} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3, 31.8%, 91.4%)" />
              <XAxis dataKey="tx" tick={{ fontSize: 11 }} label={{ value: "Transaction #", position: "bottom", offset: -5, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatLatency(v)} />
              <Tooltip content={<LatencyTooltip />} />
              <Line type="monotone" dataKey="latency" stroke={COLORS.primary} dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Errors */}
      {result.errors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Errors ({result.errors.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {result.errors.slice(0, 50).map((err) => (
                <p key={err.index} className="text-xs text-muted-foreground font-mono">
                  TX #{err.index}: {err.error}
                </p>
              ))}
              {result.errors.length > 50 && (
                <p className="text-xs text-muted-foreground">... and {result.errors.length - 50} more</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

// ─── SSE Results ──────────────────────────────────────────────

function SSEResults({ result }: { result: SSEBenchmarkResult }) {
  const [sortBy, setSortBy] = useState<"establishedMs" | "ttfbMs" | "heartbeatsReceived">("establishedMs")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const sorted = [...result.perConnection].sort((a, b) => {
    const diff = a[sortBy] - b[sortBy]
    return sortDir === "asc" ? diff : -diff
  })

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortBy(col); setSortDir("asc") }
  }

  const establishmentHist = useMemo(() => buildHistogram(
    result.perConnection.map((c) => c.establishedMs), 15
  ), [result.perConnection])

  const ttfbHist = useMemo(() => buildHistogram(
    result.perConnection.filter((c) => c.ttfbMs > 0).map((c) => c.ttfbMs), 15
  ), [result.perConnection])

  const pieData = useMemo(() => [
    { name: "Successful", value: result.summary.successfulConnections },
    { name: "Failed", value: result.summary.failedConnections },
  ], [result.summary])

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Successful" value={String(result.summary.successfulConnections)} accent="text-green-600" />
        <StatCard label="Failed" value={String(result.summary.failedConnections)}
          accent={result.summary.failedConnections > 0 ? "text-destructive" : undefined} />
        <StatCard label="Avg Establishment" value={`${result.summary.connectionEstablishment.avg.toFixed(0)}ms`} />
        <StatCard label="Avg TTFB" value={`${result.summary.timeToFirstByte.avg.toFixed(0)}ms`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Establishment Histogram */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Connection Establishment Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={establishmentHist} margin={{ top: 5, right: 5, bottom: 25, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3, 31.8%, 91.4%)" />
                <XAxis dataKey="range" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" interval={Math.floor(establishmentHist.length / 6)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CountTooltip />} />
                <Bar dataKey="count" fill={COLORS.primary} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* TTFB Histogram */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Time-to-First-Byte Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ttfbHist} margin={{ top: 5, right: 5, bottom: 25, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3, 31.8%, 91.4%)" />
                <XAxis dataKey="range" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" interval={Math.floor(ttfbHist.length / 6)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CountTooltip />} />
                <Bar dataKey="count" fill={COLORS.concurrent} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Success/Failure Pie */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Connection Success Rate</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                <Cell fill={COLORS.success} />
                <Cell fill={COLORS.destructive} />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Establishment Latency Stats */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Establishment Latency Percentiles</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4 text-center">
            <LatencyStat label="Min" value={result.summary.connectionEstablishment.min} />
            <LatencyStat label="P50" value={result.summary.connectionEstablishment.p50} />
            <LatencyStat label="Avg" value={result.summary.connectionEstablishment.avg} />
            <LatencyStat label="P95" value={result.summary.connectionEstablishment.p95} />
            <LatencyStat label="P99" value={result.summary.connectionEstablishment.p99} />
            <LatencyStat label="Max" value={result.summary.connectionEstablishment.max} />
          </div>
        </CardContent>
      </Card>

      {/* Heartbeat Stats */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Heartbeats Received Per Connection</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4 text-center">
            <LatencyStat label="Min" value={result.summary.heartbeatReceived.min} />
            <LatencyStat label="P50" value={result.summary.heartbeatReceived.p50} />
            <LatencyStat label="Avg" value={result.summary.heartbeatReceived.avg} />
            <LatencyStat label="P95" value={result.summary.heartbeatReceived.p95} />
            <LatencyStat label="P99" value={result.summary.heartbeatReceived.p99} />
            <LatencyStat label="Max" value={result.summary.heartbeatReceived.max} />
          </div>
        </CardContent>
      </Card>

      {/* Per-Connection Detail */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Per-Connection Detail ({result.perConnection.length} connections)</CardTitle></CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">#</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort("establishedMs")}>
                    Establishment {sortBy === "establishedMs" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort("ttfbMs")}>
                    TTFB {sortBy === "ttfbMs" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort("heartbeatsReceived")}>
                    Heartbeats {sortBy === "heartbeatsReceived" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, 100).map((conn) => (
                  <tr key={conn.index} className="border-b border-border/50">
                    <td className="py-1.5 px-3 font-mono text-muted-foreground">{conn.index + 1}</td>
                    <td className="py-1.5 px-3 text-right font-mono">{conn.establishedMs.toFixed(1)}ms</td>
                    <td className="py-1.5 px-3 text-right font-mono">{conn.ttfbMs.toFixed(1)}ms</td>
                    <td className="py-1.5 px-3 text-right font-mono">{conn.heartbeatsReceived}</td>
                    <td className="py-1.5 px-3">
                      {conn.error
                        ? <span className="text-destructive text-xs">{conn.error}</span>
                        : <span className="text-green-600 text-xs">OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sorted.length > 100 && (
              <p className="text-xs text-muted-foreground text-center py-2">Showing 100 of {sorted.length} connections</p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// ─── Comparison Charts ────────────────────────────────────────

function ComparisonCharts({
  sequential,
  concurrent,
  concurrency,
}: {
  sequential: BenchmarkResult
  concurrent: BenchmarkResult
  concurrency: number
}) {
  const tpsData = useMemo(() => [
    { name: "Sequential", tps: sequential.summary.transactionsPerSecond },
    { name: `Concurrent (c=${concurrency})`, tps: concurrent.summary.transactionsPerSecond },
  ], [sequential, concurrent, concurrency])

  const latencyData = useMemo(() => [
    { metric: "P50", Sequential: sequential.summary.latency.p50, Concurrent: concurrent.summary.latency.p50 },
    { metric: "Avg", Sequential: sequential.summary.latency.avg, Concurrent: concurrent.summary.latency.avg },
    { metric: "P95", Sequential: sequential.summary.latency.p95, Concurrent: concurrent.summary.latency.p95 },
    { metric: "P99", Sequential: sequential.summary.latency.p99, Concurrent: concurrent.summary.latency.p99 },
  ], [sequential, concurrent])

  const timeData = useMemo(() => [
    { name: "Sequential", time: sequential.summary.totalTimeMs / 1000 },
    { name: `Concurrent (c=${concurrency})`, time: concurrent.summary.totalTimeMs / 1000 },
  ], [sequential, concurrent, concurrency])

  const delta = ((concurrent.summary.transactionsPerSecond / sequential.summary.transactionsPerSecond - 1) * 100).toFixed(1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          TPS Comparison: Sequential vs Concurrent
          <span className={`ml-2 text-sm font-normal ${Number(delta) >= 0 ? "text-green-600" : "text-destructive"}`}>
            {Number(delta) >= 0 ? "+" : ""}{delta}% throughput
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {/* TPS Bar Chart */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Transactions Per Second</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tpsData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3, 31.8%, 91.4%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)} TPS`} />
                <Bar dataKey="tps" radius={[4, 4, 0, 0]}>
                  <Cell fill={COLORS.sequential} />
                  <Cell fill={COLORS.concurrent} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Total Time Bar Chart */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Total Time (seconds)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timeData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3, 31.8%, 91.4%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => `${value.toFixed(2)}s`} />
                <Bar dataKey="time" radius={[4, 4, 0, 0]}>
                  <Cell fill={COLORS.sequential} />
                  <Cell fill={COLORS.concurrent} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency Comparison Grouped Bar */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Latency Comparison by Percentile</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={latencyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3, 31.8%, 91.4%)" />
              <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatLatency(v)} />
              <Tooltip formatter={(value: number) => formatLatency(value)} />
              <Legend />
              <Bar dataKey="Sequential" fill={COLORS.sequential} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Concurrent" fill={COLORS.concurrent} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Utility Components ────────────────────────────────────────

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-secondary rounded-full h-2.5">
      <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-bold font-mono ${accent ?? "text-foreground"}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function LatencyStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold font-mono text-foreground">
        {value < 1 ? `${(value * 1000).toFixed(0)}μs` : `${value.toFixed(1)}ms`}
      </p>
    </div>
  )
}
