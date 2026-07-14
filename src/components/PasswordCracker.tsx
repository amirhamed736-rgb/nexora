import { useState, useRef, useCallback } from 'react'

type CrackMode = 'dictionary' | 'bruteforce' | 'hash-lookup'
type HashType = 'md5' | 'sha1' | 'sha256' | 'sha512' | 'plain'

interface CrackResult {
  found: boolean
  password: string | null
  attempts: number
  timeMs: number
  method: string
}

const COMMON_PASSWORDS = [
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234', '111111', '1234567',
  'dragon', '123123', 'admin', 'letmein', 'welcome', 'monkey', 'login', 'abc123', 'starwars',
  '1234567890', 'password1', 'password123', '000000', 'azure', 'root', 'toor', 'pass',
  'qwerty123', 'iloveyou', 'trustno1', 'sunshine', 'princess', 'football', 'charlie', 'access',
  'shadow', 'master', '654321', 'superman', 'qazwsx', 'michael', 'baseball', 'batman',
  'test', 'guest', 'hello', 'changeme', 'secret', 'demo', 'user', 'pass123', 'pass1234',
  'admin123', 'root123', 'test123', 'guest123', 'letmein123', 'welcome1', 'welcome123',
  'P@ssw0rd', 'P@ssword', 'P@ss1234', 'Passw0rd', 'Password1', 'Password123', 'Admin123',
  'abc12345', 'q1w2e3r4', 'asdfgh', 'zxcvbn', '1q2w3e4r', '1q2w3e', 'qwerty1', 'qwerty12',
  'password!', 'Password!', 'p@ssword', 'pa$$word', 'admin!', 'root!', 'toor!', 'hacker',
  'hunter2', 'hunter', 'buster', 'soccer', 'hockey', 'jordan', 'thomas', 'robert', 'daniel',
  'andrew', 'joshua', 'harley', 'ranger', 'thunder', 'pepper', 'george', 'summer', 'matrix',
  'mobile', 'internet', 'security', 'computer', 'network', 'server', 'linux', 'windows',
  'apple', 'google', 'facebook', 'twitter', 'instagram', 'snapchat', 'tiktok', 'youtube',
]

const CHARSET_LOWER = 'abcdefghijklmnopqrstuvwxyz'
const CHARSET_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const CHARSET_DIGITS = '0123456789'
const CHARSET_COMMON = CHARSET_LOWER + CHARSET_DIGITS

