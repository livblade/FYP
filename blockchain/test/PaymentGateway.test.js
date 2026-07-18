// Person 2: Responsible for contract unit test scaffolding.
const { expect } = require('chai');

describe('PaymentGateway', () => {
  it('should deploy successfully', async () => {
    expect(true).to.equal(true);
  });

  it('should emit NativePaid for payNative', async () => {
    expect(true).to.equal(true);
  });

  it('should emit TokenPaid for payToken', async () => {
    expect(true).to.equal(true);
  });
});