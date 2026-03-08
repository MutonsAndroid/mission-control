'use client'

import { useState, useEffect } from 'react'

const OPENAI_MODELS = [
  { id: 'gpt-5', label: 'GPT-5', description: 'Flagship' },
  { id: 'gpt-5-mini', label: 'GPT-5 Mini', description: 'Fast, cost-effective' },
  { id: 'gpt-5-thinking', label: 'GPT-5 Thinking', description: 'Extended reasoning' },
]

const TEMPLATES = [
  { type: 'developer', label: 'Developer', emoji: '🛠️' },
  { type: 'researcher', label: 'Researcher', emoji: '🔬' },
  { type: 'reviewer', label: 'Reviewer', emoji: '🔍' },
  { type: 'content-creator', label: 'Content Creator', emoji: '✏️' },
]

interface AddAgentModalProps {
  projectSlug: string
  reportsToOptions: { id: string; label: string }[]
  onClose: () => void
  onCreated: () => void
}

export function AddAgentModal({ projectSlug, reportsToOptions, onClose, onCreated }: AddAgentModalProps) {
  const [template, setTemplate] = useState('developer')
  const [role, setRole] = useState('')
  const [reportsTo, setReportsTo] = useState('')
  const [model, setModel] = useState('gpt-5-mini')
  const [emoji, setEmoji] = useState('🤖')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (reportsToOptions.length > 0 && !reportsTo) {
      setReportsTo(reportsToOptions[0].id)
    }
  }, [reportsToOptions, reportsTo])

  useEffect(() => {
    const t = TEMPLATES.find((x) => x.type === template)
    if (t) {
      setEmoji(t.emoji)
      if (!role) setRole(t.label)
    }
  }, [template])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!role.trim() || !reportsTo) {
      setError('Role and Reports To are required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/brain/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          role: role.trim(),
          reports_to: reportsTo,
          model,
          emoji,
          project: projectSlug,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create agent')
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-md w-full shadow-xl">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Add Agent</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Template</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full px-3 py-2 rounded border border-border bg-background text-foreground"
            >
              {TEMPLATES.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.emoji} {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Agent Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Research Agent"
              className="w-full px-3 py-2 rounded border border-border bg-background text-foreground"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Reports To</label>
            <select
              value={reportsTo}
              onChange={(e) => setReportsTo(e.target.value)}
              className="w-full px-3 py-2 rounded border border-border bg-background text-foreground"
              disabled={submitting}
            >
              {reportsToOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 rounded border border-border bg-background text-foreground"
              disabled={submitting}
            >
              {OPENAI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Emoji</label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-full px-3 py-2 rounded border border-border bg-background text-foreground"
              disabled={submitting}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !role.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Agent'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-secondary rounded-md">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
