// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PayrollDisburser
 * @notice Batch token disbursement for payroll on Avalanche
 * @dev Called by the TreasuryVault to execute payroll runs
 */
interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract PayrollDisburser {
    event PayrollRun(uint256 indexed runId, address indexed token, uint256 totalAmount, uint256 employeeCount);
    event EmployeePaid(uint256 indexed runId, address indexed employee, uint256 amount);
    event AuthorizedCallerSet(address indexed caller, bool authorized);
    event TreasuryChanged(address indexed oldTreasury, address indexed newTreasury);

    address public treasury;
    address public owner;
    uint256 public payrollRunCount;

    // Track total disbursed per run
    struct PayrollRunData {
        address token;
        uint256 totalAmount;
        uint256 employeeCount;
        uint256 timestamp;
    }
    mapping(uint256 => PayrollRunData) public payrollRuns;

    modifier onlyTreasuryOrOwner() {
        require(msg.sender == treasury || msg.sender == owner, "Payroll: not authorized");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Payroll: not owner");
        _;
    }

    constructor(address _treasury) {
        require(_treasury != address(0), "Payroll: zero treasury");
        owner = msg.sender;
        treasury = _treasury;
    }

    /**
     * @notice Execute a payroll run — batch sends tokens to employees
     * @param recipients Array of employee addresses
     * @param amounts Array of amounts (in token decimals, or wei for AVAX)
     * @param token Address of the token to disburse (address(0) for native AVAX)
     * @return true if successful
     */
    function executePayroll(
        address[] calldata recipients,
        uint256[] calldata amounts,
        address token
    ) external onlyTreasuryOrOwner returns (bool) {
        require(recipients.length == amounts.length, "Payroll: length mismatch");
        require(recipients.length > 0, "Payroll: empty recipients");
        require(recipients.length <= 200, "Payroll: too many recipients"); // gas limit safety

        uint256 runId = payrollRunCount;
        uint256 totalAmount = 0;

        for (uint256 i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];
            uint256 amount = amounts[i];

            require(recipient != address(0), "Payroll: zero address");
            require(amount > 0, "Payroll: zero amount");

            if (token == address(0)) {
                // Native AVAX
                (bool success, ) = payable(recipient).call{value: amount}("");
                require(success, "Payroll: AVAX transfer failed");
            } else {
                require(IERC20(token).transfer(recipient, amount), "Payroll: token transfer failed");
            }

            totalAmount += amount;
            emit EmployeePaid(runId, recipient, amount);
        }

        payrollRuns[runId] = PayrollRunData({
            token: token,
            totalAmount: totalAmount,
            employeeCount: recipients.length,
            timestamp: block.timestamp
        });
        payrollRunCount++;
        emit PayrollRun(runId, token, totalAmount, recipients.length);
        return true;
    }

    /**
     * @notice Get details of a specific payroll run
     */
    function getPayrollRun(uint256 runId) external view returns (address token, uint256 totalAmount, uint256 employeeCount, uint256 timestamp) {
        PayrollRunData memory run = payrollRuns[runId];
        return (run.token, run.totalAmount, run.employeeCount, run.timestamp);
    }

    /**
     * @notice Get the balance of a token held by this contract
     */
    function getBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        }
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @notice Update the treasury address (only owner)
     */
    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Payroll: zero address");
        emit TreasuryChanged(treasury, newTreasury);
        treasury = newTreasury;
    }

    /**
     * @notice Accept AVAX for payroll funding
     */
    receive() external payable {}
}