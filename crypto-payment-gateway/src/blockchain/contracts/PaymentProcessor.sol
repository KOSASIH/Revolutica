// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PaymentProcessor {
    address public owner;
    address public treasury;
    uint256 public feePercentage = 1; // 1% fee to treasury

    event PaymentProcessed(address indexed payer, uint256 amount, address token);

    constructor(address _treasury) {
        owner = msg.sender;
        treasury = _treasury;
    }

    function processPayment(address token, uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        IERC20(token).transferFrom(msg.sender, address(this), amount);

        uint256 fee = (amount * feePercentage) / 100;
        uint256 netAmount = amount - fee;

        IERC20(token).transfer(treasury, fee);
        IERC20(token).transfer(owner, netAmount);

        emit PaymentProcessed(msg.sender, amount, token);
    }

    function setFeePercentage(uint256 _feePercentage) external {
        require(msg.sender == owner, "Only owner");
        require(_feePercentage <= 10, "Fee too high");
        feePercentage = _feePercentage;
    }
}
