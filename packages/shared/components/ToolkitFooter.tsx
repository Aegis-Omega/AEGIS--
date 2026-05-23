const TOOLS = [
  { name: 'Platform Picker', url: '/platform-picker/' },
  { name: 'Hook Generator', url: '/hook-generator/' },
  { name: 'Content Calendar', url: '/content-calendar/' },
]

interface ToolkitFooterProps {
  current: string
  borderClass?: string
  mutedClass?: string
  glowClass?: string
}

export function ToolkitFooter({ current, borderClass = 'border-gray-800', mutedClass = 'text-gray-500', glowClass = 'text-gray-300 hover:text-white' }: ToolkitFooterProps) {
  const others = TOOLS.filter(t => t.name !== current)
  return (
    <div className={`border-t ${borderClass} mt-16`}>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center gap-3">
        <span className={`text-xs ${mutedClass} shrink-0`}>Also in the toolkit:</span>
        <div className="flex flex-wrap items-center gap-3">
          {others.map(t => (
            <a
              key={t.name}
              href={t.url}
              className={`text-xs ${glowClass} transition-colors underline-offset-2 hover:underline`}
            >
              {t.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
