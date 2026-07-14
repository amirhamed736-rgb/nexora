import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface AuditItem {
  text: string
  checked: boolean
}

interface Checklist {
  id: string
  name: string
  category: string
  items: AuditItem[]
  created_at: string
  updated_at: string
}

const DEFAULT_CHECKLISTS: { name: string; category: string; items: AuditItem[] }[] = [
  {
    name: 'Network Security Audit',
    category: 'network',
    items: [
      { text: 'All firewalls are configured and active', checked: false },
      { text: 'Default credentials changed on all network devices', checked: false },
      { text: 'Unnecessary ports and services are closed', checked: false },
      { text: 'Network segmentation is implemented', checked: false },
      { text: 'IDS/IPS is deployed and monitoring', checked: false },
      { text: 'VPN requires MFA for access', checked: false },
      { text: 'Wireless networks use WPA3 or WPA2-Enterprise', checked: false },
      { text: 'Network traffic encryption (TLS) is enforced', checked: false },
      { text: 'DNS filtering is configured', checked: false },
      { text: 'Logging and SIEM integration is active', checked: false },
    ],
  },
  {
    name: 'System Hardening Audit',
    category: 'system',
    items: [
      { text: 'OS updates and security patches are current', checked: false },
      { text: 'Antimalware/EDR is installed and updated', checked: false },
      { text: 'Disk encryption (BitLocker/LUKS) is enabled', checked: false },
      { text: 'Screen lock with timeout is configured', checked: false },
      { text: 'Guest accounts are disabled', checked: false },
      { text: 'Remote desktop requires MFA', checked: false },
      { text: 'Unused software is removed', checked: false },
      { text: 'Secure boot is enabled', checked: false },
      { text: 'Automatic updates are configured', checked: false },
      { text: 'Service accounts have minimal privileges', checked: false },
    ],
  },
  {
    name: 'Web Application Security Audit',
    category: 'web',
    items: [
      { text: 'HTTPS is enforced with valid TLS certificate', checked: false },
      { text: 'HSTS header is configured', checked: false },
      { text: 'Content-Security-Policy header is set', checked: false },
      { text: 'X-Frame-Options header prevents clickjacking', checked: false },
      { text: 'X-Content-Type-Options is set to nosniff', checked: false },
      { text: 'Input validation on all forms', checked: false },
      { text: 'Parameterized queries prevent SQL injection', checked: false },
      { text: 'Output encoding prevents XSS', checked: false },
      { text: 'CSRF tokens on all state-changing requests', checked: false },
      { text: 'Rate limiting on authentication endpoints', checked: false },
      { text: 'Security headers are tested and verified', checked: false },
      { text: 'File upload restrictions are in place', checked: false },
    ],
  },
  {
    name: 'Access Control Audit',
    category: 'system',
    items: [
      { text: 'Principle of least privilege is enforced', checked: false },
      { text: 'User access reviews are performed quarterly', checked: false },
      { text: 'MFA is enabled for all privileged accounts', checked: false },
      { text: 'Password policy enforces 12+ character minimum', checked: false },
      { text: 'Failed login attempts are rate-limited', checked: false },
      { text: 'Account lockout policy is configured', checked: false },
      { text: 'Session timeout is configured', checked: false },
      { text: 'Privileged access is logged and monitored', checked: false },
      { text: 'Offboarding process revokes access promptly', checked: false },
      { text: 'Service account credentials are rotated', checked: false },
    ],
  },
]

const CATEGORY_COLORS: Record<string, string> = {
  network: '#00d4ff',
  system: '#00ff9d',
  web: '#ffaa00',
  app: '#ff6b35',
}

export default function SecurityAudit() {
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    loadChecklists()
  }, [])

  async function loadChecklists() {
    if (!supabase) {
      setChecklists(DEFAULT_CHECKLISTS.map((c, i) => ({ ...c, id: `temp-${i}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })))
      setActiveId('temp-0')
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('audit_checklists')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      const inserts = DEFAULT_CHECKLISTS.map(c => ({
        name: c.name,
        category: c.category,
        items: c.items,
      }))
      const { data: inserted } = await supabase
        .from('audit_checklists')
        .insert(inserts)
        .select()

      if (inserted) {
        setChecklists(inserted as Checklist[])
        setActiveId(inserted[0].id)
      } else {
        setChecklists(DEFAULT_CHECKLISTS.map((c, i) => ({ ...c, id: `temp-${i}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })))
        setActiveId(`temp-0`)
      }
    } else {
      setChecklists(data as Checklist[])
      setActiveId(data[0].id)
    }
    setLoading(false)
  }

  async function toggleItem(checklistId: string, index: number) {
    const checklist = checklists.find(c => c.id === checklistId)
    if (!checklist) return

    const newItems = checklist.items.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item
    )

    setChecklists(checklists.map(c =>
      c.id === checklistId ? { ...c, items: newItems } : c
    ))

    if (checklistId.startsWith('temp-') || !supabase) return

    const { error } = await supabase
      .from('audit_checklists')
      .update({ items: newItems, updated_at: new Date().toISOString() })
      .eq('id', checklistId)

    if (error) console.error('Error updating checklist:', error)
  }

  const activeChecklist = checklists.find(c => c.id === activeId)
  const completedCount = activeChecklist?.items.filter(i => i.checked).length || 0
  const totalCount = activeChecklist?.items.length || 0
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {checklists.map(cl => (
          <button
            key={cl.id}
            onClick={() => setActiveId(cl.id)}
            className={`px-3 py-2 rounded-md font-mono text-xs transition-all border ${
              activeId === cl.id
                ? 'bg-cyber-primary/10 text-cyber-primary border-cyber-primary/30'
                : 'bg-cyber-card text-cyber-muted border-cyber-border hover:text-cyber-text'
            }`}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-2"
              style={{ background: CATEGORY_COLORS[cl.category] }}
            />
            {cl.name}
          </button>
        ))}
      </div>

      {activeChecklist && (
        <>
          <div className="cyber-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-mono text-[13px] font-bold text-cyber-text-bright">{activeChecklist.name}</h4>
              <span className="font-mono text-2xs text-cyber-muted">
                {completedCount}/{totalCount} ({progress}%)
              </span>
            </div>
            <div className="h-2 bg-cyber-surface rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: progress === 100 ? '#00ff9d' : progress >= 50 ? '#00d4ff' : '#ffaa00',
                }}
              />
            </div>
          </div>

          <div className="space-y-1">
            {activeChecklist.items.map((item, i) => (
              <button
                key={i}
                onClick={() => toggleItem(activeChecklist.id, i)}
                className={`w-full text-left p-3 rounded-md border transition-all flex items-center gap-3 ${
                  item.checked
                    ? 'bg-cyber-primary/5 border-cyber-primary/20'
                    : 'bg-cyber-card border-cyber-border hover:border-cyber-border/60'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded border flex items-center justify-center text-xs font-bold ${
                    item.checked
                      ? 'bg-cyber-primary/20 border-cyber-primary text-cyber-primary'
                      : 'border-cyber-border text-transparent'
                  }`}
                >
                  {item.checked ? '✓' : ''}
                </span>
                <span className={`text-[13px] font-mono ${item.checked ? 'text-cyber-muted line-through' : 'text-cyber-text'}`}>
                  {item.text}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {loading && (
        <div className="text-center py-8 text-cyber-muted font-mono text-sm">Loading checklists...</div>
      )}
    </div>
  )
}
