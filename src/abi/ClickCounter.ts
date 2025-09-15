export const ClickCounterAbi = [
  {
    type: "event",
    name: "ClickRecorded",
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "newTotal", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SessionAuthorized",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "delegate", type: "address", indexed: true },
      { name: "expiresAt", type: "uint64", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SessionRevoked",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "delegate", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "click",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "clickMany",
    inputs: [{ name: "times", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "totalClicks",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "clicksByAddress",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "authorizeSession",
    inputs: [
      { name: "delegate", type: "address" },
      { name: "expiresAt", type: "uint64" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "revokeSession",
    inputs: [{ name: "delegate", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "resolveOwnerForDelegate",
    inputs: [{ name: "delegate", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;
