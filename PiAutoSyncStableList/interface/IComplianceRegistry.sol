// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IComplianceRegistry {
    function isCompliant(address exchange) external view returns (bool);
}
