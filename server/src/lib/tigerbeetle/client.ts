import { type Client, createClient } from "tigerbeetle-node";
import { lookup } from "dns";
import { promisify } from "util";

const dnsLookup = promisify(lookup);

const address = process.env.TB_HOST ?? "tigerbeetle";
const port = process.env.TB_PORT ?? "4343";

async function resolveHost(host: string): Promise<string> {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host;
  const { address: ip } = await dnsLookup(host);
  return ip;
}

let _client: Client | null = null;
let _clientReady = false;
let _clientError: string | null = null;

async function initClient() {
  if (_client) return _client;
  try {
    const ip = await resolveHost(address);
    console.log(`[TigerBeetle] Connecting to ${address} (${ip}:${port})`);
    _client = createClient({
      cluster_id: 0n,
      replica_addresses: [`${ip}:${port}`]
    });
    _clientReady = true;
    console.log("[TigerBeetle] Client initialized (operations will fail gracefully if server is offline)");
    return _client;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[TigerBeetle] Failed to initialize client: ${msg}. TigerBeetle operations will be skipped.`);
    _clientError = msg;
    return null;
  }
}

export const TBClient = {
  get ready() { return _clientReady && _client !== null; },
  get error() { return _clientError; },
  getClient: () => _client,
  init: initClient,
};

export * as TB from "tigerbeetle-node";
