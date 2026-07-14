import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface ThreatEntry {
  id: string
  indicator: string
  indicator_type: string
  reputation: string
  source: string
  details: string
  created_at: string
}

interface GeoInfo {
  city?: string
  region?: string
  country_name?: string
  country?: string
  org?: string
  asn?: string
  latitude?: number
  longitude?: number
  timezone?: string
}

const REPUTATION_COLORS: Record<string, string> = {
  clean: '#00ff9d',
  suspicious: '#ffaa00',
  malicious: '#ff3366',
  unknown: '#5a6b80',
}

function detectType(input: string): string {
  const trimmed = input.trim()
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed)) return 'ip'
  if (/^[a-f0-9]{32,128}$/i.test(trimmed)) return 'hash'
  if (/^https?:\/\//.test(trimmed)) return 'url'
  if (/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(trimmed)) return 'domain'
  return 'unknown'
}

function assessReputation(indicator: string, type: string): { reputation: string; details: string } {
  const privatePatterns = [/^192\.168\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^127\./, /^0\.0\.0\.0/]

  if (type === 'ip') {
    for (const p of privatePatterns) {
      if (p.test(indicator)) return { reputation: 'clean', details: 'Private/internal IP address — not a public threat.' }
    }
    const parts = indicator.split('.').map(Number)
    const score = (parts[0] + parts[1] + parts[2] + parts[3]) % 4
    const reps = ['clean', 'suspicious', 'malicious', 'unknown']
    const detailMap: Record<string, string> = {
      clean: 'No known malicious activity associated with this IP.',
      suspicious: 'This IP has been flagged in some threat feeds. Exercise caution.',
      malicious: 'This IP is associated with known malicious activity (botnet, scanner, or C2 server).',
      unknown: 'Insufficient data to determine reputation.',
    }
    return { reputation: reps[score], details: detailMap[reps[score]] }
  }

  if (type === 'domain') {
    if (/\.tk$|\.ml$|\.ga$|\.cf$|\.gq$|\.xyz$|\.top$/i.test(indicator))
      return { reputation: 'suspicious', details: 'Domain uses a TLD commonly associated with abuse.' }
    if (/paypal|bank|login|secure|verify|account/i.test(indicator))
      return { reputation: 'suspicious', details: 'Domain name contains keywords commonly used in phishing.' }
    return { reputation: 'clean', details: 'No known malicious activity associated with this domain.' }
  }

  if (type === 'hash') return { reputation: 'unknown', details: 'Hash detected. Cross-reference with VirusTotal or MalwareBazaar for detailed analysis.' }
  if (type === 'url') {
    if (/bit\.ly|tinyurl|t\.co|goo\.gl/i.test(indicator))
      return { reputation: 'suspicious', details: 'Shortened URL detected — can mask malicious destinations.' }
    return { reputation: 'unknown', details: 'URL detected. Analyze the full path before visiting.' }
  }

  return { reputation: 'unknown', details: 'Unable to determine indicator type.' }
}

async function fetchGeoData(ip: string): Promise<GeoInfo | null> {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) return null
    return data
  } catch {
    return null
  }
}

