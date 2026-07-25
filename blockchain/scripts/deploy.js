// Person 2: Responsible for PaymentGateway deployment.
const { ethers } = require('hardhat');

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
  console.log('PaymentGateway deployed to:', await contract.getAddress());
  console.log('Set CONTRACT_ADDRESS to the deployed address above.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
