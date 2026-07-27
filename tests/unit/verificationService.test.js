const { expect } = require('chai');
const PaymentVerificationService = require('../../services/paymentVerificationService');

describe('PaymentVerificationService', () => {
  describe('finalizeConfirmedPayment', () => {
    it('should create a settlement result when a payment becomes confirmed', async () => {
      const originalAutoSettle = PaymentVerificationService.autoSettleConfirmedPayment;
      const settlementPayload = { success: true, created: true, settlement: { settlement_id: 99 } };

      PaymentVerificationService.autoSettleConfirmedPayment = async () => settlementPayload;

      try {
        const result = await PaymentVerificationService.finalizeConfirmedPayment(
          { success: true, status: 'CONFIRMED' },
          { public_id: 'INV-TEST-1' },
          { payment_id: 42 }
        );

        expect(result).to.have.property('success', true);
        expect(result).to.have.property('status', 'CONFIRMED');
        expect(result).to.have.deep.property('settlement', settlementPayload.settlement);
      } finally {
        PaymentVerificationService.autoSettleConfirmedPayment = originalAutoSettle;
      }
    });
  });

  describe('generateInvoiceHash', () => {
    it('should generate consistent hash for same public ID', () => {
      const publicId = 'INV-TEST-123';
      const hash1 = PaymentVerificationService.generateInvoiceHash(publicId);
      const hash2 = PaymentVerificationService.generateInvoiceHash(publicId);
      expect(hash1).to.equal(hash2);
    });

    it('should generate different hashes for different public IDs', () => {
      const hash1 = PaymentVerificationService.generateInvoiceHash('INV-1');
      const hash2 = PaymentVerificationService.generateInvoiceHash('INV-2');
      expect(hash1).to.not.equal(hash2);
    });
  });

  describe('createResult', () => {
    it('should create result object with correct structure', () => {
      const result = PaymentVerificationService.createResult(true, 'CONFIRMED', 'Payment verified', {
        extra: 'data'
      });

      expect(result).to.have.property('success', true);
      expect(result).to.have.property('status', 'CONFIRMED');
      expect(result).to.have.property('message', 'Payment verified');
      expect(result).to.have.property('data');
      expect(result).to.have.property('timestamp');
    });
  });
});
