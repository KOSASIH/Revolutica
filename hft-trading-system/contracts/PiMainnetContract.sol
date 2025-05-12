// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract PiMainnet is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    // Token details
    string public name = "Pi Coin";
    string public symbol = "PI";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    // Mappings for balances and allowances
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 value);
    event Burn(address indexed from, uint256 value);
    event PriceUpdated(uint256 newPrice);
    event LiquidityAdded(address indexed provider, uint256 amount);
    event LiquidityRemoved(address indexed provider, uint256 amount);

    // Price Oracle
    uint256 public currentPrice; // Price in USD (scaled by 1e18 for precision)
    address public priceOracle;

    // Liquidity Pool
    mapping(address => uint256) public liquidity;

    // Governance
    mapping(address => bool) public isAdmin;

    // Constructor to initialize the contract
    constructor(address _priceOracle) {
        totalSupply = 100000000000 * 10 ** uint256(decimals); // Set total supply to 100 billion
        balanceOf[msg.sender] = totalSupply; // Assign total supply to the contract creator
        priceOracle = _priceOracle;
        currentPrice = 314159 * 10 ** uint256(decimals); // Set price of 1 Pi = $314,159 (scaled)
        isAdmin[msg.sender] = true; // Grant admin rights to the contract creator
    }

    // Token Transfer
    function transfer(address to, uint256 value) public returns (bool success) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] = balanceOf[msg.sender].sub(value);
        balanceOf[to] = balanceOf[to].add(value);
        emit Transfer(msg.sender, to, value);
        return true;
    }

    // Approve allowance
    function approve(address spender, uint256 value) public returns (bool success) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    // Transfer from allowance
    function transferFrom(address from, address to, uint256 value) public returns (bool success) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Allowance exceeded");
        balanceOf[from] = balanceOf[from].sub(value);
        balanceOf[to] = balanceOf[to].add(value);
        allowance[from][msg.sender] = allowance[from][msg.sender].sub(value);
        emit Transfer(from, to, value);
        return true;
    }

    // Mint new tokens
    function mint(address to, uint256 value) public onlyOwner {
        totalSupply = totalSupply.add(value);
        balanceOf[to] = balanceOf[to].add(value);
        emit Mint(to, value);
    }

    // Burn tokens
    function burn(uint256 value) public {
        require(balanceOf[msg.sender] >= value, "Insufficient balance to burn");
        balanceOf[msg.sender] = balanceOf[msg.sender].sub(value);
        totalSupply = totalSupply.sub(value);
        emit Burn(msg.sender, value);
    }

    // Update price from oracle
    function updatePrice(uint256 newPrice) public {
        require(msg.sender == priceOracle, "Only price oracle can update price");
        currentPrice = newPrice;
        emit PriceUpdated(newPrice);
    }

    // Add liquidity to the pool
    function addLiquidity(uint256 amount) public nonReentrant {
        require(amount > 0, "Amount must be greater than zero");
        liquidity[msg.sender] = liquidity[msg.sender].add(amount);
        emit LiquidityAdded(msg.sender, amount);
    }

    // Remove liquidity from the pool
    function removeLiquidity(uint256 amount) public nonReentrant {
        require(liquidity[msg.sender] >= amount, "Insufficient liquidity");
        liquidity[msg.sender] = liquidity[msg.sender].sub(amount);
        emit LiquidityRemoved(msg.sender, amount);
    }

    // Get current price
    function getCurrentPrice() public view returns (uint256) {
        return currentPrice;
    }

    // Admin functions
    function grantAdminRights(address admin) public onlyOwner {
        isAdmin[admin] = true;
    }

    function revokeAdminRights(address admin) public onlyOwner {
        isAdmin[admin] = false;
    }

    // Emergency withdrawal for owner
    function emergencyWithdraw(address token, uint256 amount) public onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }

    // Function to check if an address is an admin
    function checkAdmin(address admin) public view returns (bool) {
        return isAdmin[admin];
    }
}
