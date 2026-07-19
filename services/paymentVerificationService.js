// Person 3: Responsible for payment verification pipeline orchestration.
const { ethers } = require('ethers');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const definePayment = require('../models/Payment');
const defineInvoice = require('../models/Invoice');
const { PAYMENT_STATUS, INVOICE_STATUS } = require('../config/constants');
const logger = require('../utils/logger');

const Payment = definePayment(sequelize, DataTypes);
const Invoice = defineInvoice(sequelize, DataTypes);

const DEFAULT_CHAIN_ID = Number(process.env.SEPOLIA_CHAIN_ID || 11155111);
const DEFAULT_MIN_CONFIRMATIONS = Number(process.env.MIN_CONFIRMATIONS || 12);
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

class PaymentVerificationService {
  constructor() {
    this.contractAddress = process.env.CONTRACT_ADDRESS || ZERO_ADDRESS;
    this.contractABI = this.parseContractAbi(process.env.CONTRACT_ABI);
    this.chainId = DEFAULT_CHAIN_ID;
    this.minConfirmations = DEFAULT_MIN_CONFIRMATIONS;
    this.provider = null;
    this.contract = null;
  }

  getProvider() {
    if (!this.provider) {
      this.provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
    }
    return this.provider;
  }

  parseContractAbi(abiValue) {
    if (!abiValue) {
      return [];
    }
    if (Array.isArray(abiValue)) {
      return abiValue;
    }
    try {
      const parsed = JSON.parse(abiValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      logger.warn('Unable to parse CONTRACT_ABI from environment');
      return [];
    }
  }

  initContract(abi) {
    this.contractABI = Array.isArray(abi) ? abi : [];
    this.contract = null;
    if (this.contractABI.length > 0 && this.contractAddress && this.contractAddress !== ZERO_ADDRESS) {
      this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.getProvider());
    }
  }

  generateInvoiceHash(publicId) {
    return ethers.solidityPackedKeccak256(['string'], [publicId]);
  }

