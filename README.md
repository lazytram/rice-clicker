Rice Clicker – Japanese-themed clicker game (Next.js)

Getting started

- yarn dev
- yarn build && yarn start

Features

- Rice clicker with bounce animation and aRISE bubble
- Mock global counter via /api routes
- Embedded wallet only (no external wallet connect)
- Background rice field and dojo on the right

Env

Create a `.env.local` at project root:

```
NEXT_PUBLIC_RISE_RPC_URL=https://rpc-testnet.risechain.xyz
NEXT_PUBLIC_CLICK_COUNTER_ADDRESS=0xYourDeployedClickCounter
NEXT_PUBLIC_RISE_FAUCET_URL=https://faucet.risechain.com/
```

Deploy ClickCounter and obtain the address:

```bash
node scripts/deploy-click-counter.js
```
