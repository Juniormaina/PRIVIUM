const solc = require("solc");
const fs = require("fs");
const path = require("path");

const CONTRACTS_DIR = path.join(__dirname, "..", "contracts");
const OUTPUT_DIR = path.join(__dirname, "..", "supabase", "functions", "avalanche", "contracts");

const sources = {};

// Read all .sol files
const files = fs.readdirSync(CONTRACTS_DIR).filter(f => f.endsWith(".sol"));
for (const file of files) {
  const content = fs.readFileSync(path.join(CONTRACTS_DIR, file), "utf8");
  sources[file] = { content };
}

const input = {
  language: "Solidity",
  sources,
  settings: {
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Check for errors
if (output.errors) {
  for (const err of output.errors) {
    if (err.severity === "error") {
      console.error("Compilation error:", err.formattedMessage);
      process.exit(1);
    }
  }
}

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Write each contract artifact
for (const [file, contractFile] of Object.entries(output.contracts)) {
  for (const [contractName, contractData] of Object.entries(contractFile)) {
    const artifact = {
      contractName,
      abi: contractData.abi,
      bytecode: "0x" + contractData.evm.bytecode.object,
      compilerVersion: solc.version(),
    };
    const outPath = path.join(OUTPUT_DIR, `${contractName}.json`);
    fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));
    console.log(`✅ Written: ${outPath}`);
  }
}

console.log("\n🎉 All contracts compiled successfully!");