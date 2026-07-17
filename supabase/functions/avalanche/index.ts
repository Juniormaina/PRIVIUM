import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "npm:ethers@6.13.5";

// ──────────────── Config ────────────────
const FUJI_RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";
const CHAIN_ID = 43113; // Avalanche Fuji testnet

// ──────────────── Types ────────────────
interface DeployArgs {
  contractName: string;
  constructorArgs?: unknown[];
}

interface MintArgs {
  tokenAddress: string;
  to: string;
  amount: string;
}

interface BalanceArgs {
  tokenAddress?: string;
  walletAddress?: string;
}

interface SubmitTxArgs {
  vaultAddress: string;
  tokenAddress: string;
  to: string;
  value: string;
}

interface ConfirmArgs {
  vaultAddress: string;
  proposalId: number;
}

interface ExecuteArgs {
  vaultAddress: string;
  proposalId: number;
}

interface PayrollArgs {
  vaultAddress: string;
  tokenAddress: string;
  recipients: string[];
  amounts: string[];
}

interface ProposePayrollArgs {
  vaultAddress: string;
  tokenAddress: string;
  recipients: string[];
  amounts: string[];
}

interface DeployAllArgs {
  signers: string[];
  threshold: number;
}

// ──────────────── Contract Artifacts ────────────────
const ARTIFACTS_DIR = new URL("contracts/", import.meta.url);

async function loadArtifact(name: string) {
  const url = new URL(`${name}.json`, ARTIFACTS_DIR);
  const text = await Deno.readTextFile(url);
  return JSON.parse(text);
}

// ──────────────── Get Provider & Signer ────────────────
function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(FUJI_RPC_URL, CHAIN_ID);
}

function getSigner(provider: ethers.JsonRpcProvider): ethers.Wallet {
  const privateKey = Deno.env.get("AVALANCHE_CHAIN_PRIVATE_KEY");
  if (!privateKey) {
    throw new Error("AVALANCHE_CHAIN_PRIVATE_KEY not set");
  }
  // Ensure 0x prefix
  const key = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  return new ethers.Wallet(key, provider);
}

// ──────────────── Actions ────────────────

async function deployContract(args: DeployArgs) {
  const provider = getProvider();
  const signer = getSigner(provider);
  const artifact = await loadArtifact(args.contractName);

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy(...(args.constructorArgs || []));
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  return {
    success: true,
    contractName: args.contractName,
    address,
    txHash: contract.deploymentTransaction()?.hash,
  };
}

async function deployAll(args: DeployAllArgs) {
  const provider = getProvider();
  const signer = getSigner(provider);
  const results: Record<string, string> = {};

  // 1. Deploy MockUSDC
  const usdcArtifact = await loadArtifact("MockUSDC");
  const usdcFactory = new ethers.ContractFactory(usdcArtifact.abi, usdcArtifact.bytecode, signer);
  const usdc = await usdcFactory.deploy();
  await usdc.waitForDeployment();
  results.MockUSDC = await usdc.getAddress();

  // 2. Deploy PayrollDisburser (needs treasury address - deploy vault first)
  // But we need the vault address. Let's deploy vault first, then payroll.
  // Actually, we can deploy payroll with a placeholder and update it later.
  // Or better: deploy vault, then deploy payroll with vault address.

  // 3. Deploy MultiSigWallet
  const msigArtifact = await loadArtifact("MultiSigWallet");
  const msigFactory = new ethers.ContractFactory(msigArtifact.abi, msigArtifact.bytecode, signer);
  const msig = await msigFactory.deploy(args.signers, args.threshold);
  await msig.waitForDeployment();
  results.MultiSigWallet = await msig.getAddress();

  // 4. Deploy TreasuryVault
  const vaultArtifact = await loadArtifact("TreasuryVault");
  const vaultFactory = new ethers.ContractFactory(vaultArtifact.abi, vaultArtifact.bytecode, signer);
  const vault = await vaultFactory.deploy(args.signers, args.threshold);
  await vault.waitForDeployment();
  results.TreasuryVault = await vault.getAddress();

  // 5. Deploy PayrollDisburser (with vault address)
  const payrollArtifact = await loadArtifact("PayrollDisburser");
  const payrollFactory = new ethers.ContractFactory(payrollArtifact.abi, payrollArtifact.bytecode, signer);
  const payroll = await payrollFactory.deploy(results.TreasuryVault);
  await payroll.waitForDeployment();
  results.PayrollDisburser = await payroll.getAddress();

  // 6. Link vault to payroll contract (by proposing and executing a contract upgrade)
  // For simplicity, we'll use the deployer as the signer to set the payroll contract
  if (results.TreasuryVault) {
    const vaultContract = new ethers.Contract(results.TreasuryVault, vaultArtifact.abi, signer);
    // Add USDC as supported token
    await (await vaultContract.addSupportedToken(results.MockUSDC)).wait();
    // Set payroll contract via proposal
    const pid = await vaultContract.proposeSetPayrollContract(results.PayrollDisburser);
    await pid.wait();
    // Confirm and execute (since deployer is a signer, this works with threshold=1)
    const txReceipt = await pid.wait();
    // Get the proposalId from the event
    const proposeEvent = vaultContract.interface.parseLog(txReceipt.logs[0]);
    const proposalId = proposeEvent?.args?.[0];
    if (proposalId !== undefined) {
      await (await vaultContract.confirmProposal(proposalId)).wait();
      await (await vaultContract.executeProposal(proposalId)).wait();
    }
  }

  return {
    success: true,
    contracts: results,
    deployer: await signer.getAddress(),
  };
}

