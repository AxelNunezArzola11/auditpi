import {
  loadModel,
  unloadModel,
  completion,
  ragIngest,
  ragSearch,
  ragCloseWorkspace,
  QWEN3_4B_INST_Q4_K_M,
  EMBEDDINGGEMMA_300M_Q4_0,
} from '@qvac/sdk'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const KNOWLEDGE_DIR = join(__dirname, 'knowledge')
const WORKSPACE_ID = 'auditpi-rag'

let llmId = null
let embedId = null
let ragReady = false

export async function initModels(onProgress) {
  console.log('Loading embedding model...')
  embedId = await loadModel({
    modelSrc: EMBEDDINGGEMMA_300M_Q4_0,
    modelConfig: { device: 'cpu' },
    onProgress,
  })

  console.log('Loading LLM...')
  llmId = await loadModel({
    modelSrc: QWEN3_4B_INST_Q4_K_M,
    modelType: 'llamacpp-completion',
    modelConfig: { device: 'cpu', ctx_size: 4096 },
    onProgress,
  })

  await ingestKnowledgeBase()
  console.log('AuditPi ready ✓')
}

async function ingestKnowledgeBase() {
  const files = readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.txt'))
  const documents = files.map(f => readFileSync(join(KNOWLEDGE_DIR, f), 'utf-8'))
  await ragIngest({ modelId: embedId, workspaceId: WORKSPACE_ID, documents })
  ragReady = true
  console.log(`RAG: ingested ${files.length} knowledge documents`)
}

export async function analyzeContract(solidityCode) {
  if (!llmId || !embedId) throw new Error('Models not loaded')

  const ragResults = await ragSearch({
    modelId: embedId,
    workspaceId: WORKSPACE_ID,
    query: solidityCode.slice(0, 200),
    limit: 1,
  })

  const ragItems = ragResults ?? []
  const ragContext = Array.isArray(ragItems)
    ? ragItems.map(r => r.content ?? r.text ?? (typeof r === 'string' ? r : '')).join('\n')
    : ''

  const code = solidityCode.slice(0, 800)

  const history = [
    {
      role: 'system',
      content: `You are a smart contract auditor. Analyze Solidity code for vulnerabilities. Respond ONLY with JSON:
{"summary":"...","severity":"LOW|MEDIUM|HIGH|CRITICAL","vulnerabilities":[{"type":"...","line":"...","severity":"...","description":"...","fix":"..."}],"score":0} /no_think`
    },
    {
      role: 'user',
      content: `Audit this contract:\n\`\`\`solidity\n${code}\n\`\`\``
    },
  ]

  let output = ''
  const result = completion({ modelId: llmId, history, stream: true, maxTokens: 600 })
  for await (const token of result.tokenStream) {
    output += token
    process.stdout.write(token)
  }
  process.stdout.write('\n')

  // Limpiar thinking tags y markdown
  const clean = output
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim()

  try {
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (jsonMatch) return JSON.parse(jsonMatch[0])
  } catch (e) {}

  return { raw: clean, summary: 'Parse error' }
}

export async function shutdown() {
  if (ragReady) await ragCloseWorkspace({ workspaceId: WORKSPACE_ID })
  if (embedId) await unloadModel({ modelId: embedId })
  if (llmId) await unloadModel({ modelId: llmId })
}
