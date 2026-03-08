'use client'

import { useMissionControl } from '@/store'
import { useNavigateToPanel } from '@/lib/navigation'

export function ToolsPanel() {
  const navigateToPanel = useNavigateToPanel()
  const { dashboardMode } = useMissionControl()
  const isLocal = dashboardMode === 'local'

  const allTools = [
    {
      id: 'spawn',
      label: 'Spawn Agent',
      description: 'Launch a new sub-agent for a specific task',
      panel: 'spawn',
      requiresGateway: false,
      icon: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M8 2v12M8 2l-3 3M8 2l3 3" />
          <path d="M3 10h10" />
        </svg>
      ),
    },
    {
      id: 'brain',
      label: 'Brain',
      requiresGateway: false,
      description: 'Browse and manage memory and knowledge',
      panel: 'brain',
      icon: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <ellipse cx="8" cy="8" rx="6" ry="3" />
          <path d="M2 8v3c0 1.7 2.7 3 6 3s6-1.3 6-3V8" />
          <path d="M2 5v3c0 1.7 2.7 3 6 3s6-1.3 6-3V5" />
        </svg>
      ),
    },
    {
      id: 'logs',
      label: 'Log Viewer',
      requiresGateway: false,
      description: 'Stream and filter system logs',
      panel: 'logs',
      icon: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
          <path d="M5 5h6M5 8h6M5 11h3" />
        </svg>
      ),
    },
    {
      id: 'standup',
      label: 'Daily Standup',
      requiresGateway: false,
      description: 'Generate standup reports from activity',
      panel: 'standup',
      icon: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M1 8h2M4 8h2M7 8h2M10 8h2M13 8h2" />
          <path d="M2 4v8M6 4v6M10 4v4M14 4v10" />
        </svg>
      ),
    },
    {
      id: 'agents',
      label: 'Agent Squad',
      description: 'Manage and monitor agent squad',
      panel: 'agents',
      requiresGateway: true,
      icon: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="8" cy="5" r="3" />
          <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        </svg>
      ),
    },
  ]
  const tools = allTools.filter((t) => !t.requiresGateway || !isLocal)

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Tools</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Usable system capabilities and quick actions
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => navigateToPanel(tool.panel)}
            className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card text-left hover:bg-secondary/50 hover:border-primary/30 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              {tool.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">{tool.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{tool.description}</div>
            </div>
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5"
            >
              <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>

      <div className="text-xs text-muted-foreground pt-2">
        <strong className="text-foreground/80">Keyboard shortcuts:</strong> Use{' '}
        <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-2xs">⌘K</kbd>{' '}
        for global search.
      </div>
    </div>
  )
}
