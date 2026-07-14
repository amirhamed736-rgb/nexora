import { useState } from 'react'

type Team = 'red' | 'blue' | 'purple'

interface TeamConfig {
  id: Team
  name: string
  shortName: string
  color: string
  description: string
  icon: string
}

const TEAMS: TeamConfig[] = [
  {
    id: 'red',
    name: 'Red Team',
    shortName: 'RED',
    color: '#ff3366',
    description: 'Offensive — simulate attacks & find vulnerabilities',
    icon: '⚔',
  },
  {
    id: 'blue',
    name: 'Blue Team',
    shortName: 'BLUE',
    color: '#00d4ff',
    description: 'Defensive — detect, respond & defend',
    icon: '◈',
  },
  {
    id: 'purple',
    name: 'Purple Team',
    shortName: 'PURPLE',
    color: '#a855f7',
    description: 'Collaborative — combine red & blue',
    icon: '◆',
  },
]

interface Props {
  selected: Team
  onSelect: (team: Team) => void
}

export default function TeamSelector({ selected, onSelect }: Props) {
  const [hovered, setHovered] = useState<Team | null>(null)

  return (
    <div className="flex gap-2">
      {TEAMS.map((team) => {
        const isActive = selected === team.id
        const isHovered = hovered === team.id
        return (
          <button
            key={team.id}
            onClick={() => onSelect(team.id)}
            onMouseEnter={() => setHovered(team.id)}
            onMouseLeave={() => setHovered(null)}
            className="flex-1 p-2.5 rounded-lg border text-left transition-all duration-200 overflow-hidden"
            style={
              isActive
                ? { background: `${team.color}12`, borderColor: `${team.color}50`, color: team.color, boxShadow: `0 0 12px ${team.color}15` }
                : { background: '#101822', borderColor: '#1a2433', color: '#5a6b80' }
            }
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm" style={{ color: isActive ? team.color : undefined }}>{team.icon}</span>
              <span className="font-mono font-bold text-2xs tracking-wider">{team.shortName}</span>
            </div>
            <p className="text-2xs leading-tight opacity-70 truncate">{team.description}</p>
            <div
              className="mt-1.5 h-px rounded-full transition-all duration-300"
              style={{
                background: isActive || isHovered ? team.color : 'transparent',
                width: isActive ? '100%' : isHovered ? '60%' : '0%',
              }}
            />
          </button>
        )
      })}
    </div>
  )
}

export { TEAMS }
export type { Team }
