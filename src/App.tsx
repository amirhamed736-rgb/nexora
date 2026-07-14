import { lazy, Suspense, useState } from 'react'
import BinaryRain from './components/BinaryRain'
import Navbar from './components/Navbar'
import TeamSelector from './components/TeamSelector'
import ChatSidebar from './components/ChatSidebar'
import AICommandCenter from './components/AICommandCenter'
import type { Team } from './components/TeamSelector'

const HeaderAnalyzer = lazy(() => import('./components/HeaderAnalyzer'))
const EncoderDecoder = lazy(() => import('./components/EncoderDecoder'))
const PortScanner = lazy(() => import('./components/PortScanner'))
const HashTools = lazy(() => import('./components/HashTools'))
const VulnerabilityScanner = lazy(() => import('./components/VulnerabilityScanner'))
const PasswordTools = lazy(() => import('./components/PasswordTools'))
const IncidentTracker = lazy(() => import('./components/IncidentTracker'))
const NetworkMonitor = lazy(() => import('./components/NetworkMonitor'))
const ThreatIntel = lazy(() => import('./components/ThreatIntel'))
const FirewallBuilder = lazy(() => import('./components/FirewallBuilder'))
const DNSLookup = lazy(() => import('./components/DNSLookup'))
const SecurityAudit = lazy(() => import('./components/SecurityAudit'))
const PasswordCracker = lazy(() => import('./components/PasswordCracker'))

type Tool = 'dashboard' | 'header-analyzer' | 'encoder-decoder' | 'port-scanner' | 'hash-tools' | 'vuln-scanner' | 'password-tools' | 'password-cracker' | 'incident-tracker' | 'network-monitor' | 'threat-intel' | 'firewall-builder' | 'dns-lookup' | 'security-audit'

interface ToolDef {
  id: Tool
  name: string
  icon: (props: { className?: string }) => JSX.Element
  description: string
  category: 'offensive' | 'defensive' | 'utility'
}

const icon = (path: string) => ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
)

const TOOLS: ToolDef[] = [
  { id: 'vuln-scanner', name: 'Vuln Scanner', icon: icon('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 8v4M12 16h.01'), description: 'Scan for common vulnerabilities', category: 'offensive' },
  { id: 'password-cracker', name: 'Password Cracker', icon: icon('M8 11V7a4 4 0 0 1 8 0v4M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM9 14l2 2 4-4'), description: 'Crack password hashes (dictionary/brute/rainbow)', category: 'offensive' },
  { id: 'port-scanner', name: 'Port Scanner', icon: icon('M5 12a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM7 10V7a5 5 0 0 1 10 0v3M12 14v2'), description: 'Real network port scanning', category: 'offensive' },
  { id: 'header-analyzer', name: 'Header Analyzer', icon: icon('M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4M9 3v4h6V3M9 13h6M9 17h4'), description: 'Analyze HTTP security headers', category: 'defensive' },
  { id: 'password-tools', name: 'Password Tools', icon: icon('M8 11V7a4 4 0 0 1 8 0v4M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z'), description: 'Generate & analyze passwords', category: 'defensive' },
  { id: 'incident-tracker', name: 'Incident Tracker', icon: icon('M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01'), description: 'Track security incidents', category: 'defensive' },
  { id: 'network-monitor', name: 'Network Monitor', icon: icon('M3 12h4l3-9 4 18 3-9h4'), description: 'Log & monitor network events', category: 'defensive' },
  { id: 'threat-intel', name: 'Threat Intel', icon: icon('M11 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 21l-4.35-4.35M11 8h.01'), description: 'Check IP/domain reputation', category: 'defensive' },
  { id: 'firewall-builder', name: 'Firewall Builder', icon: icon('M4 4h16v16H4zM4 8h16M8 4v16M16 4v16'), description: 'Build & export firewall rules', category: 'defensive' },
  { id: 'security-audit', name: 'Security Audit', icon: icon('M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'), description: 'Security checklists & compliance', category: 'defensive' },
  { id: 'encoder-decoder', name: 'Encoder/Decoder', icon: icon('M16 3l4 4-4 4M8 21l-4-4 4-4M3 7h6M21 17h-6'), description: 'Base64, URL, Hex encoding', category: 'utility' },
  { id: 'hash-tools', name: 'Hash Tools', icon: icon('M4 9h16M4 15h16M10 3L8 21M16 3l-2 18'), description: 'Generate SHA hashes', category: 'utility' },
  { id: 'dns-lookup', name: 'DNS Lookup', icon: icon('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20'), description: 'DNS queries over HTTPS', category: 'utility' },
]

const CATEGORY_COLORS: Record<string, string> = {
  offensive: '#ff3366',
  defensive: '#00d4ff',
  utility: '#00ff9d',
}

const CATEGORY_LABELS: Record<string, string> = {
  offensive: 'Offensive',
  defensive: 'Defensive',
  utility: 'Utility',
}

