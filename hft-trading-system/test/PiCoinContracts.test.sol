// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "../contracts/StableCoin.sol"; // Adjust the path as necessary
import "../contracts/LiquidityPool.sol"; // Adjust the path as necessary
import "../contracts/PriceOracle.sol"; // Adjust the path as necessary
import "../contracts/Governance.sol"; // Adjust the path as necessary

contract TestStableCoin {
    StableCoin stableCoin;
    LiquidityPool liquidityPool;
    PriceOracle priceOracle;
    Governance governance;

    address owner;
    address user1;
    address user2;

    function beforeEach() public {
        stableCoin = new StableCoin();
        liquidityPool = new LiquidityPool();
        priceOracle = new PriceOracle();
        governance = new Governance();
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
    }

    // Test StableCoin
    function testInitialSupply() public {
        uint256 expectedSupply = 100000000000 * 10 ** uint256(stableCoin.decimals());
        assert(stableCoin.totalSupply() == expectedSupply);
        assert(stableCoin.balanceOf(owner) == expectedSupply);
    }

    function testTransfer() public {
        uint256 transferAmount = 1000 * 10 ** uint256(stableCoin.decimals());
        
        // Transfer some tokens to user1
        stableCoin.transfer(user1, transferAmount);
        
        assert(stableCoin.balanceOf(owner) == (stableCoin.totalSupply() - transferAmount));
        assert(stableCoin.balanceOf(user1) == transferAmount);
    }

    function testTransferInsufficientBalance() public {
        uint256 transferAmount = 1000 * 10 ** uint256(stableCoin.decimals());
        
        // Attempt to transfer more than the balance
        (bool success, ) = address(stableCoin).call(abi.encodeWithSignature("transfer(address,uint256)", user1, transferAmount));
        assert(!success);
    }

    function testApproveAndTransferFrom() public {
        uint256 approveAmount = 500 * 10 ** uint256(stableCoin.decimals());
        stableCoin.approve(user1, approveAmount);
        
        // User1 should be able to transfer on behalf of the owner
        (bool success, ) = address(stableCoin).call(abi.encodeWithSignature("transferFrom(address,address,uint256)", owner, user2, approveAmount));
        assert(success);
        assert(stableCoin.balanceOf(user2) == approveAmount);
    }

    function testMint() public {
        uint256 mintAmount = 1000 * 10 ** uint256(stableCoin.decimals());
        
        // Mint new tokens to user1
        stableCoin.mint(user1, mintAmount);
        
        assert(stableCoin.balanceOf(user1) == mintAmount);
        assert(stableCoin.totalSupply() == (100000000000 * 10 ** uint256(stableCoin.decimals()) + mintAmount));
    }

    function testBurn() public {
        uint256 burnAmount = 500 * 10 ** uint256(stableCoin.decimals());
        
        // Burn tokens from the owner's balance
        stableCoin.burn(burnAmount);
        
        assert(stableCoin.balanceOf(owner) == (100000000000 * 10 ** uint256(stableCoin.decimals()) - burnAmount));
        assert(stableCoin.totalSupply() == (100000000000 * 10 ** uint256(stableCoin.decimals()) - burnAmount));
    }

    // Test LiquidityPool
    function testAddLiquidity() public {
        uint256 liquidityAmount = 1000;
        liquidityPool.addLiquidity(liquidityAmount);
        
        assert(liquidityPool.liquidity(owner) == liquidityAmount);
    }

    function testRemoveLiquidity() public {
        uint256 liquidityAmount = 1000;
        liquidityPool.addLiquidity(liquidityAmount);
        
        liquidityPool.removeLiquidity(liquidityAmount);
        assert(liquidityPool.liquidity(owner) == 0);
    }

    function testRemoveLiquidityInsufficient() public {
        uint256 liquidityAmount = 1000;
        liquidityPool.addLiquidity(liquidityAmount);
        
        (bool success, ) = address(liquidityPool).call(abi.encodeWithSignature("removeLiquidity(uint256)", liquidityAmount + 1));
        assert(!success);
    }

    // Test PriceOracle
    function testUpdatePrice() public {
        uint256 newPrice = 400000;
        priceOracle .updatePrice(newPrice);
        
        assert(priceOracle.getPrice() == newPrice);
    }

    function testUpdatePriceNotOwner() public {
        uint256 newPrice = 500000;
        (bool success, ) = address(priceOracle).call(abi.encodeWithSignature("updatePrice(uint256)", newPrice));
        assert(!success);
    }

    // Test Governance
    function testAddAdmin() public {
        governance.addAdmin(user1);
        assert(governance.isAdmin(user1) == true);
    }

    function testRemoveAdmin() public {
        governance.addAdmin(user1);
        governance.removeAdmin(user1);
        assert(governance.isAdmin(user1) == false);
    }

    function testAddAdminNotOwner() public {
        (bool success, ) = address(governance).call(abi.encodeWithSignature("addAdmin(address)", user1));
        assert(!success);
    }
}
