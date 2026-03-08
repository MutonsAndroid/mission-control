'use client'

import { useState, useEffect, useCallback } from 'react'
import { parseIdentityMarkdown, type ParsedIdentity } from '@/lib/identity-parser'
import { generateIdentityMarkdown, type IdentityData } from '@/lib/identity-writer'

const INPUT_STYLE =
  'w-full bg-surface-1 text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50'
const LABEL_STYLE = 'block text-sm font-medium text-muted-foreground mb-1'

interface IdentityEditorProps {
  agentId: string
  agentName: string
  onLoaded?: () => void
}

export function IdentityEditor({
  agentId,
  agentName,
  onLoaded
}: IdentityEditorProps) {
  const [mode, setMode] = useState<'form' | 'markdown'>('form')
  const [formData, setFormData] = useState<ParsedIdentity>({
    name: '',
    role: '',
    owner: '',
    purpose: '',
    tone: '',
    emoji: '',
    responsibilities: []
  })
  const [rawMarkdown, setRawMarkdown] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newResp, setNewResp] = useState('')

  const loadContent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/brain/agents/${encodeURIComponent(agentId)}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      const content = data.identity ?? null
      const parsed = parseIdentityMarkdown(content)
      setFormData(parsed)
      setRawMarkdown(content || '')
      onLoaded?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load identity')
    } finally {
      setLoading(false)
    }
  }, [agentId, onLoaded])

  useEffect(() => {
    loadContent()
  }, [loadContent])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const content =
        mode === 'markdown'
          ? rawMarkdown
          : generateIdentityMarkdown(formData as IdentityData)
      const res = await fetch(`/api/brain/agents/${encodeURIComponent(agentId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: content })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      if (mode === 'markdown') {
        const parsed = parseIdentityMarkdown(content)
        setFormData(parsed)
      } else {
        setRawMarkdown(content)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const switchToFormAndReparse = () => {
    const parsed = parseIdentityMarkdown(rawMarkdown)
    setFormData(parsed)
    setMode('form')
  }

  const addResponsibility = () => {
    const v = newResp.trim()
    if (!v) return
    setFormData((prev) => ({
      ...prev,
      responsibilities: [...prev.responsibilities, v]
    }))
    setNewResp('')
  }

  const removeResponsibility = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      responsibilities: prev.responsibilities.filter((_, i) => i !== index)
    }))
  }

  const updateFormField = <K extends keyof ParsedIdentity>(
    field: K,
    value: ParsedIdentity[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* View toggle */}
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-medium text-foreground">Identity</h4>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode('form')}
            className={`px-2 py-1.5 rounded transition-smooth ${
              mode === 'form'
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface-2 text-muted-foreground hover:bg-surface-1'
            }`}
          >
            Form View
          </button>
          <button
            type="button"
            onClick={() => setMode('markdown')}
            className={`px-2 py-1.5 rounded transition-smooth ${
              mode === 'markdown'
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface-2 text-muted-foreground hover:bg-surface-1'
            }`}
          >
            Markdown View
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      {mode === 'form' ? (
        <div className="space-y-4">
          <div>
            <label className={LABEL_STYLE}>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateFormField('name', e.target.value)}
              className={INPUT_STYLE}
              placeholder="e.g. Sampson"
            />
          </div>
          <div>
            <label className={LABEL_STYLE}>Role</label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => updateFormField('role', e.target.value)}
              className={INPUT_STYLE}
              placeholder="e.g. AI Assistant and General Manager"
            />
          </div>
          <div>
            <label className={LABEL_STYLE}>Owner</label>
            <input
              type="text"
              value={formData.owner}
              onChange={(e) => updateFormField('owner', e.target.value)}
              className={INPUT_STYLE}
              placeholder="e.g. Dustin"
            />
          </div>
          <div>
            <label className={LABEL_STYLE}>Purpose</label>
            <textarea
              value={formData.purpose}
              onChange={(e) => updateFormField('purpose', e.target.value)}
              className={`${INPUT_STYLE} min-h-[80px]`}
              placeholder="e.g. Transform ideas into structured, executable systems."
              rows={3}
            />
          </div>
          <div>
            <label className={LABEL_STYLE}>Personality Tone</label>
            <input
              type="text"
              value={formData.tone}
              onChange={(e) => updateFormField('tone', e.target.value)}
              className={INPUT_STYLE}
              placeholder="e.g. Warm, direct, realist, structured, patient."
            />
          </div>
          <div>
            <label className={LABEL_STYLE}>Emoji</label>
            <input
              type="text"
              value={formData.emoji}
              onChange={(e) => updateFormField('emoji', e.target.value)}
              className={INPUT_STYLE}
              placeholder="🧠"
              maxLength={4}
            />
          </div>
          <div>
            <label className={LABEL_STYLE}>Responsibilities</label>
            <ul className="space-y-2 mb-2">
              {formData.responsibilities.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 group"
                >
                  <span className="flex-1 bg-surface-1 border border-border rounded px-3 py-2 text-sm text-foreground">
                    {r}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeResponsibility(i)}
                    className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-red-400 hover:text-red-300 transition-opacity"
                    aria-label="Remove"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                type="text"
                value={newResp}
                onChange={(e) => setNewResp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addResponsibility())}
                className={INPUT_STYLE}
                placeholder="Add responsibility"
              />
              <button
                type="button"
                onClick={addResponsibility}
                className="px-4 py-2 bg-surface-2 text-foreground rounded-md hover:bg-surface-1 transition-smooth text-sm whitespace-nowrap"
              >
                + Add Responsibility
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <textarea
            value={rawMarkdown}
            onChange={(e) => setRawMarkdown(e.target.value)}
            className={`${INPUT_STYLE} font-mono text-sm min-h-[320px]`}
            placeholder="# IDENTITY.md — Who Am I?&#10;&#10;- **Name:** ...&#10;- **Role:** ..."
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Switch to Form View to re-parse and edit as structured fields.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-smooth text-sm"
        >
          {saving ? 'Saving...' : 'Save Identity'}
        </button>
        {mode === 'form' && (
          <button
            type="button"
            onClick={() => {
              setRawMarkdown(generateIdentityMarkdown(formData as IdentityData))
              setMode('markdown')
            }}
            className="px-4 py-2 bg-surface-2 text-muted-foreground rounded-md hover:bg-surface-1 transition-smooth text-sm"
          >
            View Markdown
          </button>
        )}
        {mode === 'markdown' && (
          <button
            type="button"
            onClick={switchToFormAndReparse}
            className="px-4 py-2 bg-surface-2 text-muted-foreground rounded-md hover:bg-surface-1 transition-smooth text-sm"
          >
            Back to Form
          </button>
        )}
      </div>
    </div>
  )
}
