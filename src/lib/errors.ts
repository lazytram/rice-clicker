export type FriendlyToast = {
  title: string;
  message: string;
  type?: "success" | "error" | "info";
};

function getErrorMessage(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || String(err);
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function isUserRejected(err: unknown): boolean {
  // EIP-1193 user rejected code and common strings
  const anyErr = err as
    | { code?: number; message?: string; name?: string }
    | undefined;
  const msg = (anyErr?.message || getErrorMessage(err)).toLowerCase();
  if (anyErr && (anyErr.code === 4001 || anyErr.code === 5001)) return true;
  if (anyErr?.name && anyErr.name.toLowerCase().includes("userrejected"))
    return true;
  return (
    msg.includes("user rejected") ||
    msg.includes("request rejected") ||
    msg.includes("rejected the request") ||
    msg.includes("action rejected")
  );
}

function isWrongChain(err: unknown): boolean {
  const msg = getErrorMessage(err).toLowerCase();
  return (
    msg.includes("chain mismatch") ||
    msg.includes("unsupported chain") ||
    msg.includes("wallet_switchethereumchain") ||
    msg.includes("wallet_addethereumchain") ||
    msg.includes("wrong chain") ||
    msg.includes("chain not configured")
  );
}

function isNotConnected(err: unknown): boolean {
  const msg = getErrorMessage(err).toLowerCase();
  return (
    msg.includes("wallet not connected") ||
    msg.includes("no account") ||
    msg.includes("connector not found") ||
    msg.includes("not connected")
  );
}

export function isInsufficientFunds(err: unknown): boolean {
  const msg = getErrorMessage(err).toLowerCase();
  return (
    msg.includes("insufficient funds") ||
    msg.includes("insufficient balance") ||
    msg.includes("insufficient funds for intrinsic transaction cost")
  );
}

function sanitize(msg: string): string {
  // Cut noisy suffixes like "Version: viem@..."
  const dropTokens = ["version:", "docs:", "details:"];
  let out = msg;
  for (const t of dropTokens) {
    const idx = out.toLowerCase().indexOf(t);
    if (idx >= 0) out = out.slice(0, idx).trim();
  }
  return out.length > 180 ? `${out.slice(0, 177)}…` : out;
}

export function formatFriendlyError(
  err: unknown,
  context: "tx" | "wallet" = "tx"
): FriendlyToast {
  if (isUserRejected(err)) {
    return {
      type: "info",
      title:
        context === "wallet" ? "Connection canceled" : "Transaction canceled",
      message: "You canceled the request.",
    };
  }
  if (isNotConnected(err)) {
    return {
      type: "error",
      title: "Wallet",
      message: "Wallet not connected. Please connect your wallet.",
    };
  }
  if (isWrongChain(err)) {
    return {
      type: "error",
      title: "Network",
      message: "Wrong chain. Switch to RISE Testnet and try again.",
    };
  }
  if (isInsufficientFunds(err)) {
    return {
      type: "error",
      title: "Insufficient funds",
      message: "Insufficient balance to pay fees.",
    };
  }

  const raw = sanitize(getErrorMessage(err));
  return {
    type: "error",
    title: context === "wallet" ? "Wallet" : "Transaction",
    message: raw || "An error occurred.",
  };
}
