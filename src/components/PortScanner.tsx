import { useState, useRef } from 'react'

interface PortResult {
  port: number
  service: string
  status: 'open' | 'closed' | 'filtered'
  responseTime: number
}

const SERVICES: Record<number, string> = {
  21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
  80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS', 445: 'SMB',
  993: 'IMAPS', 995: 'POP3S', 1433: 'MSSQL', 1521: 'Oracle',
  3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL', 5900: 'VNC',
  6379: 'Redis', 8080: 'HTTP-Alt', 8443: 'HTTPS-Alt', 9000: 'PHP-FPM',
  27017: 'MongoDB', 3000: 'Dev-Server', 4000: 'Dev-Server',
}

const COMMON_PORTS = '21,22,23,25,53,80,110,143,443,445,993,995,3306,3389,5432,5900,6379,8080,8443,3000'

function parseHost(host: string): { hostname: string; port: number | null } {
  const trimmed = host.trim()
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(trimmed)) {
    const [ip, port] = trimmed.split(':')
    return { hostname: ip, port: port ? parseInt(port) : null }
  }
  if (/^https?:\/\//.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      return { hostname: url.hostname, port: url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80) }
    } catch { return { hostname: trimmed, port: null } }
  }
  if (trimmed.includes(':')) {
    const [h, p] = trimmed.split(':')
    return { hostname: h, port: parseInt(p) || null }
  }
  return { hostname: trimmed, port: null }
}

async function scanPort(host: string, port: number, timeout: number): Promise<PortResult> {
  const service = SERVICES[port] || 'Unknown'
  const start = performance.now()

  return new Promise((resolve) => {
    let resolved = false
    const ws = new WebSocket(`ws://${host}:${port}`)
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        ws.close()
        resolve({ port, service, status: 'filtered', responseTime: Math.round(performance.now() - start) })
      }
    }, timeout)

    ws.onopen = () => {
      if (!resolved) {
        resolved = true
        clearTimeout(timer)
        ws.close()
        resolve({ port, service, status: 'open', responseTime: Math.round(performance.now() - start) })
      }
    }

    ws.onerror = () => {
      if (!resolved) {
        resolved = true
        clearTimeout(timer)
        const elapsed = Math.round(performance.now() - start)
        if (elapsed < timeout - 100) {
          resolve({ port, service, status: 'closed', responseTime: elapsed })
        } else {
          resolve({ port, service, status: 'filtered', responseTime: elapsed })
        }
      }
    }
  })
}

async function scanPortHTTP(host: string, port: number, timeout: number): Promise<PortResult> {
  const service = SERVICES[port] || 'Unknown'
  const start = performance.now()

  return new Promise((resolve) => {
    let resolved = false
    const controller = new AbortController()
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true
        controller.abort()
        resolve({ port, service, status: 'filtered', responseTime: Math.round(performance.now() - start) })
      }
    }, timeout)

    fetch(`http://${host}:${port}`, { mode: 'no-cors', signal: controller.signal, redirect: 'manual' })
      .then(() => {
        if (!resolved) {
          resolved = true
          clearTimeout(timer)
          resolve({ port, service, status: 'open', responseTime: Math.round(performance.now() - start) })
        }
      })
      .catch((err) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timer)
          const elapsed = Math.round(performance.now() - start)
          if (err.name === 'AbortError') {
            resolve({ port, service, status: 'filtered', responseTime: elapsed })
          } else if (elapsed < timeout - 100) {
            resolve({ port, service, status: 'closed', responseTime: elapsed })
          } else {
            resolve({ port, service, status: 'filtered', responseTime: elapsed })
          }
        }
      })
  })
}

