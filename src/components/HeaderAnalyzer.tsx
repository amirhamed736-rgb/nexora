import { useState } from 'react'

interface Props {
  onAnalyze: (headers: string) => void
  loading: boolean
  result: string | null
}

interface HeaderFinding {
  name: string
  status: 'present' | 'missing' | 'weak'
  value: string
  recommendation: string
}

const EXAMPLE_HEADERS = `Content-Type: text/html; charset=UTF-8
Server: nginx/1.24.0
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin`

const HEADER_CHECKS: { name: string; check: (val: string) => HeaderFinding }[] = [
  {
    name: 'strict-transport-security',
    check: (val) => ({
      name: 'Strict-Transport-Security (HSTS)',
      status: val ? 'present' : 'missing',
      value: val || 'Not set',
      recommendation: val ? 'HSTS is enabled — good protection against protocol downgrade attacks.' : 'Add HSTS header: Strict-Transport-Security: max-age=31536000; includeSubDomains',
    }),
  },
  {
    name: 'x-content-type-options',
    check: (val) => ({
      name: 'X-Content-Type-Options',
      status: val ? (val === 'nosniff' ? 'present' : 'weak') : 'missing',
      value: val || 'Not set',
      recommendation: val === 'nosniff' ? 'Properly set to nosniff — prevents MIME-type sniffing.' : 'Add: X-Content-Type-Options: nosniff',
    }),
  },
  {
    name: 'x-frame-options',
    check: (val) => ({
      name: 'X-Frame-Options',
      status: val ? (['deny', 'sameorigin'].includes(val.toLowerCase()) ? 'present' : 'weak') : 'missing',
      value: val || 'Not set',
      recommendation: val ? `Set to ${val} — clickjacking protection active.` : 'Add: X-Frame-Options: DENY (or use CSP frame-ancestors)',
    }),
  },
  {
    name: 'content-security-policy',
    check: (val) => ({
      name: 'Content-Security-Policy (CSP)',
      status: val ? (val.includes("'unsafe-inline'") ? 'weak' : 'present') : 'missing',
      value: val ? (val.length > 60 ? val.slice(0, 60) + '...' : val) : 'Not set',
      recommendation: val ? (val.includes("'unsafe-inline'") ? "CSP contains 'unsafe-inline' — consider removing it for stronger XSS protection." : 'CSP is present — mitigates XSS and data injection.') : 'Add a Content-Security-Policy header to prevent XSS and data injection attacks.',
    }),
  },
  {
    name: 'referrer-policy',
    check: (val) => ({
      name: 'Referrer-Policy',
      status: val ? 'present' : 'missing',
      value: val || 'Not set',
      recommendation: val ? `Referrer-Policy: ${val}` : 'Add: Referrer-Policy: strict-origin-when-cross-origin',
    }),
  },
  {
    name: 'permissions-policy',
    check: (val) => ({
      name: 'Permissions-Policy',
      status: val ? 'present' : 'missing',
      value: val ? (val.length > 60 ? val.slice(0, 60) + '...' : val) : 'Not set',
      recommendation: val ? 'Permissions-Policy is set.' : 'Add Permissions-Policy to control browser features (camera, microphone, geolocation, etc.)',
    }),
  },
  {
    name: 'x-xss-protection',
    check: (val) => ({
      name: 'X-XSS-Protection',
      status: val ? 'present' : 'missing',
      value: val || 'Not set',
      recommendation: val ? `X-XSS-Protection: ${val} (legacy — CSP is preferred).` : 'Consider adding CSP instead of X-XSS-Protection (deprecated but still useful for older browsers).',
    }),
  },
  {
    name: 'access-control-allow-origin',
    check: (val) => ({
      name: 'Access-Control-Allow-Origin (CORS)',
      status: val ? (val === '*' ? 'weak' : 'present') : 'missing',
      value: val || 'Not set',
      recommendation: val === '*' ? 'CORS is set to wildcard (*) — any domain can make requests. Restrict to specific trusted domains.' : val ? `CORS: ${val}` : 'CORS not set (default same-origin policy applies).',
    }),
  },
]

