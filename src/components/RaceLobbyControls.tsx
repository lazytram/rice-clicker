"use client";

import React from "react";
import { useToast } from "@/components/Toast";
import type { LobbyState } from "@/hooks/useRaceLobby";
import { RACE_THRESHOLD_OPTIONS } from "@/lib/constants";

type Props = {
  name: string;
  onNameChange: (value: string) => void;
  color: string;
  onColorChange: (value: string) => void;
  capacity: number;
  onCapacityChange: (value: number) => void;
  createThreshold: number;
  onCreateThresholdChange: (value: number) => void;
  flow: "create" | "join";
  onFlowChange: (value: "create" | "join") => void;
  lobbyId: string | null;
  meIn: boolean;
  lobby?: LobbyState;
  joinLobbyIdInput: string;
  onJoinLobbyIdInputChange: (value: string) => void;
  onCreateRace: () => void | Promise<void>;
  onJoinAnyRace: () => void | Promise<void>;
  onJoinById: () => void | Promise<void>;
  onJoin: () => void | Promise<void>;
  onLeave: () => void | Promise<void>;
  onExitLobby: () => void | Promise<void>;
};

export type RaceLobbyControlsProps = Props;

export default function RaceLobbyControls({
  name,
  onNameChange,
  color,
  onColorChange,
  capacity,
  onCapacityChange,
  createThreshold,
  onCreateThresholdChange,
  flow,
  onFlowChange,
  lobbyId,
  meIn,
  lobby,
  joinLobbyIdInput,
  onJoinLobbyIdInputChange,
  onCreateRace,
  onJoinAnyRace,
  onJoinById,
  onJoin,
  onLeave,
  onExitLobby,
}: Props) {
  const { show } = useToast();
  const [copyMode, setCopyMode] = React.useState<"id" | "link">("id");

  const getShareValue = React.useCallback(() => {
    if (!lobbyId) return "";
    if (copyMode === "id") return lobbyId;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("mode", "race");
      url.searchParams.set("lobby", lobbyId);
      return url.toString();
    } catch {
      return lobbyId;
    }
  }, [copyMode, lobbyId]);

  const handleCopy = React.useCallback(async () => {
    const value = getShareValue();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      show({
        type: "success",
        message: copyMode === "id" ? "Lobby ID copied" : "Lobby link copied",
      });
    } catch {
      show({ type: "error", message: "Unable to copy to clipboard" });
    }
  }, [getShareValue, show, copyMode]);

  const handleExit = React.useCallback(() => {
    void onExitLobby();
  }, [onExitLobby]);
  return (
    <div
      className={`flex flex-wrap items-center gap-2 sm:gap-3 text-slate-900${
        !lobbyId ? " relative has-right-toggle" : ""
      }`}
    >
      <div className="hud-pill">
        <input
          className="px-2 py-1 rounded-md bg-white/90 outline-none placeholder:text-slate-500 text-slate-900"
          placeholder="Your name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          disabled={!!meIn && lobby?.status === "waiting"}
        />
      </div>
      <div className="hud-pill">
        <input
          type="color"
          className="w-8 h-8 rounded-md border border-black/10"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          disabled={!!meIn && lobby?.status === "waiting"}
          title="Saddle color"
        />
      </div>
      {!!lobbyId && !!lobby && (
        <>
          <div className="hud-pill text-sm">
            <span className="opacity-70">Players</span>
            <span className="hud-badge">{lobby.players.length}</span>
          </div>
          <div className="hud-pill text-sm">
            <span className="opacity-70">Capacity</span>
            <span className="hud-badge">{lobby.capacity}</span>
          </div>
          <div className="hud-pill text-sm">
            <span className="opacity-70">Distance</span>
            <span className="hud-badge">{lobby.threshold}</span>
          </div>
        </>
      )}
      {!lobbyId ? (
        <>
          {flow === "create" ? (
            <>
              <div className="hud-pill text-sm">
                <span className="opacity-70">Capacity</span>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={capacity}
                  onChange={(e) =>
                    onCapacityChange(
                      Math.max(2, Math.min(10, Number(e.target.value) || 2))
                    )
                  }
                  className="w-14 bg-transparent outline-none text-slate-900"
                  title="Players per race"
                />
              </div>
              <div className="hud-pill text-sm">
                <span className="opacity-70">Distance</span>
                <select
                  value={createThreshold}
                  onChange={(e) =>
                    onCreateThresholdChange(Number(e.target.value) || 250)
                  }
                  className="bg-transparent outline-none text-slate-900"
                  title="Clicks to win"
                >
                  {RACE_THRESHOLD_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={onCreateRace}
                className="rk-btn primary"
                disabled={!name.trim()}
                title={!name.trim() ? "Enter your name first" : undefined}
              >
                Create race
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onJoinAnyRace}
                className="rk-btn primary"
                disabled={!name.trim()}
                title={!name.trim() ? "Enter your name first" : undefined}
              >
                Join any
              </button>
              <div className="hud-pill">
                <input
                  className="px-2 py-1 rounded-md bg-white/90 outline-none placeholder:text-slate-500 text-slate-900"
                  placeholder="Enter lobby id"
                  value={joinLobbyIdInput}
                  onChange={(e) => onJoinLobbyIdInputChange(e.target.value)}
                />
              </div>
              <button
                onClick={onJoinById}
                className="rk-btn"
                disabled={!name.trim() || !joinLobbyIdInput.trim()}
                title={!name.trim() ? "Enter your name first" : undefined}
              >
                Join by ID
              </button>
            </>
          )}
          <div className="seg-toggle compact fixed-right">
            <button
              className={flow === "create" ? "active" : ""}
              onClick={() => onFlowChange("create")}
            >
              Create
            </button>
            <button
              className={flow === "join" ? "active" : ""}
              onClick={() => onFlowChange("join")}
            >
              Join
            </button>
          </div>
        </>
      ) : (
        <div className="hud-pill text-sm lobby-pill w-full">
          <span className="opacity-70">Lobby</span>
          <span
            className="hud-badge lobby-badge-fixed"
            style={{
              userSelect: "text",
            }}
            title={getShareValue()}
            onClick={handleCopy}
          >
            {copyMode === "id" ? lobbyId : getShareValue()}
          </span>
          <div className="seg-toggle compact">
            <button
              className={copyMode === "id" ? "active" : ""}
              onClick={() => setCopyMode("id")}
              title="Show ID (for manual entry)"
            >
              ID
            </button>
            <button
              className={copyMode === "link" ? "active" : ""}
              onClick={() => setCopyMode("link")}
              title="Show full link (for sharing)"
            >
              Link
            </button>
          </div>
          <button className="rk-btn sm ghost" onClick={handleCopy}>
            Copy
          </button>
          <button
            className="rk-btn sm danger"
            onClick={handleExit}
            title="Leave lobby and clear URL"
          >
            Exit
          </button>
        </div>
      )}

      {lobbyId &&
        (!meIn ? (
          <button
            onClick={onJoin}
            disabled={!lobby || lobby.status !== "waiting" || !name.trim()}
            className="rk-btn primary disabled:opacity-50"
            title={!name.trim() ? "Enter your name first" : undefined}
          >
            Join
          </button>
        ) : lobby?.status === "waiting" &&
          lobby?.players.length < lobby?.capacity ? (
          <button onClick={onLeave} className="rk-btn danger">
            Leave
          </button>
        ) : null)}
    </div>
  );
}