async function getTokenBalance(args: BalanceArgs) {
  const provider = getProvider();
  const signer = getSigner(provider);
  const walletAddress = args.walletAddress || signer.address;

  if (!args.tokenAddress) {
    // Native AVAX balance
    const balance = await provider.getBalance(walletAddress);
    return {
      success: true,
      wallet: walletAddress,
      balance: ethers.formatEther(balance),
      symbol: "AVAX",
      decimals: 18,
    };
  }

  // ERC-20 token balance
  const artifact = await loadArtifact("MockUSDC");
  const contract = new ethers.Contract(args.tokenAddress, artifact.abi, provider);
  const balance = await contract.balanceOf(walletAddress);
  const decimals = await contract.decimals();
  const symbol = await contract.symbol();
  const name = await contract.name();

  return {
    success: true,
    wallet: walletAddress,
    token: args.tokenAddress,
    balance: ethers.formatUnits(balance, decimals),
    symbol,
    name,
    decimals: Number(decimals),
  };
}

async function mintTokens(args: MintArgs) {
  const provider = getProvider();
  const signer = getSigner(provider);
  const artifact = await loadArtifact("MockUSDC");
  const contract = new ethers.Contract(args.tokenAddress, artifact.abi, signer);

  const amount = ethers.parseUnits(args.amount, 6); // USDC has 6 decimals
  const tx = await contract.mint(args.to, amount);
  await tx.wait();

  return {
    success: true,
    token: args.tokenAddress,
    to: args.to,
    amount: args.amount,
    symbol: "mUSDC",
    txHash: tx.hash,
  };
}

async function getVaultInfo(args: { vaultAddress: string }) {
  const provider = getProvider();
  const artifact = await loadArtifact("TreasuryVault");
  const contract = new ethers.Contract(args.vaultAddress, artifact.abi, provider);

  const [signers, threshold, proposalCount, avaxBalance] = await Promise.all([
    contract.getSigners(),
    contract.threshold(),
    contract.proposalCount(),
    contract.getBalanceAVAX(),
  ]);

  return {
    success: true,
    vault: args.vaultAddress,
    signers: signers as string[],
    threshold: Number(threshold),
    proposalCount: Number(proposalCount),
    avaxBalance: ethers.formatEther(avaxBalance),
  };
}

async function proposeWithdrawal(args: SubmitTxArgs) {
  const provider = getProvider();
  const signer = getSigner(provider);
  const artifact = await loadArtifact("TreasuryVault");
  const contract = new ethers.Contract(args.vaultAddress, artifact.abi, signer);

  const tokenAddress = args.tokenAddress === "native" ? ethers.ZeroAddress : args.tokenAddress;
  const value = ethers.parseEther(args.value); // For native AVAX; for tokens, this is raw amount

  const tx = await contract.proposeWithdrawal(tokenAddress, args.to, value);
  const receipt = await tx.wait();

  // Parse the event to get proposalId
  const event = receipt.logs.find((log: ethers.Log) => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed?.name === "WithdrawalProposed";
    } catch {
      return false;
    }
  });
  const parsed = event ? contract.interface.parseLog(event) : null;
  const proposalId = parsed?.args?.[0];

  return {
    success: true,
    proposalId: proposalId ? Number(proposalId) : null,
    txHash: tx.hash,
    vault: args.vaultAddress,
    proposal: {
      token: tokenAddress,
      to: args.to,
      value: args.value,
    },
  };
}

