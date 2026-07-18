// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Person 2: Responsible for on-chain payment gateway contract draft.
contract PaymentGateway {
    event NativePaid(address indexed payer, bytes32 indexed invoiceHash, uint256 amountWei);
    event TokenPaid(address indexed payer, address indexed token, bytes32 indexed invoiceHash, uint256 amount);

    modifier validInvoice(bytes32 invoiceHash) {
        require(invoiceHash != bytes32(0), "Invalid invoice hash");
        _;
    }

    function payNative(bytes32 invoiceHash) external payable validInvoice(invoiceHash) {
        // Placeholder: add payment accounting and validation logic here.
        emit NativePaid(msg.sender, invoiceHash, msg.value);
    }

    function payToken(address token, bytes32 invoiceHash, uint256 amount) external validInvoice(invoiceHash) {
        // Placeholder: add ERC20 transfer and validation logic here.
        emit TokenPaid(msg.sender, token, invoiceHash, amount);
    }
}