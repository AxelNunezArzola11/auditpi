import fs from 'fs';
import path from 'path';

const LOG_FILE = path.resolve('./audit.log');

function writeLog(entry) {
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
  fs.appendFileSync(LOG_FILE, line + '\n');
  console.log('[AUDIT]', line);
}

export function logModelLoad(modelName) {
  writeLog({ event: 'model_load', model: modelName, status: 'success' });
}

export function logModelUnload(modelName) {
  writeLog({ event: 'model_unload', model: modelName });
}

export function logInference({ prompt, outputTokens, ttft, tokensPerSec }) {
  writeLog({
    event: 'inference',
    prompt_preview: prompt.slice(0, 80),
    output_tokens: outputTokens,
    ttft_ms: ttft,
    tokens_per_sec: tokensPerSec
  });
}
