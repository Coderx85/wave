import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fetchJSON } from "../queryClient"

describe("fetchJSON", () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns data on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "OK", data: { id: 1 } }),
    })

    const result = await fetchJSON("/api/test")
    expect(result).toEqual({ id: 1 })
  })

  it("throws on ok:false", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: false, status: 400, message: "Bad request", error: "invalid" }),
    })

    await expect(fetchJSON("/api/test")).rejects.toThrow("Bad request")
  })

  it("throws on network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"))

    await expect(fetchJSON("/api/test")).rejects.toThrow("Network error")
  })

  it("passes init to fetch", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "OK", data: null }),
    })

    await fetchJSON("/api/test", { method: "POST", body: '{"a":1}' })

    expect(mockFetch).toHaveBeenCalledWith("/api/test", { method: "POST", body: '{"a":1}' })
  })

  it("handles array data", async () => {
    const data = [{ id: 1 }, { id: 2 }]
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, status: 200, message: "OK", data }),
    })

    const result = await fetchJSON("/api/items")
    expect(result).toEqual(data)
  })
})
