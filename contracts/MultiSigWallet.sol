// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MultiSigWallet
 * @notice N-of-M multi-signature wallet for Avalanche treasury management
 * @dev Owners can submit, confirm, and execute transactions
 */
contract MultiSigWallet {
    event TransactionSubmitted(uint256 indexed txId, address indexed proposer, address to, uint256 value, bytes data);
    event TransactionConfirmed(uint256 indexed txId, address indexed owner);
    event TransactionRevoked(uint256 indexed txId, address indexed owner);
    event TransactionExecuted(uint256 indexed txId, address indexed executor);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event ThresholdChanged(uint256 newThreshold);

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmationsCount;
    }

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public threshold;
    uint256 public transactionCount;

    // txId -> Transaction
    mapping(uint256 => Transaction) public transactions;
    // txId -> owner -> confirmed
    mapping(uint256 => mapping(address => bool)) public confirmations;

    modifier onlyWallet() {
        require(msg.sender == address(this), "MultiSig: only wallet can call");
        _;
    }

    modifier ownerExists() {
        require(isOwner[msg.sender], "MultiSig: not owner");
        _;
    }

    modifier txExists(uint256 txId) {
        require(txId < transactionCount, "MultiSig: tx does not exist");
        _;
    }

    modifier notExecuted(uint256 txId) {
        require(!transactions[txId].executed, "MultiSig: already executed");
        _;
    }

    modifier notConfirmed(uint256 txId) {
        require(!confirmations[txId][msg.sender], "MultiSig: already confirmed");
        _;
    }

    /**
     * @param _owners Initial list of owners
     * @param _threshold Number of confirmations required
     */
    constructor(address[] memory _owners, uint256 _threshold) {
        require(_owners.length > 0, "MultiSig: no owners");
        require(_threshold > 0, "MultiSig: threshold zero");
        require(_threshold <= _owners.length, "MultiSig: threshold > owners");

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "MultiSig: zero address owner");
            require(!isOwner[owner], "MultiSig: duplicate owner");
            isOwner[owner] = true;
            owners.push(owner);
        }
        threshold = _threshold;
    }

    receive() external payable {}

    /**
     * @notice Submit a transaction for multi-sig approval
     */
    function submitTransaction(address to, uint256 value, bytes calldata data)
        external
        ownerExists
        returns (uint256)
    {
        uint256 txId = transactionCount;
        transactions[txId] = Transaction({
            to: to,
            value: value,
            data: data,
            executed: false,
            confirmationsCount: 0
        });
        transactionCount++;
        emit TransactionSubmitted(txId, msg.sender, to, value, data);
        return txId;
    }

    /**
     * @notice Confirm a pending transaction
     */
    function confirmTransaction(uint256 txId)
        external
        ownerExists
        txExists(txId)
        notExecuted(txId)
        notConfirmed(txId)
    {
        confirmations[txId][msg.sender] = true;
        transactions[txId].confirmationsCount++;
        emit TransactionConfirmed(txId, msg.sender);
    }

    /**
     * @notice Revoke your confirmation on a pending transaction
     */
    function revokeConfirmation(uint256 txId)
        external
        ownerExists
        txExists(txId)
        notExecuted(txId)
    {
        require(confirmations[txId][msg.sender], "MultiSig: not confirmed");
        confirmations[txId][msg.sender] = false;
        transactions[txId].confirmationsCount--;
        emit TransactionRevoked(txId, msg.sender);
    }

    /**
     * @notice Execute a transaction once it has enough confirmations
     */
    function executeTransaction(uint256 txId)
        external
        ownerExists
        txExists(txId)
        notExecuted(txId)
    {
        Transaction storage txn = transactions[txId];
        require(txn.confirmationsCount >= threshold, "MultiSig: not enough confirmations");

        txn.executed = true;
        (bool success, ) = txn.to.call{value: txn.value}(txn.data);
        require(success, "MultiSig: execution failed");
        emit TransactionExecuted(txId, msg.sender);
    }

    /**
     * @notice Get the number of confirmations for a transaction
     */
    function getConfirmationsCount(uint256 txId) external view returns (uint256) {
        return transactions[txId].confirmationsCount;
    }

    /**
     * @notice Get the list of owners
     */
    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    /**
     * @notice Get the balance of native AVAX held by the wallet
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Add a new owner (requires execution via multisig)
     */
    function addOwner(address newOwner) external onlyWallet {
        require(newOwner != address(0), "MultiSig: zero address");
        require(!isOwner[newOwner], "MultiSig: already owner");
        isOwner[newOwner] = true;
        owners.push(newOwner);
        emit OwnerAdded(newOwner);
    }

    /**
     * @notice Remove an owner (requires execution via multisig)
     */
    function removeOwner(address ownerToRemove) external onlyWallet {
        require(isOwner[ownerToRemove], "MultiSig: not owner");
        require(owners.length > 1, "MultiSig: cannot remove last owner");

        isOwner[ownerToRemove] = false;
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == ownerToRemove) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }

        if (threshold > owners.length) {
            threshold = owners.length;
        }
        emit OwnerRemoved(ownerToRemove);
    }

    /**
     * @notice Change the required threshold (requires execution via multisig)
     */
    function changeThreshold(uint256 newThreshold) external onlyWallet {
        require(newThreshold > 0, "MultiSig: threshold zero");
        require(newThreshold <= owners.length, "MultiSig: threshold > owners");
        threshold = newThreshold;
        emit ThresholdChanged(newThreshold);
    }
}