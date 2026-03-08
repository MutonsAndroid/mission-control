'use client'

import { useNavigateToPanel } from '@/lib/navigation'

export function SkillsPanel() {
  const navigateToPanel = useNavigateToPanel()

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Skills</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Agent skills and capabilities available in the system
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Skill management and configuration will be available here. Configure skills in{' '}
          <button
            type="button"
            onClick={() => navigateToPanel('settings')}
            className="text-primary hover:underline"
          >
            Settings
          </button>
          .
        </p>
      </div>
    </div>
  )
}
