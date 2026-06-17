# 🔐 AuditPi — On-Device Smart Contract Security Sentinel

> Autonomous, offline-first smart contract security analyzer running entirely on a Raspberry Pi 5.
> Powered by QVAC SDK + Qwen3 4B LLM + RAG — zero cloud dependencies.

## 🏆 QVAC Hackathon I — Tinkerer Track

Built for the QVAC Hackathon I "Tinkerer" track (≤4GB RAM edge hardware).
Proves that production-grade smart contract security tooling can run on a $80 single-board computer.

## ✨ Features

- 🔍 Vulnerability Detection — Reentrancy, overflow, access control, DoS, and more
- 🧠 RAG-backed Analysis — Local vector store with known exploit patterns
- 💡 Fix Recommendations — Copy-pasteable code fixes for each vulnerability
- ⛽ Gas Optimization — Identifies inefficient patterns
- 🌐 Web UI — Drag and drop .sol files or paste code
- 📴 100% Offline — No API keys, no cloud, no data leaks

## 🖥️ Hardware

- Raspberry Pi 5 (8GB RAM) — also works on Pi 4 with fixes below
- Any ARM64 Linux device with 2GB+ RAM

## 🚀 Quick Start

### Prerequisites

Install Node.js 22+:

    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs git
    node --version

### Install

    git clone https://github.com/YOUR_USERNAME/auditpi.git
    cd auditpi
    npm install

### Bundle the SDK worker (required)

    node node_modules/@qvac/cli/dist/index.js bundle sdk

### Run

    node server.js

Open http://PI_IP:3000 from any device on your network.
First run downloads ~2.5GB model. Subsequent runs use cache.

## ⚠️ Raspberry Pi 4 Fixes (Cortex-A72 / ARMv8.0-A)

Pi 4 needs these fixes due to ARMv8.2+ instructions in newer Bare runtime:

Fix 1 — Pin bare-runtime to v1.23.0:

    npm install bare-runtime-linux-arm64@1.23.0
    cp -r node_modules/bare-runtime-linux-arm64/* node_modules/bare-runtime/node_modules/bare-runtime-linux-arm64/

Fix 2 — Remove incompatible engine requirements:

    for dir in node_modules/@qvac/*/; do
      node -e "
        const fs = require('fs')
        const f = '${dir}package.json'
        const p = JSON.parse(fs.readFileSync(f))
        if (p.engines && p.engines.bare) { delete p.engines; fs.writeFileSync(f, JSON.stringify(p,null,2)) }
      "
    done

Fix 3 — Fix binary permissions:

    chmod +x node_modules/bare-runtime-linux-arm64/bin/bare
    chmod +x node_modules/bare-runtime/node_modules/bare-runtime-linux-arm64/bin/bare

Fix 4 — Exclude translation plugin (crashes on ARMv8.0-A):
Add to qvac.config.json:

    "plugins": [
      "@qvac/sdk/llamacpp-completion/plugin",
      "@qvac/sdk/llamacpp-embedding/plugin"
    ]

Then re-run bundle sdk.

## 🏗️ Architecture

    auditpi/
    ├── server.js          # Express API server
    ├── analyzer.js        # QVAC SDK + RAG engine
    ├── qvac.config.json   # Model configuration
    ├── knowledge/         # Offline vulnerability knowledge base
    │   ├── reentrancy.txt
    │   ├── overflow.txt
    │   ├── access-control.txt
    │   └── gas-issues.txt
    └── public/
        └── index.html     # Web UI

## 🧠 How It Works

1. RAG Search — Query embeds against local knowledge base (EmbeddingGemma 300M)
2. LLM Analysis — Qwen3 4B analyzes code + RAG context entirely on-device
3. JSON Report — Structured vulnerabilities with severity, line numbers, and fixes

## 📊 Models Used

| Model               | Size   | Purpose                  |
|---------------------|--------|--------------------------|
| Qwen3 4B Q4_K_M     | ~2.5GB | Smart contract analysis  |
| EmbeddingGemma 300M | ~300MB | RAG embeddings           |

## 🔧 QVAC SDK Notes

- bare-runtime-linux-arm64 must be pinned to v1.23.0 for Cortex-A72
- @qvac/translation-nmtcpp must be excluded (crashes on ARMv8.0-A)
- All inference forced to CPU (device: cpu) to avoid Vulkan crashes
- RAG documents must be plain strings, not objects

## 📜 License

MIT
