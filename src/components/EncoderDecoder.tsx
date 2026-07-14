import { useState } from 'react'

interface Props {
  onProcess: (input: string, mode: string, format: string) => void
  result: string | null
}

export default function EncoderDecoder({ onProcess, result }: Props) {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState('encode')
  const [format, setFormat] = useState('base64')

  return (
    <div className="space-y-4">
      {/* Mode + Format toggles */}
      <div className="flex gap-3 flex-wrap">
        <div>
          <label className="cyber-label">Mode</label>
          <div className="flex rounded-lg overflow-hidden border border-cyber-border">
            {['encode', 'decode'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 font-mono text-xs capitalize transition-colors ${
                  mode === m ? 'bg-cyber-primary/15 text-cyber-primary' : 'bg-cyber-surface text-cyber-muted hover:text-cyber-text'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="cyber-label">Format</label>
          <div className="flex rounded-lg overflow-hidden border border-cyber-border">
            {['base64', 'url', 'hex'].map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-4 py-2 font-mono text-xs uppercase transition-colors ${
                  format === f ? 'bg-cyber-primary/15 text-cyber-primary' : 'bg-cyber-surface text-cyber-muted hover:text-cyber-text'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="cyber-label">Input</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text to encode or decode..."
          className="cyber-input w-full h-32 font-mono text-[13px] leading-[1.6] resize-y"
        />
      </div>

      <button
        onClick={() => onProcess(input, mode, format)}
        disabled={!input.trim()}
        className="cyber-btn cyber-btn-primary disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {mode} as {format}
      </button>

      {result && (
        <div className="cyber-card p-4 fade-in">
          <pre className="text-[13px] font-mono text-cyber-text whitespace-pre-wrap break-all leading-[1.7]">{result}</pre>
        </div>
      )}
    </div>
  )
}
