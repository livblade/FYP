# Person 2: Merchant, Wallet, and Blockchain Evidence Guide

This guide documents the operational evidence needed for the merchant/wallet ownership flow, PaymentGateway ABI configuration, and Sepolia deployment hygiene.

## 1. Fresh Schema Evidence

Run from the project root:

```bash
npm install
npx sequelize db:migrate
npx sequelize db:seed:all
npm run db:verify
```

Capture the `DATABASE VERIFICATION COMPLETE: OK` output.

Evidence to collect from MySQL:

```sql
SELECT user_id, email, role, status FROM users;
SELECT merchant_id, user_id, business_name, status, kyc_status FROM merchants;
SELECT wallet_id, merchant_id, wallet_address, network, wallet_type, is_default FROM merchant_wallets;
```

Expected proof:

- `merchants.user_id` maps to `users.user_id`.
- `merchant_wallets.merchant_id` maps to `merchants.merchant_id`.
- Wallet rows store address ownership separately from the merchant profile.

## 2. Merchant and Wallet Flow Evidence

Start the app:

```bash
npm run dev
```

Use the seeded merchant or register a new merchant:

- Seeded login: `merchant@example.com`
- Seeded password: `Password123!`

Capture these browser/API checks:

- `GET /merchants/profile` shows merchant profile details.
- Adding a wallet from the profile page creates a `merchant_wallets` row.
- `GET /merchants/wallets` returns only wallets owned by the logged-in merchant.
- Deleting a wallet removes only that merchant-owned wallet.

Useful API evidence:

```bash
curl -i http://localhost:3000/merchants/wallets
```

For authenticated browser sessions, capture the network tab response or use Postman with the session cookie.

## 3. Contract ABI Evidence

Generate the real ABI from the compiled PaymentGateway artifact:

```bash
npm run abi:payment-gateway
```

Copy the full `CONTRACT_ABI=...` output into `.env`.

Evidence to capture:

- The command output starts with `CONTRACT_ABI=[`.
- `.env` has a non-empty `CONTRACT_ABI`.
- Production will fail fast if `CONTRACT_ADDRESS` is configured but `CONTRACT_ABI` is missing or invalid.

Fallback ABI is still available for local development only. Do not use fallback ABI as final deployment evidence.

## 4. Sepolia Deployment Evidence

Before deploying, rotate any exposed private key. A leaked key must be treated as permanently compromised:

- Create a new testnet deployer wallet.
- Remove the old key from `.env`, shell history, screenshots, and any shared notes.
- Move remaining testnet ETH from the exposed wallet if possible.
- Update Alchemy/Etherscan/team config to use only the new deployer.

Set these variables in `.env`:

```env
ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
PRIVATE_KEY=0x...
PAYMENT_GATEWAY_TREASURY=0x...
```

Deploy:

```bash
npm run deploy:sepolia
```

Evidence to capture:

- Console output showing deployer address, treasury address, and deployed contract address.
- `blockchain/deployments/sepolia-11155111-payment-gateway.json`.
- Sepolia explorer URL for the deployment transaction.
- `.env` updated with `CONTRACT_ADDRESS` and real `CONTRACT_ABI`.

Never commit `.env`, private keys, mnemonic phrases, or screenshots containing secrets.

## 5. Completion Checklist

- [ ] Fresh migration and seed run completed.
- [ ] `npm run db:verify` passes.
- [ ] Merchant profile screenshot captured.
- [ ] Wallet add/list/delete evidence captured.
- [ ] Real `CONTRACT_ABI` generated and configured.
- [ ] New deployer key used after the exposed key incident.
- [ ] Sepolia deployment JSON and explorer transaction captured.
