// Import necessary libraries
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PiCoinContracts", function () {
    let StableCoin, stableCoin, LiquidityPool, liquidityPool, PriceOracle, priceOracle;
    let owner, addr1, addr2;

    beforeEach(async function () {
        // Get the ContractFactory and Signers here.
        StableCoin = await ethers.getContractFactory("StableCoin");
        LiquidityPool = await ethers.getContractFactory("LiquidityPool");
        PriceOracle = await ethers.getContractFactory("PriceOracle");

        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy contracts
        stableCoin = await StableCoin.deploy();
        liquidityPool = await LiquidityPool.deploy();
        priceOracle = await PriceOracle.deploy();
    });

    describe("StableCoin", function () {
        it("should have the correct name and symbol", async function () {
            expect(await stableCoin.name()).to.equal("Pi Coin");
            expect(await stableCoin.symbol()).to.equal("PI");
        });

        it("should assign total supply to the owner", async function () {
            const totalSupply = await stableCoin.totalSupply();
            expect(await stableCoin.balanceOf(owner.address)).to.equal(totalSupply);
        });

        it("should transfer tokens between accounts", async function () {
            await stableCoin.transfer(addr1.address, 100);
            expect(await stableCoin.balanceOf(addr1.address)).to.equal(100);
            expect(await stableCoin.balanceOf(owner.address)).to.equal(await stableCoin.totalSupply() - 100);
        });

        it("should approve and transfer tokens from another account", async function () {
            await stableCoin.approve(addr1.address, 50);
            await stableCoin.connect(addr1).transferFrom(owner.address, addr2.address, 50);
            expect(await stableCoin.balanceOf(addr2.address)).to.equal(50);
        });

        it("should mint new tokens", async function () {
            await stableCoin.mint(addr1.address, 1000);
            expect(await stableCoin.balanceOf(addr1.address)).to.equal(1000);
        });

        it("should burn tokens", async function () {
            await stableCoin.burn(100);
            expect(await stableCoin.balanceOf(owner.address)).to.equal(await stableCoin.totalSupply() - 100);
        });
    });

    describe("LiquidityPool", function () {
        it("should add liquidity", async function () {
            await liquidityPool.addLiquidity(100);
            expect(await liquidityPool.liquidity(owner.address)).to.equal(100);
        });

        it("should remove liquidity", async function () {
            await liquidityPool.addLiquidity(100);
            await liquidityPool.removeLiquidity(50);
            expect(await liquidityPool.liquidity(owner.address)).to.equal(50);
        });
    });

    describe("PriceOracle", function () {
        it("should return the correct price", async function () {
            expect(await priceOracle.getPrice()).to.equal(314159);
        });

        it("should update the price", async function () {
            await priceOracle.updatePrice(400000);
            expect(await priceOracle.getPrice()).to.equal(400000);
        });
    });
});
