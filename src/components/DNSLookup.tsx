import { useState } from 'react'

interface DNSRecord {
  type: string
  name: string
  TTL: number
  data: string
}

const DOH_ENDPOINTS = [
  { name: 'Cloudflare', url: 'https://cloudflare-dns.com/dns-query' },
  { name: 'Google', url: 'https://dns.google/resolve' },
]

export default function DNSLookup() {
  const [domain, setDomain] = useState('')
  const [recordType, setRecordType] = useState('A')
  const [provider, setProvider] = useState(0)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<DNSRecord[]>([])
  const [error, setError] = useState('')

  async function lookup() {
    if (!domain.trim()) return
    setLoading(true)
    setError('')
    setResults([])

    try {
      const doh = DOH_ENDPOINTS[provider]
      const url = `${doh.url}?name=${encodeURIComponent(domain)}&type=${recordType}`

      const response = await fetch(url, {
        headers: { 'Accept': 'application/dns-json' },
      })

      if (!response.ok) throw new Error(`DNS query failed: ${response.status}`)

      const data = await response.json()
      if (!data.Answer || data.Answer.length === 0) {
        setError(`No ${recordType} records found for ${domain}`)
        setLoading(false)
        return
      }

      const records: DNSRecord[] = data.Answer.map((a: { type: number; name: string; TTL: number; data: string }) => ({
        type: rtypeName(a.type),
        name: a.name,
        TTL: a.TTL,
        data: a.data,
      }))

      setResults(records)
    } catch (e) {
      setError(`Error: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  function rtypeName(num: number): string {
    const map: Record<number, string> = {
      1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 15: 'MX',
      16: 'TXT', 28: 'AAAA', 33: 'SRV', 257: 'CAA',
    }
    return map[num] || `TYPE${num}`
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="cyber-label">Domain Name</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookup()}
            placeholder="example.com"
            className="cyber-input flex-1 font-mono text-[13px]"
          />
          <button onClick={lookup} disabled={loading || !domain.trim()} className="cyber-btn cyber-btn-primary disabled:opacity-30">
            {loading ? 'Resolving...' : 'Lookup'}
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex rounded-md overflow-hidden border border-cyber-border">
          {['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SRV', 'CAA'].map(t => (
            <button
              key={t}
              onClick={() => setRecordType(t)}
              className={`px-3 py-1.5 font-mono text-xs transition-colors ${
                recordType === t ? 'bg-cyber-primary/20 text-cyber-primary' : 'bg-cyber-surface text-cyber-muted hover:text-cyber-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex rounded-md overflow-hidden border border-cyber-border">
          {DOH_ENDPOINTS.map((d, i) => (
            <button
              key={d.name}
              onClick={() => setProvider(i)}
              className={`px-3 py-1.5 font-mono text-xs transition-colors ${
                provider === i ? 'bg-cyber-accent/20 text-cyber-accent' : 'bg-cyber-surface text-cyber-muted hover:text-cyber-text'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="cyber-card p-3 text-xs font-mono text-cyber-danger border-cyber-danger/30 fade-in">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="cyber-card overflow-hidden fade-in">
          <table className="w-full text-xs font-mono">
            <thead className="bg-cyber-surface border-b border-cyber-border">
              <tr>
                <th className="text-left px-3.5 py-2.5 text-2xs text-cyber-muted font-semibold uppercase tracking-wider">Type</th>
                <th className="text-left px-3.5 py-2.5 text-2xs text-cyber-muted font-semibold uppercase tracking-wider">Name</th>
                <th className="text-left px-3.5 py-2.5 text-2xs text-cyber-muted font-semibold uppercase tracking-wider">TTL</th>
                <th className="text-left px-3.5 py-2.5 text-2xs text-cyber-muted font-semibold uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-b border-cyber-border/40 hover:bg-cyber-surface/50 transition-colors">
                  <td className="px-3.5 py-2.5 text-cyber-primary font-semibold">{r.type}</td>
                  <td className="px-3.5 py-2.5 text-cyber-text">{r.name}</td>
                  <td className="px-3.5 py-2.5 text-cyber-muted">{r.TTL}s</td>
                  <td className="px-3.5 py-2.5 text-cyber-text break-all">{r.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-2xs text-cyber-muted font-mono bg-cyber-surface/50 rounded-lg p-3 leading-relaxed">
        Uses DNS-over-HTTPS (DoH) for encrypted DNS queries. Records resolved via {DOH_ENDPOINTS[provider].name} DNS resolver.
      </div>
    </div>
  )
}
