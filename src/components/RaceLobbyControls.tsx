"use client";

import React from "react";
import type { LobbyState } from "@/hooks/useRaceLobby";

type Props = {
  name: string;
  onNameChange: (value: string) => void;
  color: string;
  onColorChange: (value: string) => void;
  capacity: number;
  onCapacityChange: (value: number) => void;
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
};

export default function RaceLobbyControls({
  name,
  onNameChange,
  color,
  onColorChange,
  capacity,
  onCapacityChange,
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
}: Props) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 text-slate-900${
        !lobbyId ? " relative has-right-toggle" : ""
      }`}
    >
      <div className="hud-pill">
        <input
          className="px-2 py-1 rounded-md bg-white/90 outline-none placeholder:text-slate-500 text-slate-900"
          placeholder="Your name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          disabled={!!meIn || (lobby && lobby.status !== "waiting")}
        />
      </div>
      <div className="hud-pill">
        <input
          type="color"
          className="w-8 h-8 rounded-md border border-black/10"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          disabled={!!meIn || (lobby && lobby.status !== "waiting")}
          title="Saddle color"
        />
      </div>
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
              <button onClick={onJoinAnyRace} className="rk-btn primary">
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
              <button onClick={onJoinById} className="rk-btn">
                Join by ID
              </button>
            </>
          )}
          <div className="seg-toggle fixed-right">
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
        <div className="hud-pill text-sm">
          <span className="opacity-70">Lobby ID</span>
          <span className="hud-badge" style={{ userSelect: "text" }}>
            {lobbyId}
          </span>
          <button
            className="rk-btn"
            onClick={() => lobbyId && navigator.clipboard.writeText(lobbyId)}
          >
            Copy
          </button>
        </div>
      )}

      {lobbyId &&
        (!meIn ? (
          <button
            onClick={onJoin}
            disabled={!lobby || lobby.status !== "waiting"}
            className="rk-btn primary disabled:opacity-50"
          >
            Join
          </button>
        ) : (
          <button
            onClick={onLeave}
            disabled={!lobby || lobby.status !== "waiting"}
            className="rk-btn"
            style={{
              background: "#fecaca",
              border: "1px solid rgba(0,0,0,0.06)",
              color: "#7f1d1d",
              fontWeight: 800,
            }}
          >
            Leave
          </button>
        ))}
      <div className="grow" />
      {!!lobby && (
        <>
          <div className="hud-pill text-sm">
            <span className="opacity-70">Players</span>
            <span className="hud-badge">{lobby.players.length}</span>
          </div>
          <div className="hud-pill text-sm">
            <span className="opacity-70">Capacity</span>
            <span className="hud-badge">{lobby.capacity}</span>
          </div>
        </>
      )}
    </div>
  );
}
