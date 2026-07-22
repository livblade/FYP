// Person 2: Responsible for PaymentGateway contract behavior tests.
const { expect } = require('chai');
const { ethers } = require('hardhat');

async function expectRevert(promise, expectedMessage) {
  try {
    await promise;
  } catch (error) {
    expect(error.message).to.include(expectedMessage);
    return;
  }

  throw new Error(`Expected revert containing: ${expectedMessage}`);
}

function findPaymentAcceptedLog(receipt, gateway) {
  return receipt.logs
    .map((log) => {
      try {
        return gateway.interface.parseLog(log);
      } catch (error) {
        return null;
      }
    })
    .find((log) => log && log.name === 'PaymentAccepted');
}

describe('PaymentGateway', () => {
  let owner;
  let treasury;
  let payer;
  let other;
  let gateway;

  beforeEach(async () => {
    [owner, treasury, payer, other] = await ethers.getSigners();

    const PaymentGateway = await ethers.getContractFactory('PaymentGateway');
    gateway = await PaymentGateway.deploy(treasury.address);
    await gateway.waitForDeployment();
  });

  it('deploys with the configured treasury and owner', async () => {
    expect(await gateway.treasury()).to.equal(treasury.address);
    expect(await gateway.owner()).to.equal(owner.address);
  });

  it('accepts native ETH payment and emits PaymentAccepted', async () => {
    const invoiceHash = ethers.id('INV-TEST-001');
    const amount = ethers.parseEther('0.01');

    const tx = await gateway.connect(payer).payNative(invoiceHash, { value: amount });
    const receipt = await tx.wait();
    const paymentLog = findPaymentAcceptedLog(receipt, gateway);

    expect(paymentLog).to.not.equal(undefined);
    expect(paymentLog.args.invoiceHash).to.equal(invoiceHash);
    expect(paymentLog.args.payer).to.equal(payer.address);
    expect(paymentLog.args.token).to.equal(ethers.ZeroAddress);
    expect(paymentLog.args.amount).to.equal(amount);
    expect(await gateway.paidInvoices(invoiceHash)).to.equal(true);
  });

  it('rejects duplicate invoice payments', async () => {
    const invoiceHash = ethers.id('INV-TEST-002');
    const amount = ethers.parseEther('0.01');

    await gateway.connect(payer).payNative(invoiceHash, { value: amount });

    await expectRevert(
      gateway.connect(payer).payNative(invoiceHash, { value: amount }),
      'Invoice already paid'
    );
  });

  it('rejects zero-value native payment', async () => {
    await expectRevert(
      gateway.connect(payer).payNative(ethers.id('INV-ZERO'), { value: 0 }),
      'Zero payment'
    );
  });

  it('blocks payment while paused', async () => {
    await gateway.connect(owner).pause();

    await expectRevert(
      gateway.connect(payer).payNative(ethers.id('INV-PAUSED'), { value: ethers.parseEther('0.01') }),
      'EnforcedPause'
    );
  });

  it('restricts administrative actions to the owner', async () => {
    await expectRevert(
      gateway.connect(other).setTreasury(other.address),
      'OwnableUnauthorizedAccount'
    );

    await expectRevert(
      gateway.connect(other).pause(),
      'OwnableUnauthorizedAccount'
    );
  });
});
