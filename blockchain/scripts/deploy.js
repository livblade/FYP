// Person 2: Responsible for Hardhat deployment script placeholders.
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const PaymentGateway = await ethers.getContractFactory('PaymentGateway');
  const contract = await PaymentGateway.deploy();

  await contract.waitForDeployment();
  console.log('PaymentGateway deployed to:', await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});