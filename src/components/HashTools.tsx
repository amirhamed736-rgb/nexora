import { useState } from 'react'

interface Props {
  onHash: (input: string, algorithm: string) => void
  result: string | null
}

export default function HashTools({ onHash, result }: Props) {
  const [input, setInput] = useState('')
  const [algorithm, setAlgorithm] = useState('sha256')

  return (
    <div className="space-y-4">
      <div>
        <label className="cyber-label">Algorithm</label>
        <div className="flex gap-2 flex-wrap">
          {['sha256', 'sha384', 'sha512'].map((algo) => (
            <button
              key={algo}
              onClick={() => setAlgorithm(algo)}
              className={`px-4 py-2 rounded-lg font-mono text-xs uppercase font-semibold transition-all duration-200 border ${
                algorithm === algo
                  ? 'bg-cyber-primary/10 text-cyber-primary border-cyber-primary/30'
                  : 'bg-cyber-surface text-cyber-muted border-cyber-border hover:text-cyber-text hover:border-cyber-border-light'
              }`}
            >
              {algo}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="cyber-label">Input Text</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter text to hash..."
          className="cyber-input w-full h-32 font-mono text-[13px] leading-[1.6] resize-y"
        />
      </div>

      <button
        onClick={() => onHash(input, algorithm)}
        disabled={!input.trim()}
        className="cyber-btn cyber-btn-primary disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Generate {algorithm.toUpperCase()} Hash
      </button>

      {result && (
        <div className="cyber-card p-4 fade-in">
          <pre className="text-[13px] font-mono text-cyber-primary whitespace-pre-wrap break-all leading-[1.7]">{result}</pre>
        </div>
      )}
    </div>
  )
}
