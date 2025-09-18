import { createPublicClient, http } from "viem";
import { riseTestnet } from "viem/chains";

export type EmbeddedInfo = {
  address: `0x${string}` | null;
  balance: bigint | null;
};

export function createRisePublicClient(rpcUrl?: string) {
  const url =
    rpcUrl ||
    process.env.NEXT_PUBLIC_RISE_RPC_URL ||
    "https://testnet.riselabs.xyz";
  return createPublicClient({ chain: riseTestnet, transport: http(url) });
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
