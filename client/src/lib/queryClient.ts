import { QueryClient } from "@tanstack/react-query"
import type { WaveResponse } from "@/types"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * Thin adapter over fetch that unwraps WaveResponse<T>.
 * Throws on ok:false so React Query treats it as an error.
 */
export async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = init ? await fetch(url, init) : await fetch(url)
  const json: WaveResponse<T> = await res.json()
  if (!json.ok) throw new Error(json.message)
  return json.data
}
