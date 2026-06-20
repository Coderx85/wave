const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000"

async function proxyApi(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const target = `${BACKEND_URL}${url.pathname}${url.search}`
  return fetch(target, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  })
}

export default {
  async fetch(request: Request): Promise<Response> {
    return proxyApi(request)
  },
}
