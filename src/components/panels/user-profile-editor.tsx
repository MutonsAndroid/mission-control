'use client'

import { useState, useEffect, useCallback } from 'react'
import { parseUserMarkdown, type ParsedUser } from '@/lib/user-parser'
import { generateUserMarkdown, type UserData } from '@/lib/user-writer'

const INPUT_STYLE =
  'w-full bg-surface-1 text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50'
const LABEL_STYLE = 'block text-sm font-medium text-muted-foreground mb-1'

interface UserProfileEditorProps {
  onClose: () => void
}

export function UserProfileEditor({ onClose }: UserProfileEditorProps) {
  const [mode, setMode] = useState<'form' | 'markdown'>('form')
  const [formData, setFormData] = useState<ParsedUser>({
    name: '',
    role: '',
    authorityLevel: '',
    primaryAgent: '',
    tone: '',
    interactionStyle: '',
    decisionStyle: '',
    operationalPreferences: '',
    notes: '',
  })
  const [rawMarkdown, setRawMarkdown] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadContent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/brain?path=USER.md')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to load')
      }
      const data = await res.json()
      const content = data.content ?? ''
      const parsed = parseUserMarkdown(content)
      setFormData(parsed)
      setRawMarkdown(content || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

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
          : generateUserMarkdown(formData as UserData)
      const res = await fetch('/api/brain?path=USER.md', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      if (mode === 'markdown') {
        const parsed = parseUserMarkdown(content)
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
    const parsed = parseUserMarkdown(rawMarkdown)
    setFormData(parsed)
    setMode('form')
  }

  const updateFormField = <K extends keyof ParsedUser>(
    field: K,
    value: ParsedUser[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
        <div
          className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
            <h2 className="text-base font-semibold text-foreground">
              Owner Profile
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1 rounded transition-smooth"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* View toggle */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Edit USER.md — agents like Sampson use this to understand the owner
              </span>
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
                  Form
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
                  Markdown
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
                  <h3 className="text-sm font-medium text-foreground mb-2">
                    Core Identity
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_STYLE}>Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => updateFormField('name', e.target.value)}
                        className={INPUT_STYLE}
                        placeholder="e.g. Dustin"
                      />
                    </div>
                    <div>
                      <label className={LABEL_STYLE}>Role</label>
                      <input
                        type="text"
                        value={formData.role}
                        onChange={(e) => updateFormField('role', e.target.value)}
                        className={INPUT_STYLE}
                        placeholder="e.g. Owner"
                      />
                    </div>
                    <div>
                      <label className={LABEL_STYLE}>Authority Level</label>
                      <input
                        type="text"
                        value={formData.authorityLevel}
                        onChange={(e) =>
                          updateFormField('authorityLevel', e.target.value)
                        }
                        className={INPUT_STYLE}
                        placeholder="e.g. Supreme"
                      />
                    </div>
                    <div>
                      <label className={LABEL_STYLE}>Primary Agent</label>
                      <input
                        type="text"
                        value={formData.primaryAgent}
                        onChange={(e) =>
                          updateFormField('primaryAgent', e.target.value)
                        }
                        className={INPUT_STYLE}
                        placeholder="e.g. Sampson"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">
                    Communication Preferences
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_STYLE}>Tone</label>
                      <input
                        type="text"
                        value={formData.tone}
                        onChange={(e) => updateFormField('tone', e.target.value)}
                        className={INPUT_STYLE}
                        placeholder="e.g. Direct, conversational"
                      />
                    </div>
                    <div>
                      <label className={LABEL_STYLE}>Interaction Style</label>
                      <input
                        type="text"
                        value={formData.interactionStyle}
                        onChange={(e) =>
                          updateFormField('interactionStyle', e.target.value)
                        }
                        className={INPUT_STYLE}
                        placeholder="e.g. Collaborative"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_STYLE}>Decision Style</label>
                      <input
                        type="text"
                        value={formData.decisionStyle}
                        onChange={(e) =>
                          updateFormField('decisionStyle', e.target.value)
                        }
                        className={INPUT_STYLE}
                        placeholder="e.g. Strategic, iterative"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={LABEL_STYLE}>Operational Preferences</label>
                  <textarea
                    value={formData.operationalPreferences}
                    onChange={(e) =>
                      updateFormField('operationalPreferences', e.target.value)
                    }
                    className={`${INPUT_STYLE} min-h-[80px]`}
                    placeholder="Prefers structured project systems&#10;Comfortable delegating work to agents&#10;Wants Sampson to act as general manager"
                    rows={4}
                  />
                </div>

                <div>
                  <label className={LABEL_STYLE}>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => updateFormField('notes', e.target.value)}
                    className={`${INPUT_STYLE} min-h-[100px] font-mono text-sm`}
                    placeholder="Freeform Markdown notes about the owner..."
                    rows={5}
                  />
                </div>
              </div>
            ) : (
              <div>
                <textarea
                  value={rawMarkdown}
                  onChange={(e) => setRawMarkdown(e.target.value)}
                  className={`${INPUT_STYLE} font-mono text-sm min-h-[320px]`}
                  placeholder="# USER.md — System Owner&#10;&#10;- **Name:** ...&#10;- **Role:** ..."
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Switch to Form to re-parse and edit as structured fields.
                </p>
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-border flex gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-smooth text-sm"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            {mode === 'form' ? (
              <button
                type="button"
                onClick={() => {
                  setRawMarkdown(generateUserMarkdown(formData as UserData))
                  setMode('markdown')
                }}
                className="px-4 py-2 bg-surface-2 text-muted-foreground rounded-md hover:bg-surface-1 transition-smooth text-sm"
              >
                View Markdown
              </button>
            ) : (
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
      </div>
    </>
  )
}
