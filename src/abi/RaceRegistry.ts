export const RaceRegistryAbi = [
  {
    type: "event",
    name: "NameUpdated",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ColorUpdated",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "rgb", type: "uint24", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RaceStarted",
    inputs: [
      { name: "id", type: "uint64", indexed: true },
      { name: "players", type: "address[]", indexed: false },
      { name: "startedAt", type: "uint64", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RaceFinalized",
    inputs: [
      { name: "id", type: "uint64", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "players", type: "address[]", indexed: false },
      { name: "finishTotals", type: "uint256[]", indexed: false },
      { name: "endedAt", type: "uint64", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "setName",
    inputs: [{ name: "name", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "setColor",
    inputs: [{ name: "rgb", type: "uint24" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "nameByAddress",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "colorByAddress",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint24" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "startRace",
    inputs: [{ name: "players", type: "address[]" }],
    outputs: [{ name: "id", type: "uint64" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "finalizeRace",
    inputs: [
      { name: "id", type: "uint64" },
      { name: "players", type: "address[]" },
      { name: "finishTotals", type: "uint256[]" },
    ],
    outputs: [],
  },
] as const;
