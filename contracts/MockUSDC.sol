// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockUSDC
 * @notice Test ERC-20 token with 6 decimals (matching real USDC on Avalanche)
 * @dev Only the owner can mint new tokens
 */
contract MockUSDC {
    string public constant name = "Mock USDC";
    string public constant symbol = "mUSDC";
    uint8 public constant decimals = 6;

    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 value);

    modifier onlyOwner() {
        require(msg.sender == owner, "MockUSDC: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Mint tokens to an address
     * @param to Recipient address
     * @param amount Amount in 6 decimals (e.g. 1_000_000 = 1 USDC)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "MockUSDC: mint to zero address");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        require(to != address(0), "MockUSDC: transfer to zero address");
        require(balanceOf[msg.sender] >= value, "MockUSDC: insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(to != address(0), "MockUSDC: transfer to zero address");
        require(balanceOf[from] >= value, "MockUSDC: insufficient balance");
        require(allowance[from][msg.sender] >= value, "MockUSDC: insufficient allowance");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }
}