async function confirmProposal(args: ConfirmArgs) {
  const provider = getProvider();
  const signer = getSigner(provider);
  const artifact = await loadArtifact("TreasuryVault");
  const contract = new ethers.Contract(args.vaultAddress, artifact.abi, signer);

  const tx = await contract.confirmProposal(args.proposalId);
  await tx.wait();

  // Check if threshold is met
  const proposal = await contract.proposals(args.proposalId);
  const threshold = await contract.threshold();
  const isApproved = Number(proposal.confirmationsCount) >= Number(threshold);

  return {
    success: true,
    proposalId: args.proposalId,
    vault: args.vaultAddress,
    confirmed: true,
    confirmationsCount: Number(proposal.confirmationsCount),
    threshold: Number(threshold),
    readyToExecute: isApproved,
  };
}

async function executeProposal(args: ExecuteArgs) {
  const provider = getProvider();
  const signer = getSigner(provider);
  const artifact = await loadArtifact("TreasuryVault");
  const contract = new ethers.Contract(args.vaultAddress, artifact.abi, signer);

  const tx = await contract.executeProposal(args.proposalId);
  const receipt = await tx.wait();

  return {
    success: true,
    proposalId: args.proposalId,
    vault: args.vaultAddress,
    executed: true,
    txHash: tx.hash,
  };
}

async function proposePayrollRun(args: ProposePayrollArgs) {
  const provider = getProvider();
  const signer = getSigner(provider);
  const artifact = await loadArtifact("TreasuryVault");
  const contract = new ethers.Contract(args.vaultAddress, artifact.abi, signer);

  const tokenAddress = args.tokenAddress === "native" ? ethers.ZeroAddress : args.tokenAddress;
  const amounts = args.amounts.map((a) => ethers.parseUnits(a, 6)); // Assume USDC decimals

  const tx = await contract.proposePayroll(tokenAddress, args.recipients, amounts);
  const receipt = await tx.wait();

  const event = receipt.logs.find((log: ethers.Log) => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed?.name === "PayrollProposed";
    } catch {
      return false;
    }
  });
  const parsed = event ? contract.interface.parseLog(event) : null;
  const proposalId = parsed?.args?.[0];

  return {
    success: true,
    proposalId: proposalId ? Number(proposalId) : null,
    vault: args.vaultAddress,
    txHash: tx.hash,
    recipients: args.recipients.length,
    totalAmount: args.amounts.reduce((a, b) => (BigInt(a) + BigInt(b)).toString(), "0"),
  };
}

async function getContractsStatus() {
  const provider = getProvider();
  const signer = getSigner(provider);
  const deployerAddress = signer.address;

  return {
    success: true,
    chainId: CHAIN_ID,
    chainName: "Avalanche Fuji (C-Chain)",
    rpcUrl: FUJI_RPC_URL,
    deployer: deployerAddress,
    deployerBalance: ethers.formatEther(await provider.getBalance(deployerAddress)),
  };
}

// ──────────────── Main Handler ────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    // ──── JWT Verification ────
    const authorization = req.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    const jwt = authorization.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const { action, ...args } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: "Action is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    let result;

    switch (action) {
      // ──── Deployment ────
      case "deploy":
        result = await deployContract(args as unknown as DeployArgs);
        break;
      case "deploy-all":
        result = await deployAll(args as unknown as DeployAllArgs);
        break;

      // ──── Balances & Info ────
      case "get-status":
        result = await getContractsStatus();
        break;
      case "get-balance":
        result = await getTokenBalance(args as unknown as BalanceArgs);
        break;
      case "get-vault":
        result = await getVaultInfo(args as unknown as { vaultAddress: string });
        break;

      // ──── Token Operations ────
      case "mint":
        result = await mintTokens(args as unknown as MintArgs);
        break;

      // ──── Treasury Operations ────
      case "propose-withdrawal":
        result = await proposeWithdrawal(args as unknown as SubmitTxArgs);
        break;
      case "propose-payroll":
        result = await proposePayrollRun(args as unknown as ProposePayrollArgs);
        break;
      case "confirm":
        result = await confirmProposal(args as unknown as ConfirmArgs);
        break;
      case "execute":
        result = await executeProposal(args as unknown as ExecuteArgs);
        break;

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Avalanche function error:", err);
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});