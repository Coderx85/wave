import { type Client, createClient } from "tigerbeetle-node";

export const TBClient = createClient({
  cluster_id: 0n,
  replica_addresses: [3000]
});

export * as TB from "tigerbeetle-node";