export default function App() {
  const [team, setTeam] = useState<Team>('red')
  const [activeTool, setActiveTool] = useState<Tool>('dashboard')
  const [toolInput, setToolInput] = useState('')

  const activeToolName = TOOLS.find(t => t.id === activeTool)?.name || 'Dashboard'

  function selectTool(tool: Tool) {
    setActiveTool(tool)
    setToolInput('')
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <BinaryRain />

      <div className="relative z-10 flex flex-col h-screen">
        <Navbar team={team} onTeamChange={setTeam} activeTool={activeToolName} />

        <div className="flex flex-1 overflow-hidden max-lg:flex-col">
          <ChatSidebar
            activeSessionId={null}
            onSelectSession={() => {}}
            onNewChat={() => selectTool('dashboard')}
          />

          <div className="flex-1 flex overflow-hidden">
            {/* Left panel - Tools */}
            <div className="w-full border-b border-cyber-border bg-cyber-surface/40 overflow-y-auto p-2.5 shrink-0 lg:w-64 lg:border-b-0 lg:border-r">
              {/* Dashboard button */}
              <button
                onClick={() => selectTool('dashboard')}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-200 ${
                  activeTool === 'dashboard'
                    ? 'bg-cyber-primary/10 border-cyber-primary/25 text-cyber-primary'
                    : 'bg-cyber-card border-cyber-border text-cyber-text hover:border-cyber-border-light'
                }`}
              >
                <div className="font-mono text-[13px] font-bold flex items-center gap-2.5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12l9-9 9 9M5 10v10h14V10M9 20v-6h6v6" />
                  </svg>
                  Dashboard
                </div>
              </button>

              {/* Tools by category */}
              {(['offensive', 'defensive', 'utility'] as const).map(cat => (
                <div key={cat} className="pt-3">
                  <div className="flex items-center gap-1.5 px-2 pb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />
                    <span className="text-2xs font-mono font-semibold uppercase tracking-wider text-cyber-muted">
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <div className="flex-1 h-px bg-cyber-border/50" />
                  </div>
                  <div className="space-y-1">
                    {TOOLS.filter(t => t.category === cat).map(tool => {
                      const Icon = tool.icon
                      const isActive = activeTool === tool.id
                      return (
                        <button
                          key={tool.id}
                          onClick={() => selectTool(tool.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-200 group ${
                            isActive
                              ? 'bg-cyber-primary/10 border-cyber-primary/25 text-cyber-primary'
                              : 'bg-cyber-card border-cyber-border text-cyber-text hover:border-cyber-border-light'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-mono text-[13px] font-bold leading-tight">{tool.name}</div>
                              <div className="text-2xs text-cyber-muted mt-0.5 truncate">{tool.description}</div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Team selector */}
              <div className="pt-3 mt-2 border-t border-cyber-border">
                <label className="cyber-label px-1">Team Mode</label>
                <TeamSelector selected={team} onSelect={setTeam} />
              </div>
            </div>

            {/* Middle panel - Active tool */}
            <div className="flex-1 overflow-y-auto">
              {activeTool === 'dashboard' && (
                <div className="p-6 max-w-5xl mx-auto space-y-6 fade-in">
                  {/* Hero */}
                  <div>
                    <h2 className="text-2xl font-mono font-bold text-cyber-text-bright tracking-tight mb-1.5">
                      CyberSec Toolkit
                    </h2>
                    <p className="text-sm text-cyber-muted leading-relaxed max-w-2xl">
                      A comprehensive security toolkit for ethical hacking, network defense, and security analysis.
                      Select a tool from the left panel, or chat with the AI assistant on the right.
                    </p>
                  </div>

                  {/* Tool grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {TOOLS.map(tool => {
                      const Icon = tool.icon
                      return (
                        <button
                          key={tool.id}
                          onClick={() => selectTool(tool.id)}
                          className="cyber-card cyber-card-hover p-4 text-left group"
                        >
                          <div className="flex items-center gap-3 mb-2.5">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                              style={{ background: `${CATEGORY_COLORS[tool.category]}12`, color: CATEGORY_COLORS[tool.category] }}
                            >
                              <Icon className="w-4.5 h-4.5" />
                            </div>
                            <h3 className="font-mono font-bold text-[13px] text-cyber-text group-hover:text-cyber-primary transition-colors">
                              {tool.name}
                            </h3>
                          </div>
                          <p className="text-2xs text-cyber-muted leading-relaxed">{tool.description}</p>
                          <div className="mt-2.5 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full" style={{ background: CATEGORY_COLORS[tool.category] }} />
                            <span className="text-2xs font-mono uppercase tracking-wider font-semibold" style={{ color: CATEGORY_COLORS[tool.category] }}>
                              {tool.category}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Security tips */}
                  <div className="cyber-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-cyber-warning" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                      </svg>
                      <h3 className="font-mono text-sm font-bold text-cyber-text">Security Tips</h3>
                    </div>
                    <ul className="space-y-2 text-xs text-cyber-muted leading-relaxed">
                      <li className="flex gap-2"><span className="text-cyber-primary">→</span> Always obtain explicit permission before testing any system</li>
                      <li className="flex gap-2"><span className="text-cyber-primary">→</span> Use these tools for educational purposes and authorized testing only</li>
                      <li className="flex gap-2"><span className="text-cyber-primary">→</span> Keep your tools and knowledge up to date with latest security trends</li>
                      <li className="flex gap-2"><span className="text-cyber-primary">→</span> Follow responsible disclosure practices for any vulnerabilities found</li>
                      <li className="flex gap-2"><span className="text-cyber-primary">→</span> Document all findings and maintain an audit trail</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Tool views */}
              {activeTool !== 'dashboard' && (
                <div className="p-6 max-w-3xl mx-auto fade-in">
                  <div className="flex items-center gap-3 mb-5">
                    {(() => {
                      const tool = TOOLS.find(t => t.id === activeTool)
                      if (!tool) return null
                      const Icon = tool.icon
                      const color = CATEGORY_COLORS[tool.category]
                      return (
                        <>
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${color}12`, color }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h2 className="text-lg font-mono font-bold text-cyber-text-bright leading-tight">{tool.name}</h2>
                            <p className="text-2xs text-cyber-muted mt-0.5">{tool.description}</p>
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  {activeTool === 'header-analyzer' && (
                    <Suspense fallback={<div className="cyber-card p-6 text-sm text-cyber-muted">Loading tool...</div>}>
                      <HeaderAnalyzer onAnalyze={(h) => setToolInput(h)} loading={false} result={null} />
                    </Suspense>
                  )}
                  {activeTool === 'encoder-decoder' && (
                    <Suspense fallback={<div className="cyber-card p-6 text-sm text-cyber-muted">Loading tool...</div>}>
                      <EncoderDecoder onProcess={() => {}} result={null} />
                    </Suspense>
                  )}
                  {activeTool === 'port-scanner' && (
                    <Suspense fallback={<div className="cyber-card p-6 text-sm text-cyber-muted">Loading tool...</div>}>
                      <PortScanner />
                    </Suspense>
                  )}
                  {activeTool === 'hash-tools' && (
                    <Suspense fallback={<div className="cyber-card p-6 text-sm text-cyber-muted">Loading tool...</div>}>
                      <HashTools onHash={() => {}} result={null} />
                    </Suspense>
                  )}
                  {activeTool === 'vuln-scanner' && (
                    <Suspense fallback={<div className="cyber-card p-6 text-sm text-cyber-muted">Loading tool...</div>}>
                      <VulnerabilityScanner />
                    </Suspense>
                  )}
                  {activeTool === 'password-tools' && (
                    <Suspense fallback={<div className="cyber-card p-6 text-sm text-cyber-muted">Loading tool...</div>}>
                      <PasswordTools />
                    </Suspense>
                  )}
                  {activeTool === 'incident-tracker' && (
                    <Suspense fallback={<div className="cyber-card p-6 text-sm text-cyber-muted">Loading tool...</div>}>
                      <IncidentTracker />
                    </Suspense>
                  )}
                  {activeTool === 'network-monitor' && (
                    <Suspense fallback={<div className="cyber-card p-6 text-sm text-cyber-muted">Loading tool...</div>}>
                      <NetworkMonitor />
                    </Suspense>
                  )}
                  {activeTool === 'threat-intel' && (
                    <Suspense fallback={<div className="cyber-card p-6 text-sm text-cyber-muted">Loading tool...</div>}>
                      <ThreatIntel />
                    </Suspense>
                  )}
                  {activeTool === 'firewall-builder' && (
                    <Suspense fallback={<div className="cyber-card p-6 text-sm text-cyber-muted">Loading tool...</div>}>
                      <FirewallBuilder />
                    </Suspense>
                  )}
                  {activeTool === 'dns-lookup' && (
                    <Suspense fallback={<div className="cyber-card p-6 text-sm text-cyber-muted">Loading tool...</div>}>
                      <DNSLookup />
                    </Suspense>
                  )}
                  {activeTool === 'security-audit' && (
                    <Suspense fallback={<div className="cyber-card p-6 text-sm text-cyber-muted">Loading tool...</div>}>
                      <SecurityAudit />
                    </Suspense>
                  )}
                  {activeTool === 'password-cracker' && (
                    <Suspense fallback={<div className="cyber-card p-6 text-sm text-cyber-muted">Loading tool...</div>}>
                      <PasswordCracker />
                    </Suspense>
                  )}
                </div>
              )}
            </div>

            {/* Right panel - AI Assistant */}
            <div className="w-full border-t border-cyber-border bg-cyber-surface/30 shrink-0 lg:w-80 lg:border-t-0 lg:border-l">
              <div className="border-b border-cyber-border px-4 h-12 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyber-primary animate-pulse" />
                <h3 className="font-mono text-[13px] font-bold text-cyber-text tracking-wide">AI Assistant</h3>
              </div>
              <div className="h-[calc(100%-3rem)]">
                <AICommandCenter tool={activeTool} toolInput={toolInput} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
