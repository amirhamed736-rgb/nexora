import { useState, useMemo } from 'react'

const CHARSETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
}

export default function PasswordTools() {
  const [length, setLength] = useState(16)
  const [useLower, setUseLower] = useState(true)
  const [useUpper, setUseUpper] = useState(true)
  const [useNumbers, setUseNumbers] = useState(true)
  const [useSymbols, setUseSymbols] = useState(true)
  const [generated, setGenerated] = useState('')
  const [analyzeInput, setAnalyzeInput] = useState('')
  const [copied, setCopied] = useState(false)

  function generate() {
    let charset = ''
    if (useLower) charset += CHARSETS.lower
    if (useUpper) charset += CHARSETS.upper
    if (useNumbers) charset += CHARSETS.numbers
    if (useSymbols) charset += CHARSETS.symbols
    if (!charset) return

    const array = new Uint32Array(length)
    crypto.getRandomValues(array)
    let pwd = ''
    for (let i = 0; i < length; i++) {
      pwd += charset[array[i] % charset.length]
    }
    setGenerated(pwd)
    setCopied(false)
  }

  function copy() {
    navigator.clipboard.writeText(generated)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const strength = useMemo(() => {
    const pwd = analyzeInput
    if (!pwd) return null

    let score = 0
    const checks = {
      length: pwd.length >= 12,
      lower: /[a-z]/.test(pwd),
      upper: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      symbol: /[^a-zA-Z0-9]/.test(pwd),
      noCommon: !/password|123456|qwerty|admin|letmein/i.test(pwd),
      longEnough: pwd.length >= 16,
    }

    if (checks.length) score += 20
    if (checks.lower) score += 10
    if (checks.upper) score += 10
    if (checks.number) score += 10
    if (checks.symbol) score += 15
    if (checks.noCommon) score += 15
    if (checks.longEnough) score += 20

    score = Math.min(100, score)

    let label = 'Very Weak'
    let color = '#ff3366'
    if (score >= 80) { label = 'Strong'; color = '#00ff9d' }
    else if (score >= 60) { label = 'Good'; color = '#00d4ff' }
    else if (score >= 40) { label = 'Fair'; color = '#ffaa00' }
    else if (score >= 20) { label = 'Weak'; color = '#ff6b35' }

    const crackTime = estimateCrackTime(pwd)

    return { score, label, color, checks, crackTime }
  }, [analyzeInput])

  function estimateCrackTime(pwd: string): string {
    let charsetSize = 0
    if (/[a-z]/.test(pwd)) charsetSize += 26
    if (/[A-Z]/.test(pwd)) charsetSize += 26
    if (/[0-9]/.test(pwd)) charsetSize += 10
    if (/[^a-zA-Z0-9]/.test(pwd)) charsetSize += 32
    if (charsetSize === 0) return 'Instant'

    const combinations = Math.pow(charsetSize, pwd.length)
    const seconds = combinations / 1e10

    if (seconds < 1) return 'Instant'
    if (seconds < 60) return `${Math.round(seconds)} seconds`
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`
    if (seconds < 2592000) return `${Math.round(seconds / 86400)} days`
    if (seconds < 31536000) return `${Math.round(seconds / 2592000)} months`
    const years = seconds / 31536000
    if (years < 1000) return `${Math.round(years)} years`
    if (years < 1e6) return `${Math.round(years / 1000)}K years`
    if (years < 1e9) return `${Math.round(years / 1e6)}M years`
    return 'Centuries+'
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="cyber-section-title mb-4">Password Generator</h3>
        <div className="space-y-4">
          <div>
            <label className="cyber-label">
              Length: <span className="text-cyber-primary">{length}</span>
            </label>
            <input
              type="range"
              min="4"
              max="64"
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value))}
              className="w-full accent-cyber-primary"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Lowercase (a-z)', val: useLower, set: setUseLower },
              { label: 'Uppercase (A-Z)', val: useUpper, set: setUseUpper },
              { label: 'Numbers (0-9)', val: useNumbers, set: setUseNumbers },
              { label: 'Symbols (!@#$)', val: useSymbols, set: setUseSymbols },
            ].map((opt) => (
              <label key={opt.label} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={opt.val}
                  onChange={(e) => opt.set(e.target.checked)}
                  className="accent-cyber-primary w-3.5 h-3.5"
                />
                <span className="text-xs font-mono text-cyber-text">{opt.label}</span>
              </label>
            ))}
          </div>

          <button onClick={generate} className="cyber-btn cyber-btn-primary">
            Generate Password
          </button>

          {generated && (
            <div className="cyber-card p-3.5 flex items-center gap-2 fade-in">
              <code className="flex-1 font-mono text-[13px] text-cyber-primary break-all leading-relaxed">{generated}</code>
              <button onClick={copy} className="cyber-btn cyber-btn-ghost text-2xs whitespace-nowrap">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-cyber-border pt-5">
        <h3 className="cyber-section-title mb-4">Password Strength Analyzer</h3>
        <input
          type="text"
          value={analyzeInput}
          onChange={(e) => setAnalyzeInput(e.target.value)}
          placeholder="Enter a password to analyze..."
          className="cyber-input w-full font-mono text-[13px]"
        />

        {strength && (
          <div className="mt-4 space-y-3.5 fade-in">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-2xs font-mono font-semibold uppercase tracking-wider text-cyber-muted">Strength</span>
                <span className="text-xs font-mono font-bold" style={{ color: strength.color }}>
                  {strength.label} ({strength.score}/100)
                </span>
              </div>
              <div className="h-2 bg-cyber-surface rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${strength.score}%`, background: strength.color }}
                />
              </div>
            </div>

            <div className="text-xs font-mono text-cyber-muted">
              Estimated crack time: <span className="text-cyber-warning font-semibold">{strength.crackTime}</span>
            </div>

            <div className="space-y-1.5">
              {Object.entries(strength.checks).map(([key, passed]) => (
                <div key={key} className="flex items-center gap-2 text-xs font-mono">
                  <span style={{ color: passed ? '#00ff9d' : '#ff3366' }} className="font-bold">
                    {passed ? '✓' : '✗'}
                  </span>
                  <span className={passed ? 'text-cyber-text' : 'text-cyber-muted'}>
                    {key === 'length' && 'At least 12 characters'}
                    {key === 'lower' && 'Contains lowercase'}
                    {key === 'upper' && 'Contains uppercase'}
                    {key === 'number' && 'Contains numbers'}
                    {key === 'symbol' && 'Contains symbols'}
                    {key === 'noCommon' && 'Not a common password'}
                    {key === 'longEnough' && 'At least 16 characters'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
