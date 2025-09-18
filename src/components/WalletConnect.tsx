"use client";

import React from "react";
import { useToast } from "@/components/Toast";
import { privateKeyToAccount } from "viem/accounts";
import { AnimatePresence, motion } from "framer-motion";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

type WalletConnectProps = {
  variant?: "fixed" | "inline";
};

export default function WalletConnect({
  variant = "fixed",
}: WalletConnectProps) {
  const [mounted, setMounted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [embeddedAddr, setEmbeddedAddr] = React.useState<string | null>(null);
  const [embeddedPk, setEmbeddedPk] = React.useState<string | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [showPk, setShowPk] = React.useState(false);
  const { show } = useToast();
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    try {
      const k =
        typeof window !== "undefined"
          ? localStorage.getItem("embedded_privkey")
          : null;
      if (!k) {
        setEmbeddedAddr(null);
        setEmbeddedPk(null);
        return;
      }
      const pk = k.startsWith("0x")
        ? (k as `0x${string}`)
        : (("0x" + k) as `0x${string}`);
      const acct = privateKeyToAccount(pk);
      setEmbeddedAddr(acct.address);
      setEmbeddedPk(pk);
    } catch {
      setEmbeddedAddr(null);
      setEmbeddedPk(null);
    }
  }, [mounted]);

  React.useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(ev: MouseEvent) {
      const t = ev.target as Node | null;
      if (!wrapRef.current) return;
      if (!t || !wrapRef.current.contains(t)) setMenuOpen(false);
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function enableEmbeddedSigner() {
    const existing =
      typeof window !== "undefined"
        ? localStorage.getItem("embedded_privkey")
        : null;
    if (existing) return;
    // Generate a random private key for dev use only
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const hex = Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    localStorage.setItem("embedded_privkey", `0x${hex}`);
    const pk = `0x${hex}` as `0x${string}`;
    const acct = privateKeyToAccount(pk);
    setEmbeddedAddr(acct.address);
    setEmbeddedPk(pk);
    show({
      type: "success",
      title: "Embedded enabled",
      message: "A local dev key was created",
    });
  }

  if (!mounted) return <div className="h-8" />;

  return (
    <div
      className={variant === "fixed" ? "hud-right" : undefined}
      style={
        variant === "fixed" ? { position: "fixed" } : { position: "relative" }
      }
    >
      {embeddedAddr ? (
        <div
          className="rk-wrap"
          ref={wrapRef}
          style={{ position: "relative", display: "inline-block" }}
        >
          <button
            className="rk-btn text-sm flex items-center gap-2"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title="Embedded wallet menu"
          >
            <span>🔐 Embedded</span>
            <span
              className="font-mono text-[11px] px-1.5 py-0.5 rounded"
              style={{ background: "#eef2ff", color: "#334155" }}
            >
              {shortAddr(embeddedAddr)}
            </span>
            <span aria-hidden>▾</span>
          </button>
          <AnimatePresence>
            {menuOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] w-[320px] z-[9999] rk-menu-container">
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, scale: 0.98, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -6 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="rounded-[12px] border border-black/10 bg-white/95 backdrop-blur-md shadow-xl overflow-visible"
                >
                  <div
                    className="rk-caret"
                    style={{
                      position: "absolute",
                      width: 12,
                      height: 12,
                      background: "rgba(255,255,255,0.96)",
                      borderLeft: "1px solid rgba(0,0,0,0.08)",
                      borderTop: "1px solid rgba(0,0,0,0.08)",
                      transform: "rotate(45deg)",
                      left: 24,
                      top: -6,
                    }}
                  />
                  <div
                    className="rk-item"
                    role="presentation"
                    style={{ cursor: "default", fontWeight: 600 }}
                  >
                    Embedded wallet
                  </div>
                  <div
                    className="rk-item"
                    role="presentation"
                    style={{ cursor: "default" }}
                  >
                    <div className="text-[10px] opacity-70">Address</div>
                    <div
                      className="font-mono text-xs break-all select-all"
                      style={{
                        wordBreak: "break-all",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {embeddedAddr}
                    </div>
                  </div>
                  <button
                    className="rk-item"
                    role="menuitem"
                    onClick={() => {
                      navigator.clipboard.writeText(embeddedAddr);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1000);
                    }}
                  >
                    {copied ? "📋 Address copied" : "📋 Copy address"}
                  </button>
                  <button
                    className="rk-item"
                    role="menuitem"
                    onClick={() => setShowPk((v) => !v)}
                    title="Reveal/hide the embedded private key"
                  >
                    {showPk ? "🙈 Hide private key" : "👁️ Reveal private key"}
                  </button>
                  {showPk && embeddedPk && (
                    <div
                      className="rk-item"
                      role="menuitem"
                      style={{ cursor: "default" }}
                    >
                      <div className="text-[10px] opacity-70">Private key</div>
                      <div
                        className="font-mono text-[11px] break-all select-all p-2 rounded"
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        {embeddedPk}
                      </div>
                    </div>
                  )}
                  <button
                    className="rk-item"
                    role="menuitem"
                    onClick={() => {
                      if (!embeddedPk) return;
                      navigator.clipboard.writeText(embeddedPk);
                      show({
                        type: "success",
                        title: "Copied",
                        message: "Private key copied",
                      });
                    }}
                  >
                    📋 Copy private key
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <button
          onClick={enableEmbeddedSigner}
          className="rk-btn primary text-sm flex items-center gap-2"
          title="Create a local embedded developer key"
        >
          🔐 Enable Embedded Wallet
        </button>
      )}
    </div>
  );
}
