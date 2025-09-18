"use client";

import React from "react";

type Props = {
  uri: string;
};

export default function UriActions({ uri }: Props) {
  const [copied, setCopied] = React.useState(false);
  const openUri = () => {
    let u = uri;
    if (u.startsWith("ipfs://")) u = `https://ipfs.io/ipfs/${u.slice(7)}`;
    try {
      window.open(u, "_blank", "noopener,noreferrer");
    } catch {}
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  return (
    <span className="inline-flex gap-2 ml-2">
      <button className="btn" onClick={openUri}>
        Open
      </button>
      <button className="btn" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
