import { useRef, type KeyboardEvent } from 'react'
import { Send, StopCircle } from 'lucide-react'

interface InputBarProps {
  value: string
  streaming: boolean
  onChange: (v: string) => void
  onSend: () => void
  onStop: () => void
}

export function InputBar({ value, streaming, onChange, onSend, onStop }: InputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="p-4 border-t border-aegis-border">
      <div className="flex gap-2 bg-aegis-surface border border-aegis-border rounded-2xl px-4 py-3 focus-within:border-aegis-accent transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Invoke the constitutional pipeline…"
          rows={1}
          className="flex-1 bg-transparent text-sm text-aegis-text placeholder-aegis-muted resize-none focus:outline-none max-h-32 overflow-y-auto"
        />
        <button
          onClick={streaming ? onStop : onSend}
          disabled={!streaming && !value.trim()}
          aria-label={streaming ? 'Stop generation' : 'Send message'}
          className="self-end text-aegis-muted hover:text-aegis-accent disabled:opacity-30 transition-colors"
        >
          {streaming ? <StopCircle size={20} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  )
}
