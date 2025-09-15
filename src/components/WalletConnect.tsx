"use client";

import React from "react";

import {
  useAccount,
  useDisconnect,
  useConnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { useToast } from "@/components/Toast";
import { formatFriendlyError } from "@/lib/errors";
import OnboardModal from "@/components/OnboardModal";
import { riseTestnet } from "rise-wallet";
import { wagmiConfig } from "@/app/providers";
import {
  getWalletClient as getWagmiWalletClient,
  getPublicClient as getWagmiPublicClient,
} from "wagmi/actions";
import { ClickCounterAbi } from "@/abi/ClickCounter";
const CLICK_ADDR = (process.env.NEXT_PUBLIC_CLICK_COUNTER_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
import { privateKeyToAccount } from "viem/accounts";

type WalletConnectProps = {
  variant?: "fixed" | "inline";
};

export default function WalletConnect({
  variant = "fixed",
}: WalletConnectProps) {
  const [mounted, setMounted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [embeddedAddr, setEmbeddedAddr] = React.useState<string | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [isSessionLinked, setIsSessionLinked] = React.useState<boolean | null>(
    null
  );
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const linkingRef = React.useRef(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId({
    config: wagmiConfig,
  });
  const { switchChainAsync } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const { connectAsync, connectors, status } = useConnect();
  const { show } = useToast();
  const [onboardOpen, setOnboardOpen] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    try {
      const k =
        typeof window !== "undefined"
          ? localStorage.getItem("embedded_privkey")
          : null;
      if (!k) return setEmbeddedAddr(null);
      const pk = k.startsWith("0x")
        ? (k as `0x${string}`)
        : (("0x" + k) as `0x${string}`);
      const acct = privateKeyToAccount(pk);
      setEmbeddedAddr(acct.address);
    } catch {
      setEmbeddedAddr(null);
    }
  }, [mounted]);

  // (balances UI removed)

  // (balances UI removed)

  const refreshSessionLinked = React.useCallback(async () => {
    try {
      if (!embeddedAddr) return setIsSessionLinked(null);
      if (!address) return setIsSessionLinked(null);
      const pc = getWagmiPublicClient(wagmiConfig, {
        chainId: riseTestnet.id,
      });
      const owner = (await pc.readContract({
        address: CLICK_ADDR,
        abi: ClickCounterAbi,
        functionName: "resolveOwnerForDelegate",
        args: [embeddedAddr as `0x${string}`],
      })) as `0x${string}`;
      const linked =
        owner && owner.toLowerCase() === (address as string).toLowerCase();
      setIsSessionLinked(linked);
    } catch {
      setIsSessionLinked(null);
    }
  }, [embeddedAddr, address]);

  React.useEffect(() => {
    refreshSessionLinked();
  }, [refreshSessionLinked, menuOpen]);

  // Auto-setup embedded key and linking on wallet connect
  React.useEffect(() => {
    if (!mounted) return;
    if (!isConnected) return;
    if (linkingRef.current) return;
    linkingRef.current = true;
    (async () => {
      try {
        // 1) Ensure an embedded key exists locally
        let localEmbedded = embeddedAddr;
        if (!localEmbedded) {
          try {
            await enableEmbeddedSigner();
            const k =
              typeof window !== "undefined"
                ? localStorage.getItem("embedded_privkey")
                : null;
            if (k) {
              const pk = k.startsWith("0x")
                ? (k as `0x${string}`)
                : (("0x" + k) as `0x${string}`);
              const acct = privateKeyToAccount(pk);
              localEmbedded = acct.address;
              setEmbeddedAddr(acct.address);
            }
          } catch {}
        }

        if (!localEmbedded || !address) return;

        // 2) Check current on-chain linkage for this embedded delegate
        const pc = getWagmiPublicClient(wagmiConfig, {
          chainId: riseTestnet.id,
        });
        const owner = (await pc.readContract({
          address: CLICK_ADDR,
          abi: ClickCounterAbi,
          functionName: "resolveOwnerForDelegate",
          args: [localEmbedded as `0x${string}`],
        })) as `0x${string}`;
        const zero = "0x0000000000000000000000000000000000000000";

        // 3) If not linked, prompt user to link now
        if (!owner || owner.toLowerCase() === zero) {
          const yes =
            typeof window !== "undefined"
              ? window.confirm(
                  "No embedded key is linked. Do you want to link your embedded key to this Porto account?"
                )
              : false;
          if (yes) await linkEmbeddedSession();
          await refreshSessionLinked();
          return;
        }

        // 4) If linked to a different Porto account, re-link automatically
        if (owner.toLowerCase() !== (address as string).toLowerCase()) {
          await linkEmbeddedSession();
          show({
            type: "success",
            title: "Session",
            message: "Embedded key linked to the new account",
          });
          await refreshSessionLinked();
          return;
        }

        // 5) Already linked correctly
        setIsSessionLinked(true);
      } catch {
      } finally {
        linkingRef.current = false;
      }
    })();
  }, [
    mounted,
    isConnected,
    address,
    embeddedAddr,
    refreshSessionLinked,
    enableEmbeddedSigner,
    linkEmbeddedSession,
    show,
  ]);
  // (balance refetch effects removed)
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  // Shim: Coerce wallet_getKeys chainIds to decimals if a provider sends hex (must be before early return)
  React.useEffect(() => {
    type Eip1193 = {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
    };
    const eth: Eip1193 | undefined = (() => {
      const g: unknown =
        typeof window !== "undefined" ? (window as unknown) : undefined;
      if (!g || typeof g !== "object") return undefined;
      const maybeEthereum = (g as Record<string, unknown>)[
        "ethereum"
      ] as unknown;
      if (!maybeEthereum || typeof maybeEthereum !== "object") return undefined;
      const req = (maybeEthereum as { request?: unknown }).request;
      if (typeof req !== "function") return undefined;
      return maybeEthereum as Eip1193;
    })();
    if (!eth) return;
    const original = eth.request.bind(eth);
    const wrapped: Eip1193["request"] = (args) => {
      try {
        if (args?.method === "wallet_getKeys" && Array.isArray(args.params)) {
          const first = args.params[0] as { chainIds?: unknown[] } | undefined;
          if (first && Array.isArray(first.chainIds)) {
            const p = {
              ...first,
              chainIds: first.chainIds.map((c) =>
                typeof c === "string" && c.startsWith("0x")
                  ? parseInt(c, 16)
                  : c
              ),
            };
            const next = [{ ...p }, ...args.params.slice(1)];
            return original({ ...args, params: next });
          }
        }
      } catch {}
      return original(args);
    };
    eth.request = wrapped;
    return () => {
      eth.request = original;
    };
  }, []);
  if (!mounted) return <div className="h-8" />;

  // Manual passkey registration removed — Porto connector handles this.

  // ---------------------------
  // LOGIN (Wagmi / Porto)
  // ---------------------------
  async function handleLogin() {
    try {
      const firstKey = "porto_onboard_seen";
      const seen =
        typeof window !== "undefined" && localStorage.getItem(firstKey);
      if (!seen) {
        setOnboardOpen(true);
        return;
      }
      const portoConnector = connectors.find((c) =>
        c.id.toLowerCase().includes("porto")
      );
      if (!portoConnector) throw new Error("Porto connector not found");

      await connectAsync({
        connector: portoConnector,
        chainId: riseTestnet.id,
      });

      // Ensure RISE Testnet is added & selected
      try {
        const ethGlobal: unknown =
          typeof window !== "undefined" ? (window as unknown) : undefined;
        const ethereum =
          ethGlobal && typeof ethGlobal === "object" && "ethereum" in ethGlobal
            ? (
                ethGlobal as {
                  ethereum?: {
                    request?: (args: {
                      method: string;
                      params?: unknown[];
                    }) => Promise<unknown>;
                  };
                }
              ).ethereum
            : undefined;
        const rpcUrl =
          process.env.NEXT_PUBLIC_RISE_RPC_URL ||
          "https://rise-testnet-porto.fly.dev";
        const chainIdHex = `0x${riseTestnet.id.toString(16)}`;
        // Try add chain (idempotent)
        await ethereum?.request?.({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainIdHex,
              chainName: riseTestnet.name,
              nativeCurrency: riseTestnet.nativeCurrency,
              rpcUrls: [rpcUrl],
            },
          ],
        });
        // Switch to RISE
        await ethereum?.request?.({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainIdHex }],
        });
        // Inform wagmi about the new chain explicitly (in case provider doesn't emit)
        try {
          await switchChainAsync({ chainId: riseTestnet.id });
        } catch {}
      } catch (e) {
        console.warn("ensure rise chain failed", e);
      }
      try {
        const ethGlobal: unknown =
          typeof window !== "undefined" ? (window as unknown) : undefined;
        const ethereum =
          ethGlobal && typeof ethGlobal === "object" && "ethereum" in ethGlobal
            ? (
                ethGlobal as {
                  ethereum?: {
                    request?: (args: {
                      method: string;
                      params?: unknown[];
                    }) => Promise<unknown>;
                  };
                }
              ).ethereum
            : undefined;
        const cid = (await ethereum?.request?.({ method: "eth_chainId" })) as
          | string
          | undefined;
        if (cid && parseInt(cid, 16) !== riseTestnet.id) {
          show({
            type: "error",
            title: "Network",
            message: `Wallet on chain ${parseInt(
              cid,
              16
            )}. Please switch to RISE and reconnect`,
          });
        }
      } catch {}
      show({
        type: "success",
        title: "Wallet",
        message: "Connected successfully",
      });
    } catch (e) {
      console.error("[WalletConnect] login:error", e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Address "0x') && msg.includes("is invalid")) {
        try {
          const patterns = ["wagmi", "porto", "viem", "walletconnect"];
          Object.keys(localStorage).forEach((k) => {
            if (patterns.some((p) => k.toLowerCase().includes(p)))
              localStorage.removeItem(k);
          });
          document.cookie =
            "webauthn_challenge=; Max-Age=0; Path=/; SameSite=Lax";
        } catch {}
        show({
          type: "info",
          title: "Reset",
          message: "State cleared. Click Connect again.",
        });
        return;
      }
      const toast = formatFriendlyError(e, "wallet");
      show(toast);
    }
  }

  async function switchToRise() {
    try {
      const ethGlobal: unknown =
        typeof window !== "undefined" ? (window as unknown) : undefined;
      const ethereum =
        ethGlobal && typeof ethGlobal === "object" && "ethereum" in ethGlobal
          ? (
              ethGlobal as {
                ethereum?: {
                  request?: (args: {
                    method: string;
                    params?: unknown[];
                  }) => Promise<unknown>;
                };
              }
            ).ethereum
          : undefined;
      const rpcUrl =
        process.env.NEXT_PUBLIC_RISE_RPC_URL ||
        "https://rise-testnet-porto.fly.dev";
      const chainIdHex = `0x${riseTestnet.id.toString(16)}`;
      await ethereum?.request?.({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: riseTestnet.name,
            nativeCurrency: riseTestnet.nativeCurrency,
            rpcUrls: [rpcUrl],
          },
        ],
      });
      await ethereum?.request?.({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
      try {
        await switchChainAsync({ chainId: riseTestnet.id });
      } catch {}
      show({ type: "success", title: "Network", message: "Switched to RISE" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      show({ type: "error", title: "Network", message: msg });
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  async function enableEmbeddedSigner() {
    try {
      const key = new Uint8Array(32);
      if (typeof crypto !== "undefined" && crypto.getRandomValues)
        crypto.getRandomValues(key);
      else
        for (let i = 0; i < key.length; i++)
          key[i] = Math.floor(Math.random() * 256);
      const hex = Array.from(key)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const pk = ("0x" + hex) as `0x${string}`;
      localStorage.setItem("embedded_privkey", pk);
      const acct = privateKeyToAccount(pk);
      setEmbeddedAddr(acct.address);
      show({
        type: "success",
        title: "Embedded",
        message: `Key created. Fund ${acct.address}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      show({ type: "error", title: "Embedded", message: msg });
    }
  }

  // removed Spam Mode (not supported yet on provider)

  async function proceedOnboarding() {
    localStorage.setItem("porto_onboard_seen", "1");
    setOnboardOpen(false);
    // Re-call login to trigger the actual connect
    handleLogin();
  }

  // ---------------------------
  // Session Key (link embedded -> Porto owner)
  // ---------------------------
  // eslint-disable-next-line react-hooks/exhaustive-deps
  async function linkEmbeddedSession() {
    try {
      const k =
        typeof window !== "undefined"
          ? localStorage.getItem("embedded_privkey")
          : null;
      if (!k) throw new Error("Dev key not found. Click Enable Dev Key first.");
      const delegate = ((): `0x${string}` => {
        const pk = k.startsWith("0x")
          ? (k as `0x${string}`)
          : (("0x" + k) as `0x${string}`);
        try {
          const acct = privateKeyToAccount(pk);
          return acct.address as `0x${string}`;
        } catch {
          throw new Error("Invalid embedded key");
        }
      })();
      const wc = await getWagmiWalletClient(wagmiConfig, {
        chainId: riseTestnet.id,
      });
      if (!wc) throw new Error("Wallet not connected (Porto)");
      const expiresAt = BigInt(0); // no expiry
      const hash = await wc.writeContract({
        chain: riseTestnet,
        account: wc.account!,
        address: CLICK_ADDR,
        abi: ClickCounterAbi,
        functionName: "authorizeSession",
        args: [delegate, expiresAt],
      });
      show({
        type: "success",
        title: "Session",
        message: `Linked (no expiry) ${hash.slice(0, 8)}…`,
      });
      await refreshSessionLinked();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      show({ type: "error", title: "Session", message: msg });
    }
  }

  async function revokeEmbeddedSession() {
    try {
      const k =
        typeof window !== "undefined"
          ? localStorage.getItem("embedded_privkey")
          : null;
      if (!k) throw new Error("Dev key not found");
      const pk = k.startsWith("0x")
        ? (k as `0x${string}`)
        : (("0x" + k) as `0x${string}`);
      const delegate = privateKeyToAccount(pk).address as `0x${string}`;
      const wc = await getWagmiWalletClient(wagmiConfig, {
        chainId: riseTestnet.id,
      });
      if (!wc) throw new Error("Wallet not connected (Porto)");
      const hash = await wc.writeContract({
        chain: riseTestnet,
        account: wc.account!,
        address: CLICK_ADDR,
        abi: ClickCounterAbi,
        functionName: "revokeSession",
        args: [delegate],
      });
      show({
        type: "success",
        title: "Session",
        message: `Revoked (${hash.slice(0, 8)}…)`,
      });
      await refreshSessionLinked();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      show({ type: "error", title: "Session", message: msg });
    }
  }

  // ---------------------------
  // UI
  // ---------------------------
  if (isConnected) {
    return (
      <div
        className={
          variant === "fixed" ? "hud-right rk-wrap text-sm" : "rk-wrap text-sm"
        }
        style={variant === "fixed" ? undefined : { position: "relative" }}
        ref={wrapRef}
      >
        <div
          className="rk-account"
          onClick={() => setMenuOpen((o) => !o)}
          title={copied ? "Copied" : "Wallet menu"}
        >
          <div className="rk-avatar">{address?.slice(2, 4)}</div>
          <span className="rk-address">
            {address?.slice(0, 6)}
            <span className="rk-address-dim">…{address?.slice(-4)}</span>
          </span>
          <span
            className="rk-badge"
            title={`Current Chain ID: ${chainId ?? "unknown"}`}
          >
            <span
              className="rk-dot"
              style={{
                background: chainId === riseTestnet.id ? "#16a34a" : "#f59e0b",
              }}
            />
            {chainId === riseTestnet.id ? "RISE" : `Chain ${chainId ?? "?"}`}
          </span>
        </div>
        {menuOpen && (
          <div className="rk-menu" role="menu" aria-orientation="vertical">
            <div className="rk-head">
              <div className="flex items-center gap-2">
                <div className="rk-avatar">{address?.slice(2, 4)}</div>
                <div className="rk-address">
                  {address?.slice(0, 6)}
                  <span className="rk-address-dim">…{address?.slice(-4)}</span>
                </div>
              </div>
              <span className="rk-badge">
                <span
                  className="rk-dot"
                  style={{
                    background:
                      chainId === riseTestnet.id ? "#16a34a" : "#f59e0b",
                  }}
                />
                {chainId === riseTestnet.id
                  ? "RISE"
                  : `Chain ${chainId ?? "?"}`}
              </span>
            </div>
            {/* balances removed */}
            <a
              className="rk-item"
              role="menuitem"
              href={
                process.env.NEXT_PUBLIC_RISE_FAUCET_URL ||
                "https://faucet.risechain.com/"
              }
              target="_blank"
              rel="noreferrer"
              onClick={() => setMenuOpen(false)}
            >
              💧 Open RISE faucet
            </a>
            <button
              className="rk-item"
              role="menuitem"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(address ?? "");
                  setCopied(true);
                  show({
                    type: "success",
                    title: "Copied",
                    message: "Address copied",
                  });
                  setTimeout(() => setCopied(false), 1200);
                } catch {}
                setMenuOpen(false);
              }}
            >
              📋 Copy address
            </button>
            {chainId !== riseTestnet.id && (
              <button
                className="rk-item"
                role="menuitem"
                onClick={async () => {
                  await switchToRise();
                  setMenuOpen(false);
                }}
              >
                🔗 Switch to RISE Testnet
              </button>
            )}
            {embeddedAddr ? (
              <>
                {isSessionLinked === false && (
                  <button
                    className="rk-item"
                    role="menuitem"
                    onClick={async () => {
                      await linkEmbeddedSession();
                      setMenuOpen(false);
                    }}
                  >
                    🔒 Link Embedded Session (no expiry)
                  </button>
                )}
                {isSessionLinked === true && (
                  <button
                    className="rk-item"
                    role="menuitem"
                    onClick={async () => {
                      await revokeEmbeddedSession();
                      setMenuOpen(false);
                    }}
                  >
                    ❌ Revoke Session
                  </button>
                )}
                <button
                  className="rk-item"
                  role="menuitem"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(embeddedAddr);
                      show({
                        type: "success",
                        title: "Copied",
                        message: "Address copied",
                      });
                    } catch {}
                    setMenuOpen(false);
                  }}
                >
                  📋 Copy embedded address
                </button>
              </>
            ) : (
              <button
                className="rk-item"
                role="menuitem"
                onClick={async () => {
                  await enableEmbeddedSigner();
                  setMenuOpen(false);
                }}
                title="Create embedded dev key"
              >
                ⚙️ Enable Dev Key
              </button>
            )}
            <button
              className="rk-item"
              role="menuitem"
              onClick={() => {
                disconnect();
                setMenuOpen(false);
              }}
            >
              🚪 Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={variant === "fixed" ? "hud-right" : undefined}
      style={
        variant === "fixed" ? { position: "fixed" } : { position: "relative" }
      }
    >
      <button
        onClick={handleLogin}
        disabled={status === "pending"}
        className="rk-btn primary text-sm flex items-center gap-2"
      >
        Connect Wallet
      </button>
      <OnboardModal
        open={onboardOpen}
        onClose={() => setOnboardOpen(false)}
        onConfirm={proceedOnboarding}
      />
    </div>
  );
}