  createResult(success, status, message, data = null) {
    return {
      success,
      status,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  async verifyPayment(transactionHash, invoicePublicId) {
    const startTime = Date.now();
    logger.info(`Starting verification for tx ${transactionHash}`);

    try {
      const invoice = await Invoice.findOne({ where: { public_id: invoicePublicId } });
      if (!invoice) {
        return this.createResult(false, PAYMENT_STATUS.REJECTED, 'Invoice not found');
      }

      if ([INVOICE_STATUS.PAID, INVOICE_STATUS.SETTLED].includes(invoice.status)) {
        return this.createResult(false, PAYMENT_STATUS.DUPLICATE, 'Invoice already paid');
      }

      if (invoice.expires_at && new Date(invoice.expires_at) < new Date()) {
        return this.createResult(false, PAYMENT_STATUS.REJECTED, 'Invoice has expired');
      }

      const receipt = await this.getTransactionReceiptWithRetry(transactionHash);
      if (!receipt) {
        return this.createResult(false, PAYMENT_STATUS.REJECTED, 'Transaction not found on blockchain');
      }

      const chainId = await this.getChainId();
      if (chainId !== this.chainId) {
        return this.createResult(
          false,
          PAYMENT_STATUS.REJECTED,
          `Wrong network. Expected ${this.chainId}, got ${chainId}`
        );
      }

      if (receipt.status !== 1n && receipt.status !== 1) {
        return this.createResult(false, PAYMENT_STATUS.REJECTED, 'Transaction reverted on blockchain');
      }

      if (!receipt.to || receipt.to.toLowerCase() !== this.contractAddress.toLowerCase()) {
        return this.createResult(false, PAYMENT_STATUS.REJECTED, 'Transaction not sent to correct contract');
      }

      const eventData = await this.parsePaymentEvent(receipt);
      if (!eventData) {
        return this.createResult(false, PAYMENT_STATUS.REJECTED, 'PaymentAccepted event not found');
      }

      const expectedInvoiceHash = invoice.contract_invoice_hash || this.generateInvoiceHash(invoice.public_id);
      if (eventData.invoiceHash.toLowerCase() !== expectedInvoiceHash.toLowerCase()) {
        return this.createResult(false, PAYMENT_STATUS.REJECTED, 'Invoice hash mismatch');
      }

      const requiredAmount = ethers.parseEther(String(invoice.required_crypto_amount || '0'));
      const tolerance = requiredAmount / 100n;
      if (requiredAmount > 0n) {
        if (eventData.amount < requiredAmount - tolerance) {
          return this.createResult(
            false,
            PAYMENT_STATUS.UNDERPAID,
            `Underpaid. Expected ${invoice.required_crypto_amount}, received ${ethers.formatEther(eventData.amount)}`,
            {
              expected: String(invoice.required_crypto_amount),
              received: ethers.formatEther(eventData.amount)
            }
          );
        }

        if (eventData.amount > requiredAmount + tolerance) {
          return this.createResult(
            false,
            PAYMENT_STATUS.OVERPAID,
            `Overpaid. Expected ${invoice.required_crypto_amount}, received ${ethers.formatEther(eventData.amount)}`,
            {
              expected: String(invoice.required_crypto_amount),
              received: ethers.formatEther(eventData.amount)
            }
          );
        }
      }

      const existingPayment = await Payment.findOne({
        where: {
          chain_id: this.chainId,
          transaction_hash: transactionHash,
          log_index: eventData.logIndex
        }
      });

      if (existingPayment) {
        return this.createResult(false, PAYMENT_STATUS.DUPLICATE, 'This transaction has already been processed', {
          payment_id: existingPayment.payment_id
        });
      }

      const currentBlock = await this.getProvider().getBlockNumber();
      const confirmations = Math.max(0, Number(currentBlock) - Number(receipt.blockNumber));

      if (confirmations < this.minConfirmations) {
        const payment = await this.createPayment(
          {
            invoiceId: invoice.invoice_id,
            transactionHash,
            payerWallet: eventData.payer,
            cryptoAmount: eventData.amount,
            blockNumber: receipt.blockNumber,
            confirmations,
            eventData,
            receipt
          },
          PAYMENT_STATUS.CONFIRMING
        );

        await invoice.update({ status: INVOICE_STATUS.CONFIRMING });

        return this.createResult(
          false,
          PAYMENT_STATUS.CONFIRMING,
          `Waiting for confirmations: ${confirmations}/${this.minConfirmations}`,
          { payment_id: payment.payment_id, confirmations, required: this.minConfirmations }
        );
      }

      const payment = await this.createPayment(
        {
          invoiceId: invoice.invoice_id,
          transactionHash,
          payerWallet: eventData.payer,
          cryptoAmount: eventData.amount,
          blockNumber: receipt.blockNumber,
          confirmations,
          eventData,
          receipt
        },
        PAYMENT_STATUS.CONFIRMED
      );

      await invoice.update({ status: INVOICE_STATUS.PAID });

      return {
        success: true,
        status: PAYMENT_STATUS.CONFIRMED,
        message: 'Payment successfully verified and confirmed',
        payment,
        invoice,
        eventData,
        confirmations,
        verificationTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error('Payment verification failed', { error: error.message, transactionHash, invoicePublicId });
      return this.createResult(false, PAYMENT_STATUS.FAILED, error.message);
    }
  }

  async getTransactionReceipt(transactionHash) {
    try {
      return await this.getProvider().getTransactionReceipt(transactionHash);
    } catch (error) {
      logger.error('Failed to fetch transaction receipt', { error: error.message, transactionHash });
      return null;
    }
  }

  async getTransactionReceiptWithRetry(transactionHash, maxRetries = 8, initialDelay = 1000) {
    let delay = initialDelay;
    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      const receipt = await this.getTransactionReceipt(transactionHash);
      if (receipt) {
        return receipt;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.floor(delay * 1.5);
    }
    return null;
  }

  async getChainId() {
    const network = await this.getProvider().getNetwork();
    return Number(network.chainId);
  }

  async parsePaymentEvent(receipt) {
    try {
      if (!this.contract && this.contractABI.length > 0) {
        this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.getProvider());
      }

      if (!this.contract || !this.contract.interface) {
        return null;
      }

      for (const log of receipt.logs || []) {
        try {
          const parsed = this.contract.interface.parseLog(log);
          if (parsed && parsed.name === 'PaymentAccepted') {
            return {
              invoiceHash: parsed.args.invoiceHash,
              payer: parsed.args.payer,
              token: parsed.args.token || ZERO_ADDRESS,
              amount: parsed.args.amount,
              timestamp: parsed.args.timestamp || Math.floor(Date.now() / 1000),
              logIndex: Number(log.index ?? log.logIndex ?? 0)
            };
          }
        } catch (error) {
          continue;
        }
      }
      return null;
    } catch (error) {
      logger.error('Error parsing event logs', { error: error.message });
      return null;
    }
  }

  async createPayment(data, status = PAYMENT_STATUS.CONFIRMING) {
    const gasUsed = data.receipt?.gasUsed ? BigInt(data.receipt.gasUsed) : null;
    const gasPrice = data.receipt?.gasPrice ? BigInt(data.receipt.gasPrice) : null;
    const feeWei = gasUsed !== null && gasPrice !== null ? gasUsed * gasPrice : null;

    return Payment.create({
      invoice_id: data.invoiceId,
      transaction_hash: data.transactionHash,
      log_index: Number(data.eventData.logIndex || 0),
      chain_id: this.chainId,
      payer_wallet: data.payerWallet,
      token_address: data.eventData.token || ZERO_ADDRESS,
      token_symbol: 'ETH',
      crypto_amount: ethers.formatEther(data.cryptoAmount),
      block_number: Number(data.blockNumber),
      confirmation_count: Number(data.confirmations || 0),
      required_confirmations: this.minConfirmations,
      status,
      detected_at: new Date(),
      confirmed_at: status === PAYMENT_STATUS.CONFIRMED ? new Date() : null,
      gas_used: gasUsed !== null ? String(gasUsed) : null,
      gas_price_eth: gasPrice !== null ? ethers.formatEther(gasPrice) : null,
      transaction_fee_eth: feeWei !== null ? ethers.formatEther(feeWei) : null
    });
  }

  async updatePaymentConfirmations(paymentId, confirmations) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) {
      return null;
    }

    await payment.update({ confirmation_count: Number(confirmations) });

    if (Number(confirmations) >= this.minConfirmations && payment.status !== PAYMENT_STATUS.CONFIRMED) {
      await payment.update({
        status: PAYMENT_STATUS.CONFIRMED,
        confirmed_at: new Date()
      });

      const invoice = await Invoice.findByPk(payment.invoice_id);
      if (invoice && invoice.status !== INVOICE_STATUS.PAID) {
        await invoice.update({ status: INVOICE_STATUS.PAID });
      }
    }

    return payment;
  }
}

module.exports = new PaymentVerificationService();