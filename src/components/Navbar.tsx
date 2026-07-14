import type { Team } from './TeamSelector'
import { TEAMS } from './TeamSelector'

interface Props {
  team: Team
  onTeamChange: (team: Team) => void
  activeTool: string
}

export default function Navbar({ team, onTeamChange, activeTool }: Props) {
  const currentTeam = TEAMS.find((t) => t.id === team)!

  return (
    <header className="relative z-20 border-b border-cyber-border bg-cyber-surface/90 backdrop-blur-xl">
      <div className="px-5 h-14 flex items-center justify-between">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300"
              style={{ background: `${currentTeam.color}15`, color: currentTeam.color, boxShadow: `0 0 12px ${currentTeam.color}20` }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-cyber-surface transition-colors duration-300"
              style={{ background: currentTeam.color }}
            />
          </div>
          <div className="flex flex-col">
            <h1 className="font-mono font-bold text-cyber-text-bright text-[13px] tracking-wider leading-tight">
              CYBER<span style={{ color: currentTeam.color }}>SEC</span> TOOLKIT
            </h1>
            <p className="text-2xs text-cyber-muted font-mono leading-tight mt-0.5">{activeTool}</p>
          </div>
        </div>

        {/* Team Switcher */}
        <div className="flex items-center gap-1.5">
          {TEAMS.map((t) => {
            const isActive = team === t.id
            return (
              <button
                key={t.id}
                onClick={() => onTeamChange(t.id)}
                className="group relative px-3.5 py-1.5 rounded-lg font-mono text-2xs font-bold tracking-wider transition-all duration-200"
                style={
                  isActive
                    ? { background: t.color, color: '#070a0f', boxShadow: `0 0 10px ${t.color}40` }
                    : { color: '#5a6b80', background: '#101822' }
                }
              >
                {t.name.split(' ')[0].toUpperCase()}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
