// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICrossChainBridge {
    function bridgeListingData(address exchange, string memory coinSymbol, uint256 fixedValue) external;
}
