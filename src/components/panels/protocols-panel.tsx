'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useNavigateToPanel } from '@/lib/navigation'

interface ProtocolMeta {
  title?: string
  purpose?: string
  scope?: string
  owner?: string
  status?: string
}

interface ProtocolFile {
  name: string
  path: string
  size?: number
  modified?: number
  meta?: ProtocolMeta
}

function parseMetaFromContent(content: string): ProtocolMeta {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  if (!match) return {}
  const meta: ProtocolMeta = {}
  for (const line of match[1].split('\n')) {
    const m = line.match(/^\s*([a-z]+):\s*(.*)$/i)
    if (m && ['title', 'purpose', 'scope', 'owner', 'status'].includes(m[1].toLowerCase())) {
      ;(meta as Record<string, string>)[m[1].toLowerCase()] = (m[2] || '').trim().replace(/^["']|["']$/g, '')
    }
  }
  return meta
}

function displayTitle(p: ProtocolFile): string {
  return p.meta?.title || p.name.replace(/\.md$/, '').replace(/-/g, ' ')
}

export function ProtocolsPanel() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const navigateToPanel = useNavigateToPanel()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [protocols, setProtocols] = useState<ProtocolFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [meta, setMeta] = useState<ProtocolMeta | null>(null)
  const [agents, setAgents] = useState<string[]>([])
  const [editing, setEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const loadProtocols = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/protocols')
      const data = await res.json()
      setProtocols(data.protocols || [])
    } catch {
      setProtocols([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProtocols()
  }, [loadProtocols])

  const loadProtocol = useCallback(
    async (name: string, updateUrl = true) => {
      if (updateUrl) {
        router.replace(`/protocols?selected=${encodeURIComponent(name)}`, { scroll: false })
      }
      setLoading(true)
      setSelected(name)
    setEditing(false)
    setEditedContent('')
    try {
      const res = await fetch(`/api/protocols/${encodeURIComponent(name)}`)
      const data = await res.json()
      if (res.ok) {
        setContent(data.content ?? '')
        setEditedContent(data.content ?? '')
        setMeta(data.meta || null)
        setAgents(data.agents || [])
      } else {
        setContent(null)
        setMeta(null)
        setAgents([])
      }
    } catch {
      setContent(null)
      setMeta(null)
      setAgents([])
    } finally {
      setLoading(false)
    }
  },
    [router]
  )

  const selectedFromUrl = searchParams.get('selected')
  const openedFromUrlRef = useRef<string | null>(null)
  useEffect(() => {
    if (!selectedFromUrl) {
      openedFromUrlRef.current = null
      return
    }
    if (protocols.length === 0) return
    if (!protocols.some((p) => p.name === selectedFromUrl)) return
    if (openedFromUrlRef.current === selectedFromUrl) return
    openedFromUrlRef.current = selectedFromUrl
    loadProtocol(selectedFromUrl, false)
  }, [selectedFromUrl, protocols, loadProtocol])

  const startEditing = () => {
    setEditedContent(content ?? '')
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
    setEditedContent(content ?? '')
  }

  const saveProtocol = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch(`/api/protocols/${encodeURIComponent(selected)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedContent }),
      })
      if (res.ok) {
        setContent(editedContent)
        setMeta(parseMetaFromContent(editedContent))
        setEditing(false)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save')
      }
    } catch {
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const selectProtocol = (name: string) => loadProtocol(name, true)

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.md')) {
        alert('Only .md files are accepted')
        return
      }
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/protocols', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (res.ok) {
          await loadProtocols()
          loadProtocol(data.name, true)
        } else {
          alert(data.error || 'Failed to upload')
        }
      } catch {
        alert('Failed to upload')
      } finally {
        setUploading(false)
      }
    },
    [loadProtocols, loadProtocol]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const file = e.dataTransfer.files?.[0]
      if (file) uploadFile(file)
    },
    [uploadFile]
  )
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }
  const handleDragLeave = () => setDragActive(false)

  const deleteProtocol = async () => {
    if (!selected) return
    try {
      const res = await fetch(`/api/protocols/${encodeURIComponent(selected)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setShowDeleteConfirm(false)
        setSelected(null)
        setContent(null)
        setMeta(null)
        setAgents([])
        loadProtocols()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete')
      }
    } catch {
      alert('Failed to delete')
    }
  }

  const searchLower = searchQuery.trim().toLowerCase()
  const filteredProtocols = protocols.filter((p) => {
    if (!searchLower) return true
    if (p.name.toLowerCase().includes(searchLower)) return true
    const t = p.meta?.title?.toLowerCase() ?? ''
    const pur = p.meta?.purpose?.toLowerCase() ?? ''
    const sc = p.meta?.scope?.toLowerCase() ?? ''
    const ow = p.meta?.owner?.toLowerCase() ?? ''
    const st = p.meta?.status?.toLowerCase() ?? ''
    return (
      t.includes(searchLower) ||
      pur.includes(searchLower) ||
      sc.includes(searchLower) ||
      ow.includes(searchLower) ||
      st.includes(searchLower)
    )
  })

  const filePath = selected ? `BRAIN/_portfolio/protocols/${selected}` : ''

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold text-foreground">Protocols</h1>
        <p className="text-muted-foreground mt-2">
          Operational protocols as Markdown documents. Upload .md files or assign protocols to agents for governance.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: search, Upload Markdown, list — all inside same padded container */}
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col">
          <div className="space-y-3 px-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search protocols..."
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".md"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50 transition-smooth font-medium"
            >
              {uploading ? 'Uploading…' : 'Upload Markdown'}
            </button>
          </div>

          {loading && !selected ? (
            <div className="flex items-center justify-center py-8 px-1 mt-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : filteredProtocols.length === 0 ? (
            <div
              className={`mt-2 rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {searchQuery.trim() ? (
                'No matching protocols'
              ) : (
                <>
                  <p className="mb-2">No protocols yet</p>
                  <p className="text-xs mb-3">Drop a .md file here or use Upload Markdown above</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-md text-xs hover:bg-primary/30"
                  >
                    Upload Markdown
                  </button>
                </>
              )}
            </div>
          ) : (
            <div
              className={`space-y-0.5 max-h-[420px] overflow-y-auto mt-2 px-1 rounded-lg transition-colors ${
                dragActive ? 'ring-2 ring-primary/50 ring-inset' : ''
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {filteredProtocols.map((p) => (
                <button
                  key={p.name}
                  onClick={() => selectProtocol(p.name)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-smooth ${
                    selected === p.name
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  <div className="font-medium truncate">{displayTitle(p)}</div>
                  {(p.meta?.purpose || p.meta?.status) && (
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {[p.meta.purpose, p.meta.status].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-foreground truncate">
                {selected
                  ? (meta?.title || selected.replace(/\.md$/, '').replace(/-/g, ' '))
                  : 'Select a protocol'}
              </h2>
              {/* Detail view: file path and metadata summary */}
              {selected && (
                <div className="mt-2 p-3 rounded-lg bg-surface-1/50 border border-border text-xs space-y-2">
                  <div className="font-mono text-muted-foreground break-all">{filePath}</div>
                  {meta && (meta.purpose || meta.scope || meta.owner || meta.status) && (
                    <div className="flex flex-wrap gap-3 text-muted-foreground pt-1 border-t border-border">
                      {meta.purpose && <span>Purpose: {meta.purpose}</span>}
                      {meta.scope && <span>Scope: {meta.scope}</span>}
                      {meta.owner && <span>Owner: {meta.owner}</span>}
                      {meta.status && (
                        <span
                          className={
                            meta.status === 'active'
                              ? 'text-green-400'
                              : meta.status === 'draft'
                                ? 'text-amber-400'
                                : ''
                          }
                        >
                          Status: {meta.status}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selected && (
                <>
                  {!editing ? (
                    <>
                      <button
                        onClick={startEditing}
                        className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-md text-sm hover:bg-primary/30 transition-smooth"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-md text-sm hover:bg-red-500/20 transition-smooth"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={saveProtocol}
                        disabled={saving}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50 transition-smooth"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-3 py-1.5 bg-secondary text-muted-foreground rounded-md text-sm hover:bg-surface-2 transition-smooth"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {selected && content !== null ? (
            <div className="space-y-4">
              {editing ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full min-h-[400px] p-3 bg-surface-1 text-foreground font-mono text-sm border border-border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="Protocol content (Markdown)..."
                />
              ) : (
                <div className="prose prose-invert max-w-none min-h-[200px]">
                  <pre className="whitespace-pre-wrap break-words text-sm text-foreground bg-surface-1/30 rounded p-4 font-sans">
                    {content}
                  </pre>
                </div>
              )}

              {agents.length > 0 && (
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium text-foreground mb-2">Assigned to agents</h4>
                  <div className="flex flex-wrap gap-2">
                    {agents.map((agentId) => (
                      <button
                        key={agentId}
                        onClick={() => {
                          navigateToPanel('agents')
                          // Agent detail will need to be opened by the user
                        }}
                        className="px-2 py-1 text-xs bg-secondary text-foreground rounded border border-border hover:bg-surface-2 transition-smooth"
                      >
                        {agentId}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`flex flex-col items-center justify-center py-16 text-muted-foreground rounded-lg border-2 border-dashed transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <p className="text-sm">Select a protocol from the list or upload a Markdown file</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-smooth"
              >
                Upload Markdown
              </button>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Protocol</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Delete <span className="font-mono text-foreground">{selected}</span>? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-secondary text-muted-foreground rounded-md hover:bg-surface-2 transition-smooth"
              >
                Cancel
              </button>
              <button
                onClick={deleteProtocol}
                className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-md hover:bg-red-500/30 transition-smooth"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
