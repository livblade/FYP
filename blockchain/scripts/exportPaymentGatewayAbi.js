// Person 2: Exports the compiled PaymentGateway ABI in .env-friendly form.
const fs = require('fs');
const path = require('path');

const artifactPath = path.join(
  __dirname,
  '..',
  'artifacts',
  'contracts',
  'PaymentGateway.sol',
  'PaymentGateway.json'
);

if (!fs.existsSync(artifactPath)) {
  console.error('PaymentGateway artifact not found. Run `npx hardhat compile` from the blockchain folder first.');
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
if (!Array.isArray(artifact.abi) || artifact.abi.length === 0) {
  console.error('PaymentGateway artifact does not contain a usable ABI.');
  process.exit(1);
}

console.log(`CONTRACT_ABI=${JSON.stringify(artifact.abi)}`);