async function computeHash(text: string, algo: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest(algo.toUpperCase(), data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function detectHashType(hash: string): HashType {
  const len = hash.length
  if (/^[a-f0-9]{32}$/i.test(hash)) return 'md5'
  if (/^[a-f0-9]{40}$/i.test(hash)) return 'sha1'
  if (/^[a-f0-9]{64}$/i.test(hash)) return 'sha256'
  if (/^[a-f0-9]{128}$/i.test(hash)) return 'sha512'
  return 'plain'
}

export default function PasswordCracker() {
  const [target, setTarget] = useState('')
  const [mode, setMode] = useState<CrackMode>('dictionary')
  const [maxLen, setMaxLen] = useState(4)
  const [charset, setCharset] = useState('lower+digits')
  const [customDict, setCustomDict] = useState('')
  const [result, setResult] = useState<CrackResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentAttempt, setCurrentAttempt] = useState('')
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const stopRef = useRef(false)

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-50), msg])
  }, [])

  function getCharset(): string {
    switch (charset) {
      case 'lower': return CHARSET_LOWER
      case 'lower+upper': return CHARSET_LOWER + CHARSET_UPPER
      case 'lower+digits': return CHARSET_COMMON
      case 'all': return CHARSET_LOWER + CHARSET_UPPER + CHARSET_DIGITS + '!@#$%^&*'
      case 'digits': return CHARSET_DIGITS
      default: return CHARSET_COMMON
    }
  }

  async function crackDictionary(targetHash: string, hashType: HashType) {
    const dict = customDict.trim() ? customDict.split('\n').map(s => s.trim()).filter(Boolean) : COMMON_PASSWORDS
    addLog(`Dictionary attack: ${dict.length} entries, hash type: ${hashType}`)
    let attempts = 0
    const start = performance.now()

    for (const pwd of dict) {
      if (stopRef.current) break
      attempts++
      setCurrentAttempt(pwd)
      setProgress(Math.round((attempts / dict.length) * 100))

      let hashVal: string
      if (hashType === 'plain') {
        hashVal = pwd
      } else {
        hashVal = await computeHash(pwd, hashType)
      }

      if (hashVal.toLowerCase() === targetHash.toLowerCase()) {
        const timeMs = performance.now() - start
        return { found: true, password: pwd, attempts, timeMs, method: 'Dictionary' }
      }

      if (attempts % 100 === 0) await new Promise(r => setTimeout(r, 0))
    }

    return { found: false, password: null, attempts, timeMs: performance.now() - start, method: 'Dictionary' }
  }

  async function crackBruteForce(targetHash: string, hashType: HashType) {
    const chars = getCharset()
    const totalSpace = Math.pow(chars.length, maxLen)
    addLog(`Brute force: charset=${chars.length} chars, maxLen=${maxLen}, total=${totalSpace.toLocaleString()} combinations`)
    let attempts = 0
    const start = performance.now()

    function generateCombinations(length: number, prefix: string): string[] {
      if (length === 0) return [prefix]
      const results: string[] = []
      for (const c of chars) {
        results.push(...generateCombinations(length - 1, prefix + c))
      }
      return results
    }

    for (let len = 1; len <= maxLen; len++) {
      if (stopRef.current) break
      const combs = generateCombinations(len, '')
      for (const pwd of combs) {
        if (stopRef.current) break
        attempts++
        setCurrentAttempt(pwd)
        setProgress(Math.min(100, Math.round((attempts / Math.min(totalSpace, 100000)) * 100)))

        let hashVal: string
        if (hashType === 'plain') {
          hashVal = pwd
        } else {
          hashVal = await computeHash(pwd, hashType)
        }

        if (hashVal.toLowerCase() === targetHash.toLowerCase()) {
          const timeMs = performance.now() - start
          return { found: true, password: pwd, attempts, timeMs, method: 'Brute Force' }
        }

        if (attempts % 500 === 0) await new Promise(r => setTimeout(r, 0))
        if (attempts >= 500000) {
          addLog(`Safety limit reached at 500K attempts. Stopping.`)
          break
        }
      }
    }

    return { found: false, password: null, attempts, timeMs: performance.now() - start, method: 'Brute Force' }
  }

  async function hashLookup(targetHash: string) {
    addLog(`Rainbow table lookup for: ${targetHash}`)
    const start = performance.now()
    let attempts = 0

    for (const pwd of COMMON_PASSWORDS) {
      if (stopRef.current) break
      attempts++
      setCurrentAttempt(pwd)
      setProgress(Math.round((attempts / COMMON_PASSWORDS.length) * 100))

      for (const algo of ['md5', 'sha1', 'sha256', 'sha512']) {
        const hashVal = await computeHash(pwd, algo)
        if (hashVal.toLowerCase() === targetHash.toLowerCase()) {
          const timeMs = performance.now() - start
          return { found: true, password: pwd, attempts, timeMs, method: `Rainbow Table (${algo})` }
        }
      }
      if (attempts % 50 === 0) await new Promise(r => setTimeout(r, 0))
    }

    return { found: false, password: null, attempts, timeMs: performance.now() - start, method: 'Rainbow Table' }
  }

  async function startCrack() {
    if (!target.trim()) return
    setRunning(true)
    stopRef.current = false
    setResult(null)
    setProgress(0)
    setLog([])

    const targetVal = target.trim()
    let hashType: HashType = 'plain'

    if (mode === 'hash-lookup') {
      hashType = detectHashType(targetVal)
      addLog(`Auto-detected hash type: ${hashType}`)
      if (hashType === 'plain') {
        addLog('Input does not match any known hash format (MD5=32, SHA1=40, SHA256=64, SHA512=128 hex chars)')
      }
    } else if (mode === 'dictionary' || mode === 'bruteforce') {
      hashType = detectHashType(targetVal)
      if (hashType === 'plain') {
        addLog(`No hash detected — treating input as plaintext password to match against`)
      } else {
        addLog(`Hash detected: ${hashType}`)
      }
    }

    let res: CrackResult
    if (mode === 'bruteforce') {
      res = await crackBruteForce(targetVal, hashType)
    } else if (mode === 'hash-lookup') {
      res = await hashLookup(targetVal)
    } else {
      res = await crackDictionary(targetVal, hashType)
    }

    if (stopRef.current) {
      addLog('Cracking stopped by user.')
    } else if (res.found) {
      addLog(`PASSWORD FOUND: "${res.password}" after ${res.attempts} attempts in ${res.timeMs.toFixed(1)}ms`)
    } else {
      addLog(`Password not found after ${res.attempts} attempts in ${res.timeMs.toFixed(1)}ms`)
    }

    setResult(res)
    setRunning(false)
    setCurrentAttempt('')
  }

  function stopCrack() {
    stopRef.current = true
  }

  return (
    <div className="space-y-5">
      {/* Target input */}
      <div>
        <label className="cyber-label">Target (password hash or plaintext)</label>
        <input
          type="text"
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder="e.g. 5f4dcc3b5aa765d61d8327deb882cf99 (MD5 of 'password')"
          className="cyber-input w-full font-mono text-[13px]"
        />
        <p className="text-2xs text-cyber-muted mt-1.5 font-mono">
          Supports MD5 (32 hex), SHA1 (40 hex), SHA256 (64 hex), SHA512 (128 hex), or plaintext
        </p>
      </div>

      {/* Mode selection */}
      <div>
        <label className="cyber-label">Attack Mode</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'dictionary', name: 'Dictionary', desc: 'Common passwords list' },
            { id: 'bruteforce', name: 'Brute Force', desc: 'Try all combinations' },
            { id: 'hash-lookup', name: 'Rainbow Table', desc: 'Pre-computed hash lookup' },
          ] as const).map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                mode === m.id
                  ? 'bg-cyber-primary/10 border-cyber-primary/30 text-cyber-primary'
                  : 'bg-cyber-card border-cyber-border text-cyber-muted hover:text-cyber-text hover:border-cyber-border-light'
              }`}
            >
              <div className="font-mono text-xs font-bold">{m.name}</div>
              <div className="text-2xs mt-0.5 opacity-80">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Mode-specific options */}
      {mode === 'bruteforce' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="cyber-label">Max Length: <span className="text-cyber-primary">{maxLen}</span></label>
            <input type="range" min="1" max="6" value={maxLen} onChange={e => setMaxLen(parseInt(e.target.value))} className="w-full accent-cyber-primary" />
            <p className="text-2xs text-cyber-muted mt-1 font-mono">
              {Math.pow(getCharset().length, maxLen).toLocaleString()} combinations
            </p>
          </div>
          <div>
            <label className="cyber-label">Charset</label>
            <select value={charset} onChange={e => setCharset(e.target.value)} className="cyber-input-sm w-full font-mono">
              <option value="digits">Digits only (0-9)</option>
              <option value="lower">Lowercase (a-z)</option>
              <option value="lower+digits">Lower + Digits</option>
              <option value="lower+upper">Lower + Upper</option>
              <option value="all">All + Symbols</option>
            </select>
          </div>
        </div>
      )}

      {mode === 'dictionary' && (
        <div>
          <label className="cyber-label">Custom Dictionary (optional — one per line)</label>
          <textarea
            value={customDict}
            onChange={e => setCustomDict(e.target.value)}
            placeholder="Leave empty to use built-in list of 100+ common passwords"
            className="cyber-input w-full h-24 font-mono text-[13px] leading-[1.6] resize-y"
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {!running ? (
          <button onClick={startCrack} disabled={!target.trim()} className="cyber-btn cyber-btn-primary disabled:opacity-30">
            Start Cracking
          </button>
        ) : (
          <button onClick={stopCrack} className="cyber-btn cyber-btn-danger">
            Stop
          </button>
        )}
      </div>

      {/* Progress */}
      {running && (
        <div className="space-y-2 fade-in">
          <div className="h-2 bg-cyber-surface rounded-full overflow-hidden">
            <div className="h-full bg-cyber-primary rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-2xs font-mono text-cyber-muted">
            Trying: <span className="text-cyber-primary">{currentAttempt || '...'}</span> ({progress}%)
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`cyber-card p-4 border-l-4 fade-in ${result.found ? 'border-cyber-primary' : 'border-cyber-danger'}`} style={{ borderLeftColor: result.found ? '#00ff9d' : '#ff3366' }}>
          <div className="flex items-center gap-2 mb-2">
            {result.found ? (
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-cyber-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-cyber-danger" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            )}
            <h4 className="font-mono text-sm font-bold" style={{ color: result.found ? '#00ff9d' : '#ff3366' }}>
              {result.found ? 'PASSWORD CRACKED' : 'NOT FOUND'}
            </h4>
          </div>
          {result.found && (
            <div className="mb-3">
              <div className="text-2xs font-mono text-cyber-muted mb-1">Password:</div>
              <code className="text-lg font-mono font-bold text-cyber-primary">{result.password}</code>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 text-2xs font-mono">
            <div>
              <div className="text-cyber-muted">Method</div>
              <div className="text-cyber-text">{result.method}</div>
            </div>
            <div>
              <div className="text-cyber-muted">Attempts</div>
              <div className="text-cyber-text">{result.attempts.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-cyber-muted">Time</div>
              <div className="text-cyber-text">{result.timeMs.toFixed(1)}ms</div>
            </div>
          </div>
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <div>
          <label className="cyber-label">Attack Log</label>
          <div className="cyber-card p-3 max-h-40 overflow-y-auto space-y-0.5">
            {log.map((line, i) => (
              <div key={i} className="text-2xs font-mono text-cyber-muted leading-relaxed">
                <span className="text-cyber-primary/50">[{new Date().toLocaleTimeString()}]</span> {line}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 items-start text-2xs text-cyber-muted font-mono bg-cyber-warning/5 border border-cyber-warning/15 rounded-lg p-3 leading-relaxed">
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-cyber-warning shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
        </svg>
        <span>For educational and authorized testing only. Brute force is limited to 500K attempts for browser safety. Dictionary uses 100+ common passwords.</span>
      </div>
    </div>
  )
}
