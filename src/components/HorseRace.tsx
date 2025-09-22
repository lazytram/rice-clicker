"use client";

import React from "react";
import FundModal from "@/components/FundModal";
import RaceActivity from "@/components/RaceActivity";
import RaceLobbyControls from "@/components/RaceLobbyControls";
import CountdownBanner from "@/components/CountdownBanner";
import RaceTrack from "@/components/RaceTrack";
import ClickButton from "@/components/ClickButton";
import Podium from "@/components/Podium";
import { useHorseRaceController } from "@/hooks/useHorseRaceController";

export default function HorseRace() {
  const {
    address,
    lobbyId,
    lobby,
    name,
    setName,
    color,
    setColor,
    capacity,
    setCapacity,
    createThreshold,
    setCreateThreshold,
    joinLobbyIdInput,
    setJoinLobbyIdInput,
    flow,
    setFlow,
    fundOpen,
    setFundOpen,
    meIn,
    status,
    threshold,
    onCreateRace,
    onJoinAnyRace,
    onJoinById,
    onJoin,
    onLeave,
    onExitLobby,
    onClickAdvance,
    onNewRace,
    onNewRaceAndJoin,
    onExportPodium,
  } = useHorseRaceController();

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
          createThreshold={createThreshold}
          onCreateThresholdChange={setCreateThreshold}
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
          onExitLobby={onExitLobby}
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
          onClickAnywhere={onClickAdvance}
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
        embeddedAddress={address}
      />
    </div>
  );
}
