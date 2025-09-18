import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import * as dotenv from "dotenv";

dotenv.config();

const NEXT_PUBLIC_RISE_RPC_URL =
  process.env.NEXT_PUBLIC_RISE_RPC_URL || "https://rpc-testnet.risechain.xyz";
const RAW_PK = process.env.DEPLOYER_PRIVATE_KEY || "";
const PRIVATE_KEY = RAW_PK
  ? RAW_PK.startsWith("0x")
    ? RAW_PK
    : `0x${RAW_PK}`
  : "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    riseTestnet: {
      type: "http",
      url: NEXT_PUBLIC_RISE_RPC_URL,
      chainId: 11166,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "contracts",
    tests: "test",
    cache: ".hardhat/cache",
    artifacts: ".hardhat/artifacts",
  },
  plugins: [hardhatViem],
};

export default config;