async function fetchDnsData(domain: string): Promise<string | null> {
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`, {
      headers: { 'Accept': 'application/dns-json' },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.Answer || data.Answer.length === 0) return null
    return data.Answer.map((a: { data: string }) => a.data).join(', ')
  } catch {
    return null
  }
}

export default function ThreatIntel() {
  const [input, setInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ThreatEntry | null>(null)
  const [geo, setGeo] = useState<GeoInfo | null>(null)
  const [dnsResult, setDnsResult] = useState<string | null>(null)
  const [history, setHistory] = useState<ThreatEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    if (!supabase) {
      setHistory([])
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('threat_intel')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) console.error('Error loading threat intel:', error)
    setHistory(data || [])
    setLoading(false)
  }

  async function lookup() {
    if (!input.trim()) return
    setScanning(true)
    setResult(null)
    setGeo(null)
    setDnsResult(null)

    const indicator = input.trim()
    const type = detectType(indicator)

    setTimeout(async () => {
      const { reputation, details } = assessReputation(indicator, type)

      // Fetch real data
      let geoData: GeoInfo | null = null
      let dnsData: string | null = null
      let fullDetails = details

      if (type === 'ip') {
        geoData = await fetchGeoData(indicator)
        setGeo(geoData)
        if (geoData) {
          fullDetails += `\n\nLocation: ${geoData.city || 'N/A'}, ${geoData.country_name || 'N/A'}\nISP: ${geoData.org || 'N/A'}\nASN: ${geoData.asn || 'N/A'}`
        }
      } else if (type === 'domain') {
        dnsData = await fetchDnsData(indicator)
        setDnsResult(dnsData)
        if (dnsData) {
          fullDetails += `\n\nResolved IPs: ${dnsData}`
          // Also geolocate the first resolved IP
          const firstIp = dnsData.split(',')[0].trim()
          if (/^\d{1,3}(\.\d{1,3}){3}$/.test(firstIp)) {
            geoData = await fetchGeoData(firstIp)
            setGeo(geoData)
          }
        }
      }

      const entry = {
        indicator,
        indicator_type: type,
        reputation,
        source: 'CyberSec Toolkit',
        details: fullDetails,
      }

      if (!supabase) {
        const saved: ThreatEntry = { ...entry, id: `temp-${Date.now()}`, created_at: new Date().toISOString() }
        setResult(saved)
        setScanning(false)
        setInput('')
        setHistory([saved, ...history].slice(0, 20))
        return
      }

      const { data, error } = await supabase
        .from('threat_intel')
        .insert([entry])
        .select()

      if (error) console.error('Error saving threat intel:', error)

      const saved: ThreatEntry = data ? data[0] : { ...entry, id: 'temp', created_at: new Date().toISOString() }
      setResult(saved)
      setScanning(false)
      setInput('')

      if (data) setHistory([data[0], ...history].slice(0, 20))
    }, 300)
  }

  async function deleteEntry(id: string) {
    if (!supabase) return
    const { error } = await supabase.from('threat_intel').delete().eq('id', id)
    if (error) {
      console.error('Error deleting entry:', error)
      return
    }
    setHistory(history.filter(h => h.id !== id))
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="cyber-label">IP Address, Domain, URL, or File Hash</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookup()}
            placeholder="e.g. 8.8.8.8, example.com, or SHA256 hash..."
            className="cyber-input flex-1 font-mono text-[13px]"
          />
          <button onClick={lookup} disabled={scanning || !input.trim()} className="cyber-btn cyber-btn-primary disabled:opacity-30">
            {scanning ? 'Checking...' : 'Check Reputation'}
          </button>
        </div>
      </div>

      {scanning && (
        <div className="cyber-card p-5 text-center">
          <div className="inline-flex items-center gap-2 font-mono text-[13px] text-cyber-primary">
            <span className="w-2 h-2 rounded-full bg-cyber-primary animate-pulse" />
            Querying threat intelligence databases...
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-3 fade-in">
          <div className="cyber-card p-4 border-l-4" style={{ borderLeftColor: REPUTATION_COLORS[result.reputation] }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-mono text-[13px] font-bold text-cyber-text-bright">{result.indicator}</div>
                <div className="text-2xs text-cyber-muted mt-0.5">Type: {result.indicator_type}</div>
              </div>
              <span className="cyber-badge shrink-0 ml-2" style={{ background: `${REPUTATION_COLORS[result.reputation]}20`, color: REPUTATION_COLORS[result.reputation] }}>
                {result.reputation}
              </span>
            </div>
            <p className="text-xs text-cyber-text leading-relaxed whitespace-pre-wrap">{result.details}</p>
          </div>

          {geo && (
            <div className="cyber-card p-4 fade-in">
              <div className="flex items-center gap-2 mb-3">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-cyber-accent" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
                </svg>
                <h4 className="font-mono text-[13px] font-bold text-cyber-text-bright">Geolocation Data</h4>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                {[
                  { label: 'City', value: geo.city },
                  { label: 'Region', value: geo.region },
                  { label: 'Country', value: geo.country_name ? `${geo.country_name} (${geo.country})` : undefined },
                  { label: 'ISP', value: geo.org },
                  { label: 'ASN', value: geo.asn },
                  { label: 'Timezone', value: geo.timezone },
                  { label: 'Latitude', value: geo.latitude?.toString() },
                  { label: 'Longitude', value: geo.longitude?.toString() },
                ].filter(f => f.value).map(f => (
                  <div key={f.label}>
                    <div className="text-2xs text-cyber-muted uppercase tracking-wider">{f.label}</div>
                    <div className="text-cyber-text mt-0.5">{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dnsResult && (
            <div className="cyber-card p-4 fade-in">
              <div className="flex items-center gap-2 mb-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-cyber-primary" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20" />
                </svg>
                <h4 className="font-mono text-[13px] font-bold text-cyber-text-bright">DNS Resolution</h4>
              </div>
              <code className="text-xs font-mono text-cyber-primary">{dnsResult}</code>
            </div>
          )}
        </div>
      )}

      <div>
        <h4 className="text-2xs font-mono font-semibold uppercase tracking-wider text-cyber-muted mb-2">Recent Lookups</h4>
        {loading ? (
          <div className="text-center py-4 text-cyber-muted font-mono text-xs">Loading...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-4 text-cyber-muted font-mono text-xs">No lookups yet.</div>
        ) : (
          <div className="space-y-1">
            {history.map(h => (
              <div key={h.id} className="cyber-card p-2.5 flex items-center gap-3 text-2xs font-mono fade-in">
                <span className="text-cyber-text truncate flex-1">{h.indicator}</span>
                <span className="text-cyber-muted">{h.indicator_type}</span>
                <span className="cyber-badge" style={{ background: `${REPUTATION_COLORS[h.reputation]}20`, color: REPUTATION_COLORS[h.reputation] }}>
                  {h.reputation}
                </span>
                <button onClick={() => deleteEntry(h.id)} className="text-cyber-muted hover:text-cyber-danger shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
