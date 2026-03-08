'use client'

import { useState } from 'react'
import { useNavigateToPanel } from '@/lib/navigation'

const OPENAI_MODELS = [
  { id: 'gpt-5', label: 'GPT-5', description: 'Flagship' },
  { id: 'gpt-5-mini', label: 'GPT-5 Mini', description: 'Fast, cost-effective' },
  { id: 'gpt-5-thinking', label: 'GPT-5 Thinking', description: 'Extended reasoning' },
]

export function ProjectCreationPanel() {
  const navigateToPanel = useNavigateToPanel()
  const [name, setName] = useState('')
  const [mission, setMission] = useState('')
  const [projectManagerModel, setProjectManagerModel] = useState('gpt-5-mini')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !mission.trim()) {
      setError('Project name and mission are required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/brain/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          mission: mission.trim(),
          projectManagerModel,
          notes: notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create project')
      navigateToPanel('project', data.slug)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || ''

  return (
    <div className="p-6 max-w-xl">
      <div className="border-b border-border pb-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Create Project</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create a new project as an isolated operational organism
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Project Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Mission Control"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            disabled={submitting}
          />
          {slug && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">Slug: {slug}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Project Mission</label>
          <textarea
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            placeholder="Describe the project's purpose and scope..."
            rows={4}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            disabled={submitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Project Manager Model</label>
          <select
            value={projectManagerModel}
            onChange={(e) => setProjectManagerModel(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            disabled={submitting}
          >
            {OPENAI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional context..."
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            disabled={submitting}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting || !name.trim() || !mission.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-smooth font-medium"
          >
            {submitting ? 'Creating...' : 'Create Project'}
          </button>
          <button
            type="button"
            onClick={() => navigateToPanel('projects')}
            className="px-4 py-2 bg-secondary text-foreground rounded-md hover:bg-secondary/80 transition-smooth"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
