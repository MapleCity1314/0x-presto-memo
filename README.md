0xMemo is an onchain guestbook app built with Next.js, Wagmi, and a simple Solidity contract.

## Requirements

- Node.js 18+
- Foundry (for contract deployment/testing)

## Setup

Copy the env template and fill in your values:

```bash
cp env.example .env.local
```

Required variables:

- `NEXT_PUBLIC_MEMO_CONTRACT_ADDRESS`: deployed Memo contract address.
- `SEPOLIA_RPC_URL`: RPC for Sepolia (deploy only).
- `PRIVATE_KEY`: deployer private key (deploy only).

## Run the app

From repo root:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy the contract (Sepolia)

From `0xMemo`:

```bash
cd 0xMemo
forge test
forge script script/Memo.s.sol:MemoScript --rpc-url "$SEPOLIA_RPC_URL" --private-key "$PRIVATE_KEY" --broadcast
```

Copy the deployed address into `NEXT_PUBLIC_MEMO_CONTRACT_ADDRESS` in `.env.local`, then restart the dev server.

## Notes

- The app reads/writes messages via Wagmi hooks.
- Messages store text, author address, and timestamp onchain.
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
