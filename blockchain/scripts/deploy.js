// Person 2: Responsible for PaymentGateway deployment.
const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  const configuredTreasury = process.env.PAYMENT_GATEWAY_TREASURY;
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
