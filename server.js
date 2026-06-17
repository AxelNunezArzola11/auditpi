import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { readFileSync } from 'fs'
import { initModels, analyzeContract, shutdown } from './analyzer.js'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })

app.use(cors())
app.use(express.json())
app.use(express.static('public'))

let ready = false

// Health check
app.get('/health', (req, res) => {
  res.json({ status: ready ? 'ready' : 'loading', model: 'QWEN3_600M' })
})

// Análisis por texto
app.post('/analyze', async (req, res) => {
  if (!ready) return res.status(503).json({ error: 'Models still loading' })
  const { code } = req.body
  if (!code) return res.status(400).json({ error: 'Missing code field' })

  try {
    const report = await analyzeContract(code)
    res.json({ success: true, report })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Análisis por archivo .sol
app.post('/analyze/file', upload.single('contract'), async (req, res) => {
  if (!ready) return res.status(503).json({ error: 'Models still loading' })
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

  try {
    const code = req.file.buffer.toString('utf-8')
    const report = await analyzeContract(code)
    res.json({ success: true, filename: req.file.originalname, report })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`AuditPi server running at http://0.0.0.0:${PORT}`)
  console.log('Loading AI models (first run downloads ~400MB)...')
  await initModels((p) => process.stdout.write(`\r  ${p.percentage?.toFixed(0) ?? '?'}%`))
  ready = true
  console.log('\nReady to audit smart contracts!')
})

process.on('SIGINT', async () => {
  console.log('\nShutting down...')
  await shutdown()
  process.exit(0)
})
