"use client";

import React from "react";
import FundModal from "@/components/FundModal";
import { useToast } from "@/components/Toast";
import {} from "viem";
import { useRaceLobby } from "@/hooks/useRaceLobby";
import RaceActivity from "@/components/RaceActivity";
import { DEFAULT_RACE_THRESHOLD } from "@/lib/constants";
import RaceLobbyControls from "@/components/RaceLobbyControls";
import CountdownBanner from "@/components/CountdownBanner";
import RaceTrack from "@/components/RaceTrack";
import ClickButton from "@/components/ClickButton";
import Podium from "@/components/Podium";
import { useEmbeddedNonce } from "@/hooks/useEmbeddedNonce";
import { useEmbeddedClick } from "@/hooks/useEmbeddedClick";
import { usePodiumExport } from "@/hooks/usePodiumExport";
import { privateKeyToAccount } from "viem/accounts";

export default function HorseRace() {
  const [address, setAddress] = React.useState<string | null>(null);
  const [lobbyId, setLobbyId] = React.useState<string | null>(null);
  const { lobby, create, joinAny, join, leave, advance } = useRaceLobby(
    lobbyId || undefined
  );
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("#ff5a5f");
  const [capacity, setCapacity] = React.useState(5);
  const [joinLobbyIdInput, setJoinLobbyIdInput] = React.useState("");
  const [flow, setFlow] = React.useState<"create" | "join">("create");
  const [fundOpen, setFundOpen] = React.useState(false);
  const { show } = useToast();

  // Initialize from URL (?lobby=ID)
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("lobby");
      if (fromUrl) {
        setLobbyId(fromUrl);
        setJoinLobbyIdInput(fromUrl);
        setFlow("join");
      }
    } catch {}
  }, []);

  // Keep URL in sync with current lobby id
  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (lobbyId) {
        url.searchParams.set("lobby", lobbyId);
        // ensure race mode for shared links
        url.searchParams.set("mode", "race");
      } else {
        url.searchParams.delete("lobby");
      }
      window.history.replaceState({}, "", url.toString());
    } catch {}
  }, [lobbyId]);

  React.useEffect(() => {
    try {
      const k =
        typeof window !== "undefined"
          ? localStorage.getItem("embedded_privkey")
          : null;
      if (!k) return setAddress(null);
      const pk = k.startsWith("0x")
        ? (k as `0x${string}`)
        : (("0x" + k) as `0x${string}`);
      const acct = privateKeyToAccount(pk);
      setAddress(acct.address);
    } catch {
      setAddress(null);
    }
  }, []);

  const rpcUrl =
    process.env.NEXT_PUBLIC_RISE_WS_URL || "wss://testnet.riselabs.xyz/ws";

  const { getNextEmbeddedNonce, resetEmbeddedNonce } = useEmbeddedNonce(rpcUrl);

  const meIn = React.useMemo(() => {
    if (!address || !lobby) return undefined;
    return lobby.players.find(
      (p) => p.address.toLowerCase() === address.toLowerCase()
    );
  }, [lobby, address]);

  const status = lobby?.status;
  const threshold = lobby?.threshold ?? DEFAULT_RACE_THRESHOLD;

  const onCreateRace = async () => {
    if (!address) return;
    if (!name.trim()) {
      show({
        type: "info",
        title: "Name required",
        message: "Please enter your name before creating a race.",
      });
      return;
    }
    const next = await create({
      capacity: Math.max(2, Math.min(10, capacity || 5)),
      address,
      name,
      color,
    });
    setLobbyId(next.id);
  };

  const onJoinAnyRace = async () => {
    if (!address) return;
    if (!name.trim()) {
      show({
        type: "info",
        title: "Name required",
        message: "Please enter your name before joining a race.",
      });
      return;
    }
    const next = await joinAny({
      address,
      name,
      color,
    });
    setLobbyId(next.id);
  };

  const onJoinById = async () => {
    if (!address || !joinLobbyIdInput) return;
    if (!name.trim()) {
      show({
        type: "info",
        title: "Name required",
        message: "Please enter your name before joining a race.",
      });
      return;
    }
    await join({
      lobbyId: joinLobbyIdInput,
      address,
      name,
      color,
    });
    setLobbyId(joinLobbyIdInput);
  };

  const onJoin = async () => {
    if (!address || !lobbyId) return;
    if (!name.trim()) {
      show({
        type: "info",
        title: "Name required",
        message: "Please enter your name before joining a race.",
      });
      return;
    }
    await join({
      lobbyId,
      address,
      name,
      color,
    });
  };
  const onLeave = async () => {
    if (!address || !lobbyId) return;
    await leave({ lobbyId, address });
    setLobbyId(null);
    setJoinLobbyIdInput("");
  };
  const sendEmbeddedClick = useEmbeddedClick({
    rpcUrl,
    getNextEmbeddedNonce,
    onRequireFunding: () => setFundOpen(true),
    onInsufficientFunds: () => setFundOpen(true),
    onNonceReset: () => resetEmbeddedNonce(),
  });

  const onClickAdvance = async () => {
    if (!address || !lobbyId) return;
    try {
      void advance({ lobbyId, address, amount: 1 });
    } catch {}
    await sendEmbeddedClick();
  };

  const onNewRace = async () => {
    try {
      if (!address) return;
      if (!name.trim()) {
        show({
          type: "info",
          title: "Name required",
          message: "Please enter your name before creating a race.",
        });
        return;
      }
      const next = await create({
        capacity: Math.max(2, Math.min(10, lobby?.capacity || 5)),
        address,
        name,
        color,
      });
      setLobbyId(next.id);
    } catch {}
  };

  const onNewRaceAndJoin = onNewRace;

  const onExportPodium = usePodiumExport(
    lobby?.players || [],
    threshold,
    lobby?.id || null
  );

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 items-stretch">
      <div className="hud-card p-4">
        <RaceLobbyControls
          name={name}
          onNameChange={setName}
          color={color}
          onColorChange={setColor}
          capacity={capacity}
          onCapacityChange={setCapacity}
          flow={flow}
          onFlowChange={setFlow}
          lobbyId={lobbyId}
          meIn={!!meIn}
          lobby={lobby}
          joinLobbyIdInput={joinLobbyIdInput}
          onJoinLobbyIdInputChange={setJoinLobbyIdInput}
          onCreateRace={onCreateRace}
          onJoinAnyRace={onJoinAnyRace}
          onJoinById={onJoinById}
          onJoin={onJoin}
          onLeave={onLeave}
        />
      </div>

      <CountdownBanner
        status={status}
        endsAt={lobby?.countdownEndsAt ?? null}
      />

      <div className="hud-card p-0 text-slate-900">
        <RaceTrack
          players={lobby?.players || []}
          status={status}
          threshold={threshold}
          onNewRace={onNewRace}
          onNewRaceAndJoin={onNewRaceAndJoin}
          onExportPodium={onExportPodium}
          focusAddress={address || null}
        />
        <ClickButton
          onClick={onClickAdvance}
          disabled={status !== "running" || !meIn}
        />
      </div>

      <Podium
        players={lobby?.players || []}
        threshold={threshold}
        visible={lobby?.status === "finished"}
        onNewRace={onNewRace}
        onNewRaceAndJoin={onNewRaceAndJoin}
        onExportPodium={onExportPodium}
      />

      {!!(lobby?.players?.length || 0) && (
        <RaceActivity
          items={(lobby?.players || []).map((p) => ({
            address: p.address,
            name: p.name,
            color: p.color,
            clicks: p.clicks,
            threshold: lobby?.threshold || 0,
          }))}
        />
      )}

      <FundModal
        open={fundOpen}
        onClose={() => setFundOpen(false)}
        embeddedAddress={null}
      />
    </div>
  );
}