export default function PortScanner() {
  const [host, setHost] = useState('')
  const [ports, setPorts] = useState(COMMON_PORTS)
  const [timeout, setTimeoutMs] = useState(2000)
  const [results, setResults] = useState<PortResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentPort, setCurrentPort] = useState(0)
  const [log, setLog] = useState<string[]>([])
  const stopRef = useRef(false)

  async function startScan() {
    if (!host.trim()) return
    setScanning(true)
    stopRef.current = false
    setResults([])
    setLog([])
    setProgress(0)

    const { hostname } = parseHost(host)
    const portList = ports.split(',').map(p => parseInt(p.trim())).filter(p => p > 0 && p <= 65535)

    setLog([`Starting scan on ${hostname} — ${portList.length} ports, timeout ${timeout}ms`])

    const allResults: PortResult[] = []

    for (let i = 0; i < portList.length; i++) {
      if (stopRef.current) break
      const port = portList[i]
      setCurrentPort(port)
      setProgress(Math.round(((i) / portList.length) * 100))

      const result = await scanPortHTTP(hostname, port, timeout)
      allResults.push(result)
      setResults([...allResults])

      const statusIcon = result.status === 'open' ? 'OPEN' : result.status === 'closed' ? 'CLOSED' : 'FILTERED'
      setLog(prev => [...prev, `Port ${port} (${result.service}): ${statusIcon} — ${result.responseTime}ms`])

      await new Promise(r => setTimeout(r, 50))
    }

    setProgress(100)
    setLog(prev => [...prev, stopRef.current ? 'Scan stopped by user.' : `Scan complete. ${allResults.filter(r => r.status === 'open').length} open ports found.`])
    setScanning(false)
    setCurrentPort(0)
  }

  function stopScan() {
    stopRef.current = true
  }

  const openCount = results.filter(r => r.status === 'open').length
  const closedCount = results.filter(r => r.status === 'closed').length
  const filteredCount = results.filter(r => r.status === 'filtered').length

  const STATUS_COLORS: Record<string, string> = {
    open: '#00ff9d',
    closed: '#ff3366',
    filtered: '#ffaa00',
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="cyber-label">Target Host (IP or domain)</label>
          <input
            type="text"
            value={host}
            onChange={e => setHost(e.target.value)}
            placeholder="example.com or 192.168.1.1"
            className="cyber-input w-full font-mono text-[13px]"
          />
        </div>
        <div>
          <label className="cyber-label">Ports (comma-separated)</label>
          <input
            type="text"
            value={ports}
            onChange={e => setPorts(e.target.value)}
            placeholder={COMMON_PORTS}
            className="cyber-input w-full font-mono text-[13px]"
          />
        </div>
      </div>

      <div>
        <label className="cyber-label">Timeout: <span className="text-cyber-primary">{timeout}ms</span></label>
        <input type="range" min="500" max="5000" step="500" value={timeout} onChange={e => setTimeoutMs(parseInt(e.target.value))} className="w-full accent-cyber-primary" />
      </div>

      <div className="flex gap-2">
        {!scanning ? (
          <button onClick={startScan} disabled={!host.trim()} className="cyber-btn cyber-btn-primary disabled:opacity-30">
            Start Scan
          </button>
        ) : (
          <button onClick={stopScan} className="cyber-btn cyber-btn-danger">
            Stop Scan
          </button>
        )}
        <button onClick={() => setPorts(COMMON_PORTS)} className="cyber-btn cyber-btn-ghost">
          Common Ports
        </button>
      </div>

      {scanning && (
        <div className="space-y-2 fade-in">
          <div className="h-2 bg-cyber-surface rounded-full overflow-hidden">
            <div className="h-full bg-cyber-primary rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-2xs font-mono text-cyber-muted">
            Scanning port <span className="text-cyber-primary">{currentPort}</span>... ({progress}%)
          </div>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Open', value: openCount, color: STATUS_COLORS.open },
              { label: 'Closed', value: closedCount, color: STATUS_COLORS.closed },
              { label: 'Filtered', value: filteredCount, color: STATUS_COLORS.filtered },
            ].map(s => (
              <div key={s.label} className="cyber-card p-3 text-center">
                <div className="text-lg font-mono font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-2xs font-mono text-cyber-muted mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="cyber-card overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead className="bg-cyber-surface border-b border-cyber-border">
                <tr>
                  <th className="text-left px-3.5 py-2.5 text-2xs text-cyber-muted font-semibold uppercase tracking-wider">Port</th>
                  <th className="text-left px-3.5 py-2.5 text-2xs text-cyber-muted font-semibold uppercase tracking-wider">Service</th>
                  <th className="text-left px-3.5 py-2.5 text-2xs text-cyber-muted font-semibold uppercase tracking-wider">Status</th>
                  <th className="text-left px-3.5 py-2.5 text-2xs text-cyber-muted font-semibold uppercase tracking-wider">Response</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-cyber-border/40 hover:bg-cyber-surface/50 transition-colors">
                    <td className="px-3.5 py-2.5 text-cyber-text">{r.port}</td>
                    <td className="px-3.5 py-2.5 text-cyber-muted">{r.service}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="cyber-badge" style={{ background: `${STATUS_COLORS[r.status]}20`, color: STATUS_COLORS[r.status] }}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-cyber-muted">{r.responseTime}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {log.length > 0 && (
        <div>
          <label className="cyber-label">Scan Log</label>
          <div className="cyber-card p-3 max-h-32 overflow-y-auto space-y-0.5">
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
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
        </svg>
        <span>Real scan using HTTP fetch probes. Browser security may mark ports as "filtered" due to CORS. Only scan systems you own or have permission to test.</span>
      </div>
    </div>
  )
}
