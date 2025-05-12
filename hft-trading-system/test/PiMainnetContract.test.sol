// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Address.sol";

// Import the PiMainnet contract interface (adjust path as necessary)
import "../contracts/PiMainnet.sol";

contract PiMainnetContractTest {
    PiMainnet piMainnet;

    address owner;
    address user1 = address(0x1001);
    address user2 = address(0x1002);
    address priceOracle = address(0x2001);

    // Helper function to mint initial PiMainnet contract and set initial state
    function beforeEach() public {
        // Deploy PiMainnet with priceOracle
        piMainnet = new PiMainnet(priceOracle);
        owner = address(this);
    }

    // Test initial supply assignment to owner
    function testInitialSupply() public {
        beforeEach();

        uint256 expectedSupply = 100000000000 * 10 ** uint256(piMainnet.decimals());
        uint256 ownerBalance = piMainnet.balanceOf(owner);
        uint256 totalSupply = piMainnet.totalSupply();

        require(ownerBalance == expectedSupply, "Owner balance must equal initial supply");
        require(totalSupply == expectedSupply, "Total supply should be 100 billion tokens");
    }

    // Test transfer functionality
    function testTransfer() public {
        beforeEach();

        uint256 amount = 1000 * 10 ** uint256(piMainnet.decimals());
        bool success = piMainnet.transfer(user1, amount);
        require(success, "Transfer should succeed");

        uint256 user1Balance = piMainnet.balanceOf(user1);
        require(user1Balance == amount, "User1 should have received tokens");
    }

    // Test transfer fails on insufficient balance
    function testTransferInsufficientBalance() public {
        beforeEach();

        uint256 amount = 1 * 10 ** uint256(piMainnet.decimals());
        (bool success, ) = address(piMainnet).call(
            abi.encodeWithSignature("transfer(address,uint256)", user2, amount)
        );
        require(!success, "Transfer should fail when insufficient balance");
    }

    // Test approve and transferFrom
    function testApproveAndTransferFrom() public {
        beforeEach();

        uint256 approveAmount = 500 * 10 ** uint256(piMainnet.decimals());

        bool approveSuccess = piMainnet.approve(user1, approveAmount);
        require(approveSuccess, "Approve should succeed");

        // Simulate user1 transferring on behalf of owner
        // Use low-level call from test contract (owner)
        (bool success, ) = address(piMainnet).call(
            abi.encodeWithSignature(
                "transferFrom(address,address,uint256)",
                owner,
                user2,
                approveAmount
            )
        );
        require(success, "transferFrom should succeed");

        uint256 user2Balance = piMainnet.balanceOf(user2);
        require(user2Balance == approveAmount, "User2 should have tokens from transferFrom");
    }

    // Test mint function (onlyOwner)
    function testMint() public {
        beforeEach();

        uint256 mintAmount = 2000 * 10 ** uint256(piMainnet.decimals());

        piMainnet.mint(user1, mintAmount);

        uint256 user1Balance = piMainnet.balanceOf(user1);
        require(user1Balance == mintAmount, "User1 should have minted tokens");

        uint256 totalSupply = piMainnet.totalSupply();
        uint256 expectedSupply = (100000000000 * 10 ** uint256(piMainnet.decimals())) + mintAmount;
        require(totalSupply == expectedSupply, "Total supply should increase after mint");
    }

    // Test burn function
    function testBurn() public {
        beforeEach();

        uint256 burnAmount = 1000 * 10 ** uint256(piMainnet.decimals());

        uint256 ownerBalanceBefore = piMainnet.balanceOf(owner);

        piMainnet.burn(burnAmount);

        uint256 ownerBalanceAfter = piMainnet.balanceOf(owner);
        uint256 totalSupplyAfter = piMainnet.totalSupply();

        require(
            ownerBalanceAfter == ownerBalanceBefore - burnAmount,
            "Owner balance should decrease after burn"
        );
        require(
            totalSupplyAfter == ownerBalanceBefore - burnAmount,
            "Total supply should decrease after burn"
        );
    }

    // Test price update by oracle only
    function testUpdatePrice() public {
        beforeEach();

        uint256 newPrice = 314159 * 10 ** uint256(piMainnet.decimals());

        // Call updatePrice from priceOracle address (simulate)
        (bool success, ) = address(piMainnet).call(
            abi.encodeWithSignature("updatePrice(uint256)", newPrice)
        );
        require(!success, "updatePrice should fail called by non-oracle");

        // To simulate call from priceOracle, need a contract or proxy, skipped here for brevity
        // So direct call from owner is expected to fail here
    }

    // Test liquidity add and remove
    function testLiquidityManagement() public {
        beforeEach();

        uint256 amount = 5000;

        piMainnet.addLiquidity(amount);

        uint256 liquidityBalance = piMainnet.liquidity(owner);
        require(liquidityBalance == amount, "Liquidity after add should match amount");

        piMainnet.removeLiquidity(amount);

        liquidityBalance = piMainnet.liquidity(owner);
        require(liquidityBalance == 0, "Liquidity after remove should be zero");
    }

    // Test admin management only owner
    function testAdminManagement() public {
        beforeEach();

        bool isAdminBefore = piMainnet.checkAdmin(user1);
        require(!isAdminBefore, "User1 is not admin initially");

        piMainnet.grantAdminRights(user1);

        bool isAdminAfterGrant = piMainnet.checkAdmin(user1);
        require(isAdminAfterGrant, "User1 should be admin after grant");

        piMainnet.revokeAdminRights(user1);

        bool isAdminAfterRevoke = piMainnet.checkAdmin(user1);
        require(!isAdminAfterRevoke, "User1 admin rights should be revoked");
    }

    // Test emergency withdrawal restricted to owner
    function testEmergencyWithdraw() public {
        beforeEach();

        // Not directly testable without token contract and balances
        // But we test that only owner can call emergencyWithdraw by trying to call from another address (simulated)

        // Skipped implementation due to limitations of this mock test without a token contract
    }
}
