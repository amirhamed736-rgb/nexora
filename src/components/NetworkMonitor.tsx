import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface NetworkLog {
  id: string
  source_ip: string
  dest_ip: string
  port: number
  protocol: string
  action: string
  threat_level: string
  notes: string
  created_at: string
}

const THREAT_COLORS: Record<string, string> = {
  none: '#5a6b80',
  low: '#00d4ff',
  medium: '#ffaa00',
  high: '#ff3366',
}

const ACTION_COLORS: Record<string, string> = {
  allowed: '#00d4ff',
  blocked: '#ff3366',
  flagged: '#ffaa00',
}

export default function NetworkMonitor() {
  const [logs, setLogs] = useState<NetworkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({
    source_ip: '',
    dest_ip: '',
    port: 0,
    protocol: 'TCP',
    action: 'flagged',
    threat_level: 'medium',
    notes: '',
  })

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs() {
    setLoading(true)
    if (!supabase) {
      setLogs([])
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('network_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) console.error('Error loading logs:', error)
    setLogs(data || [])
    setLoading(false)
  }

  async function addLog() {
    if (!form.source_ip || !form.dest_ip || !supabase) return
    const { data, error } = await supabase
      .from('network_logs')
      .insert([form])
      .select()
    if (error) {
      console.error('Error adding log:', error)
      return
    }
    if (data) setLogs([data[0], ...logs])
    setForm({ source_ip: '', dest_ip: '', port: 0, protocol: 'TCP', action: 'flagged', threat_level: 'medium', notes: '' })
    setShowForm(false)
  }

  async function deleteLog(id: string) {
    if (!supabase) return
    const { error } = await supabase.from('network_logs').delete().eq('id', id)
    if (error) {
      console.error('Error deleting log:', error)
      return
    }
    setLogs(logs.filter(l => l.id !== id))
  }

  async function clearAllLogs() {
    if (!supabase) return
    const { error } = await supabase.from('network_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) {
      console.error('Error clearing logs:', error)
      return
    }
    setLogs([])
  }

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.threat_level === filter)

  const stats = {
    total: logs.length,
    blocked: logs.filter(l => l.action === 'blocked').length,
    flagged: logs.filter(l => l.action === 'flagged').length,
    threats: logs.filter(l => l.threat_level === 'high' || l.threat_level === 'medium').length,
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: 'Total Events', value: stats.total, color: '#c8d3e0' },
          { label: 'Blocked', value: stats.blocked, color: '#ff3366' },
          { label: 'Flagged', value: stats.flagged, color: '#ffaa00' },
          { label: 'Threats', value: stats.threats, color: '#ff6b35' },
        ].map(s => (
          <div key={s.label} className="cyber-card p-3 text-center">
            <div className="text-lg font-mono font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-2xs font-mono text-cyber-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setShowForm(!showForm)} className="cyber-btn cyber-btn-primary">
          {showForm ? 'Cancel' : '+ Log Network Event'}
        </button>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="cyber-input-sm text-xs font-mono"
        >
          <option value="all">All Events</option>
          <option value="high">High Threat</option>
          <option value="medium">Medium Threat</option>
          <option value="low">Low Threat</option>
          <option value="none">No Threat</option>
        </select>
        {logs.length > 0 && (
          <button onClick={clearAllLogs} className="cyber-btn cyber-btn-danger text-xs ml-auto">
            Clear All
          </button>
        )}
      </div>

      {showForm && (
        <div className="cyber-card p-4 space-y-3 fade-in">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="cyber-label">Source IP</label>
              <input type="text" placeholder="192.168.1.1" value={form.source_ip} onChange={e => setForm({ ...form, source_ip: e.target.value })} className="cyber-input-sm w-full font-mono" />
            </div>
            <div>
              <label className="cyber-label">Dest IP</label>
              <input type="text" placeholder="10.0.0.1" value={form.dest_ip} onChange={e => setForm({ ...form, dest_ip: e.target.value })} className="cyber-input-sm w-full font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="cyber-label">Port</label>
              <input type="number" placeholder="443" value={form.port || ''} onChange={e => setForm({ ...form, port: parseInt(e.target.value) || 0 })} className="cyber-input-sm w-full font-mono" />
            </div>
            <div>
              <label className="cyber-label">Protocol</label>
              <select value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })} className="cyber-input-sm w-full font-mono">
                {['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="cyber-label">Action</label>
              <select value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} className="cyber-input-sm w-full font-mono">
                {['allowed', 'blocked', 'flagged'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="cyber-label">Threat Level</label>
            <select value={form.threat_level} onChange={e => setForm({ ...form, threat_level: e.target.value })} className="cyber-input-sm w-full font-mono">
              {['none', 'low', 'medium', 'high'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <input type="text" placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="cyber-input-sm w-full font-mono" />
          <button onClick={addLog} disabled={!form.source_ip || !form.dest_ip} className="cyber-btn cyber-btn-primary disabled:opacity-30">
            Log Event
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-cyber-muted font-mono text-sm">Loading network logs...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-8 text-cyber-muted font-mono text-sm">
          No network events logged.
        </div>
      ) : (
        <div className="space-y-1">
          {filteredLogs.map(log => (
            <div key={log.id} className="cyber-card p-2.5 flex items-center gap-3 fade-in text-2xs font-mono">
              <span className="text-cyber-muted whitespace-nowrap">{new Date(log.created_at).toLocaleTimeString()}</span>
              <span className="text-cyber-text">{log.source_ip}</span>
              <span className="text-cyber-muted">→</span>
              <span className="text-cyber-text">{log.dest_ip}:{log.port}</span>
              <span className="text-cyber-muted">{log.protocol}</span>
              <span
                className="cyber-badge"
                style={{ background: `${ACTION_COLORS[log.action]}20`, color: ACTION_COLORS[log.action] }}
              >
                {log.action}
              </span>
              <span
                className="cyber-badge"
                style={{ background: `${THREAT_COLORS[log.threat_level]}20`, color: THREAT_COLORS[log.threat_level] }}
              >
                {log.threat_level}
              </span>
              {log.notes && <span className="text-cyber-muted truncate flex-1">{log.notes}</span>}
              <button onClick={() => deleteLog(log.id)} className="text-cyber-muted hover:text-cyber-danger ml-auto shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
