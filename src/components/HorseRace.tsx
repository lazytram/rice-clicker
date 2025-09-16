"use client";

import React from "react";
import { useAccount } from "wagmi";
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

export default function HorseRace() {
  const { address } = useAccount();
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

  const rpcUrl =
    process.env.NEXT_PUBLIC_RISE_RPC_URL ||
    "https://rise-testnet-porto.fly.dev";

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
      name: name || `Player ${address.slice(2, 6)}`,
      color,
    });
    setLobbyId(next.id);
  };

  const onJoinAnyRace = async () => {
    if (!address) return;
    const next = await joinAny({
      address,
      name: name || `Player ${address.slice(2, 6)}`,
      color,
    });
    setLobbyId(next.id);
  };

  const onJoinById = async () => {
    if (!address || !joinLobbyIdInput) return;
    await join({
      lobbyId: joinLobbyIdInput,
      address,
      name: name || `Player ${address.slice(2, 6)}`,
      color,
    });
    setLobbyId(joinLobbyIdInput);
  };

  const onJoin = async () => {
    if (!address || !lobbyId) return;
    await join({
      lobbyId,
      address,
      name: name || `Player ${address.slice(2, 6)}`,
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
      const next = await create({
        capacity: Math.max(2, Math.min(10, lobby?.capacity || 5)),
        address,
        name: name || `Player ${address.slice(2, 6)}`,
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

      <CountdownBanner visible={status === "countdown"} />

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
