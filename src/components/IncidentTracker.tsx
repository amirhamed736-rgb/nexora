import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Incident {
  id: string
  title: string
  severity: string
  status: string
  description: string
  affected_systems: string
  assigned_to: string
  team_mode: string
  created_at: string
  updated_at: string
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ff3366',
  high: '#ff6b35',
  medium: '#ffaa00',
  low: '#00d4ff',
}

const STATUS_COLORS: Record<string, string> = {
  open: '#ff3366',
  investigating: '#ffaa00',
  contained: '#00d4ff',
  resolved: '#00ff9d',
}

export default function IncidentTracker() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    severity: 'medium',
    status: 'open',
    description: '',
    affected_systems: '',
    assigned_to: '',
  })

  useEffect(() => {
    loadIncidents()
  }, [])

  async function loadIncidents() {
    setLoading(true)
    if (!supabase) {
      setIncidents([])
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('security_incidents')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error loading incidents:', error)
    }
    setIncidents(data || [])
    setLoading(false)
  }

  async function createIncident() {
    if (!form.title.trim() || !supabase) return
    const { data, error } = await supabase
      .from('security_incidents')
      .insert([form])
      .select()
    if (error) {
      console.error('Error creating incident:', error)
      return
    }
    if (data) setIncidents([data[0], ...incidents])
    setForm({ title: '', severity: 'medium', status: 'open', description: '', affected_systems: '', assigned_to: '' })
    setShowForm(false)
  }

  async function updateStatus(id: string, status: string) {
    if (!supabase) return
    const { error } = await supabase
      .from('security_incidents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      console.error('Error updating incident:', error)
      return
    }
    setIncidents(incidents.map(i => i.id === id ? { ...i, status } : i))
  }

  async function deleteIncident(id: string) {
    if (!supabase) return
    const { error } = await supabase
      .from('security_incidents')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('Error deleting incident:', error)
      return
    }
    setIncidents(incidents.filter(i => i.id !== id))
  }

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'open').length,
    investigating: incidents.filter(i => i.status === 'investigating').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    critical: incidents.filter(i => i.severity === 'critical').length,
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { label: 'Total', value: stats.total, color: '#d8e0ea' },
          { label: 'Open', value: stats.open, color: STATUS_COLORS.open },
          { label: 'Investigating', value: stats.investigating, color: STATUS_COLORS.investigating },
          { label: 'Resolved', value: stats.resolved, color: STATUS_COLORS.resolved },
          { label: 'Critical', value: stats.critical, color: SEVERITY_COLORS.critical },
        ].map(s => (
          <div key={s.label} className="cyber-card p-3 text-center">
            <div className="text-xl font-mono font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-2xs font-mono text-cyber-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <button onClick={() => setShowForm(!showForm)} className="cyber-btn cyber-btn-primary">
        {showForm ? 'Cancel' : '+ Report New Incident'}
      </button>

      {showForm && (
        <div className="cyber-card p-4 space-y-3 fade-in">
          <input
            type="text"
            placeholder="Incident title"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="cyber-input w-full font-mono text-[13px]"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="cyber-label">Severity</label>
              <select
                value={form.severity}
                onChange={e => setForm({ ...form, severity: e.target.value })}
                className="cyber-input-sm w-full font-mono"
              >
                {['low', 'medium', 'high', 'critical'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="cyber-label">Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="cyber-input-sm w-full font-mono"
              >
                {['open', 'investigating', 'contained', 'resolved'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <textarea
            placeholder="Description of the incident..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="cyber-input w-full h-24 font-mono text-[13px] leading-[1.6] resize-y"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="cyber-label">Affected Systems</label>
              <input
                type="text"
                placeholder="comma-separated"
                value={form.affected_systems}
                onChange={e => setForm({ ...form, affected_systems: e.target.value })}
                className="cyber-input-sm w-full font-mono"
              />
            </div>
            <div>
              <label className="cyber-label">Assigned To</label>
              <input
                type="text"
                placeholder="responder"
                value={form.assigned_to}
                onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                className="cyber-input-sm w-full font-mono"
              />
            </div>
          </div>
          <button onClick={createIncident} disabled={!form.title.trim()} className="cyber-btn cyber-btn-primary disabled:opacity-30">
            Create Incident
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-cyber-muted font-mono text-sm">Loading incidents...</div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-8 text-cyber-muted font-mono text-sm">
          No incidents reported. Click "Report New Incident" to create one.
        </div>
      ) : (
        <div className="space-y-2">
          {incidents.map(inc => (
            <div key={inc.id} className="cyber-card p-4 border-l-4 fade-in" style={{ borderLeftColor: SEVERITY_COLORS[inc.severity] }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-mono font-bold text-[13px] text-cyber-text-bright">{inc.title}</h4>
                  <div className="text-2xs text-cyber-muted mt-0.5">
                    {new Date(inc.created_at).toLocaleString()}
                  </div>
                </div>
                <span
                  className="cyber-badge shrink-0 ml-2"
                  style={{ background: `${SEVERITY_COLORS[inc.severity]}20`, color: SEVERITY_COLORS[inc.severity] }}
                >
                  {inc.severity}
                </span>
              </div>

              {inc.description && (
                <p className="text-xs text-cyber-text mb-2.5 leading-relaxed">{inc.description}</p>
              )}

              {inc.affected_systems && (
                <div className="text-2xs text-cyber-muted font-mono mb-1.5">
                  Systems: {inc.affected_systems}
                </div>
              )}

              {inc.assigned_to && (
                <div className="text-2xs text-cyber-muted font-mono mb-2">
                  Assigned: {inc.assigned_to}
                </div>
              )}

              <div className="flex items-center gap-2 mt-2.5">
                <select
                  value={inc.status}
                  onChange={e => updateStatus(inc.id, e.target.value)}
                  className="cyber-input-sm text-xs font-mono"
                  style={{ color: STATUS_COLORS[inc.status] }}
                >
                  {['open', 'investigating', 'contained', 'resolved'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => deleteIncident(inc.id)} className="cyber-btn cyber-btn-danger text-2xs ml-auto py-1.5">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
