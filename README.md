# Cryptocurrency Payment Acceptance and Auto-Settlement Platform

Person 1: Responsible for project documentation and onboarding materials.

## Overview

This repository contains a draft-first scaffold for a Node.js/Express/EJS platform where merchants create SGD invoices, customers pay in Sepolia ETH via MetaMask, blockchain events are received by Alchemy webhooks, automation is handled through n8n workflows, and persistent records are stored in MySQL.

Business logic and payment verification are intentionally placeholders for team-safe parallel development.

## Tech Stack

- Backend: Node.js, Express, Sequelize, MySQL
- Frontend: EJS, Bootstrap 5, custom CSS/JS
- Blockchain: Solidity, Hardhat, Ethers v6
- Automation: n8n

## Prerequisites

- Node.js 18+
- MySQL 8+
- Hardhat-compatible environment
- n8n instance (local or hosted)

## Installation

1. Clone the project.
2. Install dependencies:

```bash
npm install
```

3. Copy environment file:

```bash
cp .env.example .env
```

4. Update `.env` with your local credentials and API keys.
5. Run the app in development:

```bash
npm run dev
```

## Environment Variables

Key variables are listed in `.env.example`:

- Runtime: `PORT`, `NODE_ENV`
- Database: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
- Sessions: `SESSION_SECRET`
- Blockchain: `ALCHEMY_RPC_URL`, `ALCHEMY_API_KEY`, `ALCHEMY_WEBHOOK_SECRET`
- Contract: `CONTRACT_ADDRESS`, `CONTRACT_ABI`
- Pricing: `COINGECKO_API_URL`
- n8n: `N8N_WEBHOOK_URL`, `N8N_API_KEY`
- Fees and chain settings: `PLATFORM_FEE_PERCENTAGE`, `CONVERSION_FEE_PERCENTAGE`, `SEPOLIA_CHAIN_ID`, `MIN_CONFIRMATIONS`

## Database Setup

1. Create a MySQL database with the name in `DB_NAME`.
2. Run migrations using your preferred Sequelize CLI workflow.
3. Run seeders for development test data.

## Smart Contract Deployment

1. Move into blockchain folder:

```bash
cd blockchain
```

2. Install blockchain dependencies (if managed separately).
3. Configure deployer private key and RPC in `.env`.
4. Deploy to Sepolia:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

## n8n Workflow Import

1. Open n8n UI.
2. Import each JSON file from the `n8n/` folder:
   - `quotation-workflow.json`
   - `payment-monitoring-workflow.json`
   - `payment-verification-workflow.json`
   - `settlement-reconciliation-workflow.json`
3. Configure credentials and webhook URLs.

## Team Responsibilities (4 Developers)

1. Person 1: Platform bootstrap, authentication/session, shared UI, docs.
2. Person 2: Merchant management, wallets, blockchain config and contract.
3. Person 3: Invoices, checkout flow, payments and validation.
4. Person 4: Settlements, webhook processing, n8n workflows, audits/tests.

## API Documentation

Use `tests/postman/` for Postman assets and publish your API docs link here once generated.

Placeholder link: `https://your-team-docs.example.com/api`

## Testing

- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- Contract tests: `blockchain/test/`
- API tests: `tests/postman/`

## Notes

This scaffold is intentionally minimal in business logic and validation depth to avoid blocking parallel development. Replace placeholders incrementally by module ownership.