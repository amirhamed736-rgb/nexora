import { useState, useRef, useEffect } from 'react'
import { getAIResponse, QUICK_PROMPTS } from '../lib/aiEngine'

interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestions?: string[]
}

interface Props {
  tool: string
  toolInput: string
  extraData?: Record<string, string>
}

export default function AICommandCenter({ tool, toolInput, extraData }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome to CyberSec AI. I can help you understand vulnerabilities, analyze results, and provide security guidance. Ask me anything or use the tools on the left.",
      suggestions: QUICK_PROMPTS.slice(0, 4),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (toolInput && toolInput.trim()) {
      processToolInput()
    }
  }, [toolInput])

  async function processToolInput() {
    setLoading(true)
    const response = await getAIResponse({ tool, input: toolInput, extraData })
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: response.text, suggestions: response.suggestions },
    ])
    setLoading(false)
  }

  async function sendMessage(text?: string) {
    const msg = (text || input).trim()
    if (!msg) return

    setMessages((prev) => [...prev, { role: 'user', content: msg }])
    setInput('')
    setLoading(true)

    const response = await getAIResponse({ tool: 'default', input: msg })
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: response.text, suggestions: response.suggestions },
    ])
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`fade-in flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-xl px-3.5 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-cyber-primary/8 border border-cyber-primary/15'
                  : 'bg-cyber-card border border-cyber-border'
              }`}
            >
              <div className="text-2xs font-mono font-semibold mb-1 tracking-wider" style={{ color: msg.role === 'user' ? '#00ff9d' : '#5a6b80' }}>
                {msg.role === 'user' ? 'YOU' : 'AI'}
              </div>
              <div className="text-[13px] text-cyber-text whitespace-pre-wrap font-mono leading-[1.6]">
                {msg.content}
              </div>
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {msg.suggestions.map((s, j) => (
                    <button
                      key={j}
                      onClick={() => sendMessage(s)}
                      className="px-2.5 py-1 text-2xs font-mono rounded-md bg-cyber-surface border border-cyber-border text-cyber-muted hover:text-cyber-primary hover:border-cyber-primary/25 transition-all duration-150"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start fade-in">
            <div className="bg-cyber-card border border-cyber-border rounded-xl px-3.5 py-2.5">
              <span className="text-[13px] font-mono text-cyber-primary typing-cursor">Processing</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-cyber-border px-3 py-3 bg-cyber-surface/80">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about security..."
            className="cyber-input-sm flex-1 font-mono"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="cyber-btn cyber-btn-primary disabled:opacity-30 disabled:cursor-not-allowed px-3 py-1.5"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