export default function HeaderAnalyzer({ onAnalyze, loading, result }: Props) {
  const [input, setInput] = useState('')
  const [url, setUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [findings, setFindings] = useState<HeaderFinding[]>([])
  const [score, setScore] = useState<number | null>(null)
  const [fetchedHeaders, setFetchedHeaders] = useState<Record<string, string>>({})

  async function fetchHeaders() {
    if (!url.trim()) return
    setFetching(true)
    setFindings([])
    setScore(null)

    try {
      const targetUrl = url.trim().match(/^https?:\/\//) ? url.trim() : `https://${url.trim()}`
      const response = await fetch(targetUrl, { mode: 'no-cors', redirect: 'follow' })

      const headers: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value
      })

      setFetchedHeaders(headers)
      analyzeHeaders(headers)
    } catch (e) {
      try {
        const targetUrl = url.trim().match(/^https?:\/\//) ? url.trim() : `http://${url.trim()}`
        const response = await fetch(targetUrl, { mode: 'no-cors' })
        const headers: Record<string, string> = {}
        response.headers.forEach((value, key) => {
          headers[key.toLowerCase()] = value
        })
        setFetchedHeaders(headers)
        analyzeHeaders(headers)
      } catch (err) {
        setFindings([{
          name: 'Fetch Error',
          status: 'missing',
          value: '',
          recommendation: `Could not fetch headers: ${(err as Error).message}. Browser CORS restrictions may block access to response headers. Try pasting headers manually instead.`,
        }])
      }
    }
    setFetching(false)
  }

  function analyzeHeaders(headers: Record<string, string>) {
    const results: HeaderFinding[] = []
    for (const check of HEADER_CHECKS) {
      results.push(check.check(headers[check.name] || ''))
    }
    setFindings(results)

    const issues = results.filter(r => r.status === 'missing').length
    const weak = results.filter(r => r.status === 'weak').length
    setScore(Math.max(0, 100 - issues * 12 - weak * 6))
  }

  function analyzeManual() {
    if (!input.trim()) return
    const headers: Record<string, string> = {}
    for (const line of input.split('\n')) {
      const idx = line.indexOf(':')
      if (idx === -1) continue
      headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim()
    }
    setFetchedHeaders(headers)
    analyzeHeaders(headers)
  }

  const STATUS_COLORS: Record<string, string> = {
    present: '#00ff9d',
    missing: '#ff3366',
    weak: '#ffaa00',
  }

  return (
    <div className="space-y-5">
      {/* URL fetch */}
      <div>
        <label className="cyber-label">Fetch Headers from URL</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchHeaders()}
            placeholder="https://example.com"
            className="cyber-input flex-1 font-mono text-[13px]"
          />
          <button onClick={fetchHeaders} disabled={fetching} className="cyber-btn cyber-btn-primary disabled:opacity-30">
            {fetching ? 'Fetching...' : 'Fetch & Analyze'}
          </button>
        </div>
        <p className="text-2xs text-cyber-muted mt-1.5 font-mono">
          Note: Browser CORS may limit visible headers. For full analysis, paste headers manually below.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-cyber-border" />
        <span className="text-2xs font-mono text-cyber-muted uppercase tracking-wider">or paste manually</span>
        <div className="flex-1 h-px bg-cyber-border" />
      </div>

      {/* Manual input */}
      <div>
        <label className="cyber-label">HTTP Response Headers</label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={EXAMPLE_HEADERS}
          className="cyber-input w-full h-40 font-mono text-[13px] leading-[1.6] resize-y"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={analyzeManual} disabled={!input.trim()} className="cyber-btn cyber-btn-primary disabled:opacity-30">
          Analyze Pasted Headers
        </button>
        <button onClick={() => setInput(EXAMPLE_HEADERS)} className="cyber-btn cyber-btn-ghost">
          Load Example
        </button>
        <button onClick={() => { setInput(''); setFindings([]); setScore(null) }} className="cyber-btn cyber-btn-ghost">
          Clear
        </button>
      </div>

      {/* Score */}
      {score !== null && (
        <div className="cyber-card p-4 fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="cyber-label mb-0">Security Score</span>
            <span className="text-2xl font-mono font-bold" style={{ color: score >= 80 ? '#00ff9d' : score >= 50 ? '#ffaa00' : '#ff3366' }}>
              {score}<span className="text-sm text-cyber-muted">/100</span>
            </span>
          </div>
          <div className="h-2.5 bg-cyber-surface rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: score >= 80 ? '#00ff9d' : score >= 50 ? '#ffaa00' : '#ff3366' }} />
          </div>
        </div>
      )}

      {/* Findings */}
      {findings.length > 0 && (
        <div className="space-y-2">
          {findings.map((f, i) => (
            <div key={i} className="cyber-card p-3.5 border-l-4 fade-in" style={{ borderLeftColor: STATUS_COLORS[f.status] }}>
              <div className="flex items-start justify-between mb-1.5">
                <h4 className="font-mono text-[13px] font-bold text-cyber-text-bright">{f.name}</h4>
                <span className="cyber-badge shrink-0 ml-2" style={{ background: `${STATUS_COLORS[f.status]}20`, color: STATUS_COLORS[f.status] }}>
                  {f.status}
                </span>
              </div>
              {f.value && f.value !== 'Not set' && (
                <code className="block text-2xs font-mono text-cyber-muted bg-cyber-surface/50 rounded px-2 py-1 mb-2 break-all">
                  {f.value}
                </code>
              )}
              <p className="text-xs text-cyber-text leading-relaxed">{f.recommendation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
