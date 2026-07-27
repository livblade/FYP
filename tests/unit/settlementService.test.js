const { expect } = require('chai');
const { getReconciledSettlementStatus } = require('../../services/settlementService');
const { PAYMENT_STATUS, SETTLEMENT_STATUS } = require('../../config/constants');

describe('settlementService', () => {
  describe('getReconciledSettlementStatus', () => {
    it('marks confirmed payments as completed', () => {
      expect(getReconciledSettlementStatus(PAYMENT_STATUS.CONFIRMED)).to.equal(SETTLEMENT_STATUS.COMPLETED);
    });

    it('keeps pending payments in processing', () => {
      expect(getReconciledSettlementStatus(PAYMENT_STATUS.CONFIRMING)).to.equal(SETTLEMENT_STATUS.PROCESSING);
      expect(getReconciledSettlementStatus(PAYMENT_STATUS.VERIFYING)).to.equal(SETTLEMENT_STATUS.PROCESSING);
    });

    it('flags unsupported states for manual review', () => {
      expect(getReconciledSettlementStatus(PAYMENT_STATUS.REJECTED)).to.equal(SETTLEMENT_STATUS.MANUAL_REVIEW);
    });
  });
});
