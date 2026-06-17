# AuditPi - Cortex-A72 Compatibility Fixes

## Problem: SIGILL on Raspberry Pi 4 (Cortex-A72, ARMv8.0-A)

### Fix 1: Pin bare-runtime-linux-arm64 to v1.23.0
bare-runtime >= 1.24.0 uses ARMv8.2+ instructions incompatible with Pi 4.

```bash
npm install bare-runtime-linux-arm64@1.23.0
cp -r node_modules/bare-runtime-linux-arm64/* \
      node_modules/bare-runtime/node_modules/bare-runtime-linux-arm64/
```

### Fix 2: Remove engines.bare from all @qvac packages
@qvac packages require bare >= 1.24.0 but work fine with 1.23.0.

```bash
for dir in node_modules/@qvac/*/; do
  node -e "
    const fs = require('fs')
    const p = JSON.parse(fs.readFileSync('${dir}package.json'))
    if (p.engines?.bare) { delete p.engines; fs.writeFileSync('${dir}package.json', JSON.stringify(p,null,2)) }
  "
done
```

### Fix 3: Bundle SDK with only needed plugins (exclude translation-nmtcpp)
translation-nmtcpp crashes on ARMv8.0-A at init time.
Add to qvac.config.json:
```json
{
  "plugins": [
    "@qvac/sdk/llamacpp-completion/plugin",
    "@qvac/sdk/llamacpp-embedding/plugin"
  ]
}
```
Then: `node node_modules/@qvac/cli/dist/index.js bundle sdk`

### Fix 4: Force CPU, disable Vulkan
modelConfig: { device: 'cpu', ctx_size: 2048 }

### Fix 5: RAG documents must be plain strings
ragIngest({ documents: ['string1', 'string2'] }) — NOT objects
