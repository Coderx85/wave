import { file } from "bun";

const BACKEND_PORT = 3000;
const FRONTEND_PORT = 5173;

function proxyApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const backendUrl = `http://localhost:${BACKEND_PORT}${url.pathname}${url.search}`;
  return fetch(backendUrl, { method: req.method, headers: req.headers, body: req.body });
}

Bun.serve({
  port: FRONTEND_PORT,
  routes: {
    "/api/*": {
      GET: proxyApi,
      POST: proxyApi,
      PUT: proxyApi,
      PATCH: proxyApi,
      DELETE: proxyApi,
      HEAD: proxyApi,
      OPTIONS: proxyApi,
    },
  },
  development: {
    hmr: true,
    console: true,
  },
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const f = file(`.${pathname}`);
    if (await f.exists()) {
      return new Response(f);
    }
    return new Response(file("./index.html"));
  },
});

console.log(`\n  Frontend:  http://localhost:${FRONTEND_PORT}`);
console.log(`  API proxy: http://localhost:${FRONTEND_PORT}/api/*  ->  http://localhost:${BACKEND_PORT}/api/*\n`);