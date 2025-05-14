// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract StablePegging {
    uint256 public constant TARGET_VALUE = 314159 * 10**18; // $314,159 dalam wei
    uint256 public totalSupply;
    address public oracle;

    constructor(address _oracle) {
        oracle = _oracle;
        totalSupply = 1000000 * 10**18; // Supply awal
    }

    function adjustSupply(uint256 currentPrice) external {
        // Logika penyesuaian supply berdasarkan harga dari oracle
        if (currentPrice > TARGET_VALUE) {
            // Burn token
            totalSupply -= (currentPrice - TARGET_VALUE) / 10**18;
        } else if (currentPrice < TARGET_VALUE) {
            // Mint token
            totalSupply += (TARGET_VALUE - currentPrice) / 10**18;
        }
    }
}
