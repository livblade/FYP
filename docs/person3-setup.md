# Person 3: Blockchain Webhook and Payment Verification Setup

## Responsibilities
- Detect blockchain transactions via Alchemy webhooks
- Verify transactions independently using ethers.js
- Validate chain ID, contract, invoice hash, and amount
- Prevent duplicate processing
- Update payment states from DETECTED through CONFIRMED
- Trigger n8n settlement workflow when confirmed

## Setup Checklist

### 1. Environment Setup
- [ ] Create Alchemy account and API key
- [ ] Get contract address and ABI from Person 2
- [ ] Update .env blockchain variables
- [ ] Set INTERNAL_API_KEY for internal verification endpoint

### 2. Database
- [ ] Run migrations
- [ ] Verify payments and webhook_events schema
- [ ] Verify indexes and foreign keys

### 3. Verification Service
- [ ] Ensure CONTRACT_ABI is set
- [ ] Test with Sepolia transaction hash
- [ ] Validate underpaid and overpaid paths

### 4. Webhook Controller
- [ ] Configure Alchemy webhook URL to /webhooks/alchemy
- [ ] Verify webhook secret is configured
- [ ] Verify webhook events are persisted in webhook_events table

### 5. Integration
- [ ] Verify n8n endpoint receives settlement trigger payload
- [ ] Verify checkout status polling via /api/invoices/:publicId/status

## Commands

```bash
npm install
npx sequelize db:migrate
npm run dev
node scripts/testWebhook.js
npm run test:verification
```

## Common Issues

1. Transaction not found
Wait for propagation and confirm the hash is on Sepolia.

2. Event not parsed
Set CONTRACT_ABI with PaymentAccepted event and validate contract address.

3. Webhook signature mismatch
Confirm ALCHEMY_WEBHOOK_SECRET matches your Alchemy webhook configuration.

4. Chain mismatch
Confirm SEPOLIA_CHAIN_ID is 11155111 and ALCHEMY_RPC_URL points to Sepolia.
