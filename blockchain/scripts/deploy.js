// Person 2: Responsible for PaymentGateway deployment.
const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      'No deployer account found. Set PRIVATE_KEY in .env (without quotes, prefixed with 0x) before deploying to Sepolia.'
    );
  }

  const configuredTreasury = (process.env.PAYMENT_GATEWAY_TREASURY || '').trim();
  if (configuredTreasury && !ethers.isAddress(configuredTreasury)) {
    throw new Error(
      'PAYMENT_GATEWAY_TREASURY must be a valid wallet address (0x...). Do not paste a private key here.'
    );
  }

  const treasuryAddress =
    configuredTreasury && configuredTreasury !== ethers.ZeroAddress
      ? configuredTreasury
      : deployer.address;

  console.log('Deploying with account:', deployer.address);
  console.log('Treasury address:', treasuryAddress);

  const PaymentGateway = await ethers.getContractFactory('PaymentGateway');
  const contract = await PaymentGateway.deploy(treasuryAddress);

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  const deploymentTx = contract.deploymentTransaction();
  const network = await ethers.provider.getNetwork();
  const deploymentEvidence = {
    contract: 'PaymentGateway',
    network: network.name,
    chainId: Number(network.chainId),
    contractAddress,
    treasuryAddress,
    deployerAddress: deployer.address,
    transactionHash: deploymentTx ? deploymentTx.hash : null,
    deployedAt: new Date().toISOString()
  };

  const outputDir = path.join(__dirname, '..', 'deployments');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${network.name || 'network'}-${Number(network.chainId)}-payment-gateway.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(deploymentEvidence, null, 2)}\n`);

  console.log('PaymentGateway deployed to:', contractAddress);
  console.log('Set CONTRACT_ADDRESS to the deployed address above.');
  console.log('Deployment evidence saved to:', outputPath);
  console.log('Run npm run abi:payment-gateway and copy the CONTRACT_ABI value into .env.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
