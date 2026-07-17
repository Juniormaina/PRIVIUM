// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TreasuryVault
 * @notice Multi-sig controlled vault for treasury funds on Avalanche
 * @dev Extends multi-sig pattern with ERC-20 token management and payroll integration
 */
interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IPayrollDisburser {
    function executePayroll(address[] calldata recipients, uint256[] calldata amounts, address token) external returns (bool);
}

contract TreasuryVault {
    event Deposit(address indexed from, uint256 value, address indexed token);
    event WithdrawalProposed(uint256 indexed proposalId, address indexed token, address to, uint256 value);
    event WithdrawalExecuted(uint256 indexed proposalId, address indexed executor);
    event PayrollProposed(uint256 indexed proposalId, address indexed token, address[] recipients, uint256[] amounts);
    event PayrollExecuted(uint256 indexed proposalId, address indexed executor);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event ThresholdChanged(uint256 newThreshold);
    event PayrollContractSet(address indexed payrollContract);

    struct Proposal {
        ProposalType pType;
        address token;       // address(0) for native AVAX
        address to;          // target address (for withdrawals)
        uint256 value;       // amount in token decimals (or wei for AVAX)
        bytes data;          // extra data
        bool executed;
        uint256 confirmationsCount;
        uint256 createdAt;
    }

    enum ProposalType { Withdrawal, Payroll, SignerAdd, SignerRemove, ThresholdChange, ContractUpgrade }

    address[] public signers;
    mapping(address => bool) public isSigner;
    uint256 public threshold;
    uint256 public proposalCount;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public confirmations;

    address public payrollDisburser;
    address public owner;

    // Supported tokens tracking
    mapping(address => bool) public supportedTokens;
    address[] public tokenList;

    modifier onlySigner() {
        require(isSigner[msg.sender], "Vault: not signer");
        _;
    }

    modifier proposalExists(uint256 proposalId) {
        require(proposalId < proposalCount, "Vault: proposal does not exist");
        _;
    }

    modifier notExecuted(uint256 proposalId) {
        require(!proposals[proposalId].executed, "Vault: already executed");
        _;
    }

    modifier notConfirmed(uint256 proposalId) {
        require(!confirmations[proposalId][msg.sender], "Vault: already confirmed");
        _;
    }

    constructor(address[] memory _signers, uint256 _threshold) {
        require(_signers.length > 0, "Vault: no signers");
        require(_threshold > 0, "Vault: threshold zero");
        require(_threshold <= _signers.length, "Vault: threshold > signers");

        owner = msg.sender;
        for (uint256 i = 0; i < _signers.length; i++) {
            address signer = _signers[i];
            require(signer != address(0), "Vault: zero address signer");
            require(!isSigner[signer], "Vault: duplicate signer");
            isSigner[signer] = true;
            signers.push(signer);
        }
        threshold = _threshold;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(0));
    }

    // ──────────────── Token Management ────────────────

    function addSupportedToken(address token) external onlySigner {
        require(token != address(0), "Vault: zero address token");
        require(!supportedTokens[token], "Vault: token already supported");
        supportedTokens[token] = true;
        tokenList.push(token);
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
    }

    // ──────────────── Deposits ────────────────

    function depositAVAX() external payable {
        require(msg.value > 0, "Vault: zero deposit");
        emit Deposit(msg.sender, msg.value, address(0));
    }

    function depositToken(address token, uint256 amount) external {
        require(supportedTokens[token], "Vault: unsupported token");
        require(amount > 0, "Vault: zero deposit");
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Vault: transfer failed");
        emit Deposit(msg.sender, amount, token);
    }

    // ──────────────── Balances ────────────────

    function getBalanceAVAX() external view returns (uint256) {
        return address(this).balance;
    }

    function getBalanceToken(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ──────────────── Proposals ────────────────

    function proposeWithdrawal(address token, address to, uint256 value) external onlySigner returns (uint256) {
        require(to != address(0), "Vault: zero address");
        require(value > 0, "Vault: zero value");
        if (token != address(0)) {
            require(supportedTokens[token], "Vault: unsupported token");
        }

        uint256 pid = proposalCount;
        proposals[pid] = Proposal({
            pType: ProposalType.Withdrawal,
            token: token,
            to: to,
            value: value,
            data: bytes(""),
            executed: false,
            confirmationsCount: 0,
            createdAt: block.timestamp
        });
        proposalCount++;
        emit WithdrawalProposed(pid, token, to, value);
        return pid;
    }

    function proposePayroll(address token, address[] calldata recipients, uint256[] calldata amounts)
        external
        onlySigner
        returns (uint256)
    {
        require(payrollDisburser != address(0), "Vault: payroll not set");
        require(recipients.length == amounts.length, "Vault: length mismatch");
        require(recipients.length > 0, "Vault: empty payroll");
        require(token == address(0) || supportedTokens[token], "Vault: unsupported token");

        uint256 pid = proposalCount;
        proposals[pid] = Proposal({
            pType: ProposalType.Payroll,
            token: token,
            to: address(0),
            value: 0,
            data: abi.encode(recipients, amounts),
            executed: false,
            confirmationsCount: 0,
            createdAt: block.timestamp
        });
        proposalCount++;
        emit PayrollProposed(pid, token, recipients, amounts);
        return pid;
    }

    // ──────────────── Confirmations ────────────────

    function confirmProposal(uint256 proposalId)
        external
        onlySigner
        proposalExists(proposalId)
        notExecuted(proposalId)
        notConfirmed(proposalId)
    {
        confirmations[proposalId][msg.sender] = true;
        proposals[proposalId].confirmationsCount++;
    }

    function revokeConfirmation(uint256 proposalId)
        external
        onlySigner
        proposalExists(proposalId)
        notExecuted(proposalId)
    {
        require(confirmations[proposalId][msg.sender], "Vault: not confirmed");
        confirmations[proposalId][msg.sender] = false;
        proposals[proposalId].confirmationsCount--;
    }

    // ──────────────── Execution ────────────────

    function executeProposal(uint256 proposalId)
        external
        onlySigner
        proposalExists(proposalId)
        notExecuted(proposalId)
    {
        Proposal storage prop = proposals[proposalId];
        require(prop.confirmationsCount >= threshold, "Vault: not enough confirmations");

        prop.executed = true;

        if (prop.pType == ProposalType.Withdrawal) {
            _executeWithdrawal(prop);
        } else if (prop.pType == ProposalType.Payroll) {
            _executePayroll(prop);
        } else if (prop.pType == ProposalType.SignerAdd) {
            _executeSignerAdd(prop);
        } else if (prop.pType == ProposalType.SignerRemove) {
            _executeSignerRemove(prop);
        } else if (prop.pType == ProposalType.ThresholdChange) {
            _executeThresholdChange(prop);
        } else if (prop.pType == ProposalType.ContractUpgrade) {
            _executeContractUpgrade(prop);
        }
    }

    function _executeWithdrawal(Proposal storage prop) internal {
        if (prop.token == address(0)) {
            // Native AVAX
            (bool success, ) = payable(prop.to).call{value: prop.value}("");
            require(success, "Vault: AVAX withdrawal failed");
        } else {
            require(IERC20(prop.token).transfer(prop.to, prop.value), "Vault: token withdrawal failed");
        }
        emit WithdrawalExecuted(proposalCount - 1, msg.sender);
    }

    function _executePayroll(Proposal storage prop) internal {
        (address[] memory recipients, uint256[] memory amounts) = abi.decode(prop.data, (address[], uint256[]));
        require(
            IPayrollDisburser(payrollDisburser).executePayroll(recipients, amounts, prop.token),
            "Vault: payroll failed"
        );
        emit PayrollExecuted(proposalCount - 1, msg.sender);
    }

    function _executeSignerAdd(Proposal storage prop) internal {
        address newSigner = abi.decode(prop.data, (address));
        require(newSigner != address(0), "Vault: zero address");
        require(!isSigner[newSigner], "Vault: already signer");
        isSigner[newSigner] = true;
        signers.push(newSigner);
        emit SignerAdded(newSigner);
    }

    function _executeSignerRemove(Proposal storage prop) internal {
        address signerToRemove = abi.decode(prop.data, (address));
        require(isSigner[signerToRemove], "Vault: not a signer");
        require(signers.length > 1, "Vault: cannot remove last signer");
        isSigner[signerToRemove] = false;
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signerToRemove) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }
        if (threshold > signers.length) {
            threshold = signers.length;
        }
        emit SignerRemoved(signerToRemove);
    }

    function _executeThresholdChange(Proposal storage prop) internal {
        uint256 newThreshold = abi.decode(prop.data, (uint256));
        require(newThreshold > 0, "Vault: threshold zero");
        require(newThreshold <= signers.length, "Vault: threshold > signers");
        threshold = newThreshold;
        emit ThresholdChanged(newThreshold);
    }

    function _executeContractUpgrade(Proposal storage prop) internal {
        // Used for updating the payroll disburser address
        payrollDisburser = prop.to;
        emit PayrollContractSet(prop.to);
    }

    // ──────────────── Governance Proposals ────────────────

    function proposeAddSigner(address newSigner) external onlySigner returns (uint256) {
        uint256 pid = proposalCount;
        proposals[pid] = Proposal({
            pType: ProposalType.SignerAdd,
            token: address(0),
            to: address(0),
            value: 0,
            data: abi.encode(newSigner),
            executed: false,
            confirmationsCount: 0,
            createdAt: block.timestamp
        });
        proposalCount++;
        return pid;
    }

    function proposeRemoveSigner(address signer) external onlySigner returns (uint256) {
        uint256 pid = proposalCount;
        proposals[pid] = Proposal({
            pType: ProposalType.SignerRemove,
            token: address(0),
            to: address(0),
            value: 0,
            data: abi.encode(signer),
            executed: false,
            confirmationsCount: 0,
            createdAt: block.timestamp
        });
        proposalCount++;
        return pid;
    }

    function proposeThresholdChange(uint256 newThreshold) external onlySigner returns (uint256) {
        uint256 pid = proposalCount;
        proposals[pid] = Proposal({
            pType: ProposalType.ThresholdChange,
            token: address(0),
            to: address(0),
            value: 0,
            data: abi.encode(newThreshold),
            executed: false,
            confirmationsCount: 0,
            createdAt: block.timestamp
        });
        proposalCount++;
        return pid;
    }

    function proposeSetPayrollContract(address _payrollDisburser) external onlySigner returns (uint256) {
        require(_payrollDisburser != address(0), "Vault: zero address");
        uint256 pid = proposalCount;
        proposals[pid] = Proposal({
            pType: ProposalType.ContractUpgrade,
            token: address(0),
            to: _payrollDisburser,
            value: 0,
            data: bytes(""),
            executed: false,
            confirmationsCount: 0,
            createdAt: block.timestamp
        });
        proposalCount++;
        return pid;
    }

    // ──────────────── Getters ────────────────

    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    function getProposal(uint256 proposalId)
        external
        view
        returns (ProposalType pType, address token, address to, uint256 value, bool executed, uint256 confirmationsCount)
    {
        Proposal storage p = proposals[proposalId];
        return (p.pType, p.token, p.to, p.value, p.executed, p.confirmationsCount);
    }
}