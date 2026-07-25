// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Person 2: Accepts checkout payments and emits the canonical event verified by the backend.
contract PaymentGateway is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    event PaymentAccepted(
        bytes32 indexed invoiceHash,
        address indexed payer,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event TokenAllowanceUpdated(address indexed token, bool allowed);

    address public treasury;
    mapping(bytes32 => bool) public paidInvoices;
    mapping(address => bool) public allowedTokens;

    constructor(address initialTreasury) Ownable(msg.sender) {
        require(initialTreasury != address(0), "Invalid treasury");
        treasury = initialTreasury;
    }

    function payNative(bytes32 invoiceHash)
        external
        payable
        whenNotPaused
        nonReentrant
        validInvoice(invoiceHash)
    {
        require(msg.value > 0, "Zero payment");
        _markInvoicePaid(invoiceHash);

        (bool sent, ) = payable(treasury).call{value: msg.value}("");
        require(sent, "Treasury transfer failed");

        emit PaymentAccepted(invoiceHash, msg.sender, address(0), msg.value, block.timestamp);
    }

    function payToken(bytes32 invoiceHash, address token, uint256 amount)
        external
        whenNotPaused
        nonReentrant
        validInvoice(invoiceHash)
    {
        require(token != address(0), "Invalid token");
        require(allowedTokens[token], "Token not allowed");
        require(amount > 0, "Zero payment");
        _markInvoicePaid(invoiceHash);

        IERC20(token).safeTransferFrom(msg.sender, treasury, amount);

        emit PaymentAccepted(invoiceHash, msg.sender, token, amount, block.timestamp);
    }

    function setAllowedToken(address token, bool allowed) external onlyOwner {
        require(token != address(0), "Invalid token");
        allowedTokens[token] = allowed;
        emit TokenAllowanceUpdated(token, allowed);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _markInvoicePaid(bytes32 invoiceHash) private {
        require(!paidInvoices[invoiceHash], "Invoice already paid");
        paidInvoices[invoiceHash] = true;
    }

    modifier validInvoice(bytes32 invoiceHash) {
        require(invoiceHash != bytes32(0), "Invalid invoice hash");
        _;
    }
}
