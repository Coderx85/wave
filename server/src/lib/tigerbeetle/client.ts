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

const ip = await resolveHost(address);

console.log(`[TigerBeetle] Connecting to ${address} (${ip}:${port})`);

export const TBClient = createClient({
  cluster_id: 0n,
  replica_addresses: [`${ip}:${port}`]
});

export * as TB from "tigerbeetle-node";
