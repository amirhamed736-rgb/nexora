import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface ChatSession {
  id: string
  title: string
  created_at: string
}

interface Props {
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onNewChat: () => void
}

export default function ChatSidebar({ activeSessionId, onSelectSession, onNewChat }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    try {
      if (!supabase) {
        setSessions([])
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setSessions(data || [])
    } catch (e) {
      console.error('Failed to load sessions:', e)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-60 border-r border-cyber-border bg-cyber-surface/60 flex flex-col h-full shrink-0">
      {/* New Chat button */}
      <div className="px-3 pt-3 pb-3 border-b border-cyber-border">
        <button
          onClick={onNewChat}
          className="w-full cyber-btn cyber-btn-primary flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="text-2xs font-mono font-semibold uppercase tracking-wider text-cyber-muted/60 px-2 pb-2 pt-1">
          History
        </div>
        {loading ? (
          <div className="space-y-2 px-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-9 rounded-lg shimmer" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-2xs font-mono text-cyber-muted/50 text-center py-6 px-2 leading-relaxed">
            No saved sessions yet.<br />Start a new chat to begin.
          </div>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((session) => {
              const isActive = activeSessionId === session.id
              return (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg font-mono text-2xs transition-all duration-150 border ${
                    isActive
                      ? 'bg-cyber-primary/10 text-cyber-primary border-cyber-primary/20'
                      : 'text-cyber-muted hover:text-cyber-text hover:bg-cyber-card border-transparent'
                  }`}
                >
                  <div className="truncate font-medium">{session.title}</div>
                  <div className="text-2xs opacity-50 mt-0.5">
                    {new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 border-t border-cyber-border">
        <div className="text-2xs font-mono text-cyber-muted/50 text-center tracking-wider">
          CYBERSEC TOOLKIT v0.1.0
        </div>
      </div>
    </div>
  )
}
