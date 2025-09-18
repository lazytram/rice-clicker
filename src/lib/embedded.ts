import { createPublicClient, webSocket } from "viem";
import { riseTestnet } from "viem/chains";

export type EmbeddedInfo = {
  address: `0x${string}` | null;
  balance: bigint | null;
};

export function createRisePublicClient(rpcUrl?: string) {
  const url =
    rpcUrl ||
    process.env.NEXT_PUBLIC_RISE_WS_URL ||
    "wss://testnet.riselabs.xyz/ws";
  return createPublicClient({ chain: riseTestnet, transport: webSocket(url) });
}

// Shared singleton WebSocket public client to avoid multiple sockets
let sharedClient: ReturnType<typeof createPublicClient> | null = null;
let sharedClientUrl: string | null = null;

export function getSharedRisePublicClient(rpcUrl?: string) {
  const url =
    rpcUrl ||
    process.env.NEXT_PUBLIC_RISE_WS_URL ||
    "wss://testnet.riselabs.xyz/ws";
  if (!sharedClient || sharedClientUrl !== url) {
    sharedClient = createPublicClient({
      chain: riseTestnet,
      transport: webSocket(url),
    });
    sharedClientUrl = url;
  }
  return sharedClient;
}

// Resolve an HTTP RPC URL from env or a provided WS URL
export function resolveRiseHttpRpcUrl(fromWsUrl?: string): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_RISE_RPC_URL) {
    return process.env.NEXT_PUBLIC_RISE_RPC_URL as string;
  }
  const source = fromWsUrl || process.env.NEXT_PUBLIC_RISE_WS_URL || "";
  try {
    const toHttp = (u: string) =>
      u
        .replace(/^wss:\/\//, "https://")
        .replace(/^ws:\/\//, "http://")
        .replace(/\/ws$/, "");
    const httpUrl = source ? toHttp(source) : "";
    // If the URL points to riselabs WS gateway, default to official Rise RPC
    if (/riselabs\.xyz/i.test(source) || /riselabs\.xyz/i.test(httpUrl)) {
      return "https://testnet.riselabs.xyz";
    }
    if (httpUrl) return httpUrl;
  } catch {}
  // Sensible default per README
  return "https://testnet.riselabs.xyz";
}

export async function loadEmbeddedInfo(
  publicClient: ReturnType<typeof createRisePublicClient>
): Promise<EmbeddedInfo> {
  try {
    const k =
      typeof window !== "undefined"
        ? localStorage.getItem("embedded_privkey")
        : null;
    if (!k) return { address: null, balance: null };
    const pk = k.startsWith("0x")
      ? (k as `0x${string}`)
      : (("0x" + k) as `0x${string}`);
    const { privateKeyToAccount } = await import("viem/accounts");
    const acct = privateKeyToAccount(pk);
    const bal = await publicClient.getBalance({ address: acct.address });
    return { address: acct.address, balance: bal };
  } catch {
    return { address: null, balance: null };
  }
}
