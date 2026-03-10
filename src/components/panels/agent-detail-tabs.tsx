'use client'

import { useState, useEffect } from 'react'
import { createClientLogger } from '@/lib/client-logger'
import Link from 'next/link'
import { IdentityEditor } from '@/components/agent/identity-editor'
import { AgentProtocolsTab } from '@/components/agent/agent-protocols-tab'

const log = createClientLogger('AgentDetailTabs')

interface Agent {
  id: number
  name: string
  role: string
  session_key?: string
  soul_content?: string
  working_memory?: string
  status: 'offline' | 'idle' | 'busy' | 'error'
  last_seen?: number
  last_activity?: string
  created_at: number
  updated_at: number
  taskStats?: {
    total: number
    assigned: number
    in_progress: number
    completed: number
  }
}

interface WorkItem {
  type: string
  count: number
  items: any[]
}

interface HeartbeatResponse {
  status: 'HEARTBEAT_OK' | 'WORK_ITEMS_FOUND'
  agent: string
  checked_at: number
  work_items?: WorkItem[]
  total_items?: number
  message?: string
}

interface SoulTemplate {
  name: string
  description: string
  size: number
}

const statusColors: Record<string, string> = {
  offline: 'bg-gray-500',
  idle: 'bg-green-500',
  busy: 'bg-yellow-500',
  error: 'bg-red-500',
}

const statusIcons: Record<string, string> = {
  offline: '-',
  idle: 'o',
  busy: '~',
  error: '!',
}

// Overview Tab Component — driven entirely by IDENTITY.md (parsed identity)
export function OverviewTab({
  agent,
  onStatusUpdate,
  onWakeAgent,
  heartbeatData,
  loadingHeartbeat,
  onPerformHeartbeat
}: {
  agent: Agent
  onStatusUpdate: (name: string, status: Agent['status'], activity?: string) => Promise<void>
  onWakeAgent: (name: string, sessionKey: string) => Promise<void>
  heartbeatData: HeartbeatResponse | null
  loadingHeartbeat: boolean
  onPerformHeartbeat: () => Promise<void>
}) {
  const [directMessage, setDirectMessage] = useState('')
  const [messageStatus, setMessageStatus] = useState<string | null>(null)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!directMessage.trim()) return
    try {
      setMessageStatus(null)
      const response = await fetch('/api/agents/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: agent.name,
          message: directMessage
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send message')
      setDirectMessage('')
      setMessageStatus('Message sent')
    } catch (error) {
      setMessageStatus('Failed to send message')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Status Controls */}
      <div className="p-4 bg-surface-1/50 rounded-lg">
        <h4 className="text-sm font-medium text-foreground mb-3">Status Control</h4>
        <div className="flex gap-2 mb-3">
          {(['idle', 'busy', 'offline'] as const).map(status => (
            <button
              key={status}
              type="button"
              onClick={() => onStatusUpdate(agent.name, status)}
              className={`px-3 py-1 text-sm rounded transition-smooth ${
                agent.status === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-surface-2'
              }`}
            >
              {statusIcons[status]} {status}
            </button>
          ))}
        </div>

        {/* Wake Agent Button */}
        {agent.session_key && (
          <button
            type="button"
            onClick={() => onWakeAgent(agent.name, agent.session_key!)}
            className="w-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 py-2 rounded-md hover:bg-cyan-500/30 transition-smooth"
          >
            Wake Agent via Session
          </button>
        )}
      </div>

      {/* Direct Message */}
      <div className="p-4 bg-surface-1/50 rounded-lg">
        <h4 className="text-sm font-medium text-foreground mb-3">Direct Message</h4>
        {messageStatus && (
          <div className="text-xs text-foreground/80 mb-2">{messageStatus}</div>
        )}
        <form onSubmit={handleSendMessage} className="space-y-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Message</label>
            <textarea
              value={directMessage}
              onChange={(e) => setDirectMessage(e.target.value)}
              className="w-full bg-surface-1 text-foreground rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
              rows={3}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-smooth text-xs"
            >
              Send Message
            </button>
          </div>
        </form>
      </div>

      {/* Heartbeat Check */}
      <div className="p-4 bg-surface-1/50 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-medium text-foreground">Heartbeat Check</h4>
          <button
            type="button"
            onClick={onPerformHeartbeat}
            disabled={loadingHeartbeat}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-smooth"
          >
            {loadingHeartbeat ? 'Checking...' : 'Check Now'}
          </button>
        </div>
        
        {heartbeatData && (
          <div className="space-y-2">
            <div className="text-sm text-foreground/80">
              <strong>Status:</strong> {heartbeatData.status}
            </div>
            <div className="text-sm text-foreground/80">
              <strong>Checked:</strong> {new Date(heartbeatData.checked_at * 1000).toLocaleString()}
            </div>
            
            {heartbeatData.work_items && heartbeatData.work_items.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium text-yellow-400 mb-2">
                  Work Items Found: {heartbeatData.total_items}
                </div>
                {heartbeatData.work_items.map((item, idx) => (
                  <div key={idx} className="text-sm text-foreground/80 ml-2">
                    • {item.type}: {item.count} items
                  </div>
                ))}
              </div>
            )}
            
            {heartbeatData.message && (
              <div className="text-sm text-foreground/80">
                <strong>Message:</strong> {heartbeatData.message}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Agent Card — from IDENTITY.md (parsed) */}
      <div className="space-y-4 p-4 bg-surface-1/50 rounded-lg">
        <h4 className="text-sm font-medium text-foreground">Agent Profile</h4>
        <div className="grid gap-3 text-sm">
          <div>
            <label className="block text-xs text-muted-foreground mb-0.5">Name</label>
            <p className="text-foreground">{(agent as any).identity?.name || agent.name || '—'}</p>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-0.5">Role</label>
            <p className="text-foreground">{(agent as any).identity?.role || agent.role || '—'}</p>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-0.5">Owner</label>
            <p className="text-foreground">{(agent as any).identity?.owner || '—'}</p>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-0.5">Purpose</label>
            <p className="text-foreground">{(agent as any).identity?.purpose || '—'}</p>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-0.5">Personality Tone</label>
            <p className="text-foreground">{(agent as any).identity?.tone || '—'}</p>
          </div>
          {((agent as any).identity?.responsibilities?.length ?? 0) > 0 && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Responsibilities</label>
              <ul className="list-disc list-inside text-foreground space-y-0.5">
                {((agent as any).identity.responsibilities || []).map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <label className="block text-xs text-muted-foreground mb-0.5">Status</label>
            <p className="text-foreground">
              <span className={`inline-flex items-center gap-1.5`}>
                <span className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
                {agent.status}
              </span>
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Edit profile in the Identity tab. Markdown files are the source of truth.
        </p>
      </div>

      {/* Operational Details */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Session Key</label>
          <div className="flex items-center gap-2">
            <p className="text-foreground font-mono">{agent.session_key || 'Not set'}</p>
            {agent.session_key && (
              <div className="flex items-center gap-1 text-xs text-green-400">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span>Bound</span>
              </div>
            )}
          </div>
        </div>

        {/* Task Statistics */}
        {agent.taskStats && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Task Statistics</label>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-surface-1/50 rounded p-3 text-center">
                <div className="text-lg font-semibold text-foreground">{agent.taskStats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="bg-surface-1/50 rounded p-3 text-center">
                <div className="text-lg font-semibold text-blue-400">{agent.taskStats.assigned}</div>
                <div className="text-xs text-muted-foreground">Assigned</div>
              </div>
              <div className="bg-surface-1/50 rounded p-3 text-center">
                <div className="text-lg font-semibold text-yellow-400">{agent.taskStats.in_progress}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
              <div className="bg-surface-1/50 rounded p-3 text-center">
                <div className="text-lg font-semibold text-green-400">{agent.taskStats.completed}</div>
                <div className="text-xs text-muted-foreground">Done</div>
              </div>
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Created:</span>
            <span className="text-foreground ml-2">{new Date(agent.created_at * 1000).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Last Updated:</span>
            <span className="text-foreground ml-2">{new Date(agent.updated_at * 1000).toLocaleDateString()}</span>
          </div>
          {agent.last_seen && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Last Seen:</span>
              <span className="text-foreground ml-2">{new Date(agent.last_seen * 1000).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

// Structured Soul type (from SOUL.md parser)
interface SoulStructured {
  philosophy: string
  operatingModel: string
  reasoningStyle: string
  communicationStyle: string
  directives: string[]
  rawMarkdown: string
}

// SOUL Tab Component — driven by SOUL.md (Structured View | Markdown View)
export function SoulTab({
  agent,
  soulContent: initialSoulContent,
  templates,
  onSave,
  onSoulSaved
}: {
  agent: Agent
  soulContent: string
  templates: SoulTemplate[]
  onSave: (content: string, templateName?: string) => Promise<void>
  onSoulSaved?: () => void
}) {
  const [mode, setMode] = useState<'structured' | 'markdown'>('structured')
  const [content, setContent] = useState(initialSoulContent)
  const [structured, setStructured] = useState<SoulStructured | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const agentId = (agent as any).id ?? agent.name

  useEffect(() => {
    setContent(initialSoulContent)
  }, [initialSoulContent])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/agents/${agentId}/soul`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setContent(data.soul_content ?? '')
          setStructured(data.soulStructured ?? null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [agentId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(content)
      const res = await fetch(`/api/agents/${agentId}/soul`)
      if (res.ok) {
        const data = await res.json()
        setStructured(data.soulStructured ?? null)
      }
      onSoulSaved?.()
    } finally {
      setSaving(false)
    }
  }

  const handleLoadTemplate = async (templateName: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/soul?template=${encodeURIComponent(templateName)}`, {
        method: 'PATCH'
      })
      if (response.ok) {
        const data = await response.json()
        if (data.content) setContent(data.content)
        setSelectedTemplate(templateName)
      }
    } catch (error) {
      log.error('Failed to load template:', error)
    }
  }

  const renderSection = (title: string, text: string) =>
    text ? (
      <div className="mb-4">
        <h5 className="text-sm font-medium text-foreground mb-2">{title}</h5>
        <div className="text-foreground/90 text-sm whitespace-pre-wrap bg-surface-1/30 rounded-lg p-3">
          {text}
        </div>
      </div>
    ) : null

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-medium text-foreground">SOUL — How I Think</h4>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode('structured')}
            className={`px-2 py-1.5 rounded transition-smooth ${
              mode === 'structured'
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface-2 text-muted-foreground hover:bg-surface-1'
            }`}
          >
            Structured View
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

      {/* Template Selector */}
      {mode === 'markdown' && templates.length > 0 && (
        <div className="p-4 bg-surface-1/50 rounded-lg">
          <h5 className="text-sm font-medium text-foreground mb-2">Load Template</h5>
          <div className="flex gap-2">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="flex-1 bg-surface-1 text-foreground border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="">Select a template...</option>
              {templates.map(template => (
                <option key={template.name} value={template.name}>
                  {template.description} ({template.size} chars)
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => selectedTemplate && handleLoadTemplate(selectedTemplate)}
              disabled={!selectedTemplate}
              className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-md hover:bg-green-500/30 disabled:opacity-50 transition-smooth"
            >
              Load
            </button>
          </div>
        </div>
      )}

      {mode === 'structured' ? (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Parsed from SOUL.md. Switch to Markdown View to edit.
          </p>
          {structured ? (
            <div className="space-y-4">
              {renderSection('Core Philosophy', structured.philosophy)}
              {renderSection('Operating Model', structured.operatingModel)}
              {renderSection('Reasoning Style', structured.reasoningStyle)}
              {renderSection('Communication Style', structured.communicationStyle)}
              {structured.directives.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-foreground mb-2">Directives</h5>
                  <ul className="list-disc list-inside text-foreground/90 text-sm space-y-1 bg-surface-1/30 rounded-lg p-3">
                    {structured.directives.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {!structured.philosophy && !structured.operatingModel && !structured.reasoningStyle &&
               !structured.communicationStyle && structured.directives.length === 0 && (
                <p className="text-muted-foreground italic">No structured sections found. Add sections like # Core Philosophy, # Directives to SOUL.md.</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground italic">No SOUL content defined. Switch to Markdown View to create.</p>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            SOUL Content ({content.length} characters)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="w-full bg-surface-1 text-foreground border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono text-sm"
            placeholder="# Core Philosophy&#10;Describe how the agent approaches problems.&#10;&#10;# Directives&#10;- Remain structured"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Save to update SOUL.md. Structured view will refresh with parsed sections.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-smooth text-sm"
            >
              {saving ? 'Saving...' : 'Save SOUL'}
            </button>
            <button
              type="button"
              onClick={() => setMode('structured')}
              className="px-4 py-2 bg-surface-2 text-muted-foreground rounded-md hover:bg-surface-1 transition-smooth text-sm"
            >
              View Structured
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Identity Tab - structured form editor for IDENTITY.md (Form View | Markdown View)
export function IdentityTab({ agent, onIdentitySaved }: { agent: Agent; onIdentitySaved?: () => void }) {
  const agentId = (agent as any).agentId ?? agent.name.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="p-6">
      <IdentityEditor
        agentId={agentId}
        agentName={agent.name}
        onSave={onIdentitySaved}
      />
    </div>
  )
}

// Protocols Tab - assigned protocol documents
export function ProtocolsTab({ agent }: { agent: Agent }) {
  const agentId = (agent as any).agentId ?? agent.name.toLowerCase().replace(/\s+/g, '-')
  return <AgentProtocolsTab agentId={agentId} agentName={agent.name} />
}

// Memory Tab - BRAIN content scoped by agent's project
export function MemoryTab({
  agent
}: {
  agent: Agent
  workingMemory?: string
  onSave?: (content: string, append?: boolean) => Promise<void>
}) {
  const [project, setProject] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [memoryTree, setMemoryTree] = useState<any[]>([])

  useEffect(() => {
    const agentId = (agent as any).agentId ?? agent.name.toLowerCase().replace(/\s+/g, '-')
    fetch(`/api/brain/agents/${encodeURIComponent(agentId)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const proj = data?.project ?? null
        setProject(proj)
        return proj
      })
      .then((proj) => {
        if (proj) {
          return fetch(`/api/memory?action=tree`).then((r) => r.json()).then((d) => ({ proj, tree: d.tree || [] }))
        }
        return { proj: null, tree: [] }
      })
      .then(({ proj, tree }) => {
        const projectsDir = tree.find((f: any) => f.name === 'projects')
        const projectDir = projectsDir?.children?.find((c: any) => c.name === proj)
        setMemoryTree(projectDir?.children || [])
      })
      .finally(() => setLoading(false))
  }, [agent.name])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6 space-y-4">
        <h4 className="text-lg font-medium text-foreground">Memory</h4>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-amber-300">
          No project bound. Add <code className="bg-black/20 px-1 rounded">project: &lt;slug&gt;</code> to IDENTITY.md front-matter for project-scoped memory.
        </div>
        <p className="text-muted-foreground text-sm">
          Browse full BRAIN at <Link href="/brain" className="text-primary underline">Brain</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <h4 className="text-lg font-medium text-foreground">BRAIN Memory</h4>
      <p className="text-sm text-muted-foreground">
        Scope: <span className="text-foreground font-medium">{project}</span>
      </p>
      <p className="text-sm text-muted-foreground">
        Browse and edit at <Link href="/brain" className="text-primary underline">Brain</Link>.
      </p>
      {memoryTree.length > 0 && (
        <div className="bg-surface-1/30 rounded p-4">
          <div className="text-xs text-muted-foreground mb-2">Project files:</div>
          <ul className="space-y-1 text-sm">
            {memoryTree.map((f: any) => (
              <li key={f.path}>{f.type === 'directory' ? `📁 ${f.name}/` : `📄 ${f.name}`}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// Tasks Tab - from BRAIN TASKS.md filtered by owner
export function TasksTab({ agent }: { agent: Agent }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<string | null>(null)

  useEffect(() => {
    const agentId = (agent as any).agentId ?? agent.name.toLowerCase().replace(/\s+/g, '-')
    fetch(`/api/brain/agents/${encodeURIComponent(agentId)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const proj = data?.project
        setProject(proj ?? null)
        if (proj) {
          return fetch(`/api/brain/projects/${encodeURIComponent(proj)}/tasks?owner=${encodeURIComponent(agent.name)}`)
            .then((r) => r.json())
        }
        return { tasks: [] }
      })
      .then((data) => setTasks(data?.tasks || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }, [agent.name])

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">Loading tasks...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <h4 className="text-lg font-medium text-foreground">Assigned Tasks</h4>
      
          {!project ? (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-amber-300">
          No project bound. Add <code className="bg-black/20 px-1 rounded">project: &lt;slug&gt;</code> to IDENTITY.md to see tasks.
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
          <p className="text-sm">No tasks assigned to this agent</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: any) => (
            <div key={task.id} className="bg-surface-1/50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-medium text-foreground">{task.description || task.id}</span>
                  <div className="text-xs text-muted-foreground mt-1">
                    {task.id} · {project}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded-md font-medium ${
                    task.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                    task.status === 'done' ? 'bg-green-500/20 text-green-400' :
                    task.status === 'review' ? 'bg-blue-500/20 text-blue-400' :
                    task.status === 'quality_review' ? 'bg-indigo-500/20 text-indigo-400' :
                    'bg-secondary text-muted-foreground'
                  }`}>
                    {task.status}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-md font-medium ${
                    task.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                    task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-secondary text-muted-foreground'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Logs Tab - project logs for agent
export function LogsTab({ agent }: { agent: Agent }) {
  const [project, setProject] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const agentId = (agent as any).agentId ?? agent.name.toLowerCase().replace(/\s+/g, '-')
    fetch(`/api/brain/agents/${encodeURIComponent(agentId)}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        setProject(data?.project ?? null)
      })
      .finally(() => setLoading(false))
  }, [agent.name])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6 space-y-4">
        <h4 className="text-lg font-medium text-foreground">Logs</h4>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-amber-300">
          No project bound. Add project to IDENTITY.md to view project logs.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <h4 className="text-lg font-medium text-foreground">Logs</h4>
      <p className="text-sm text-muted-foreground">
        Project: <span className="text-foreground">{project}</span>. View structure and logs at{' '}
        <Link href="/brain" className="text-primary underline">Brain</Link> → projects/{project}/logs/
      </p>
    </div>
  )
}

// Activity Tab Component (deprecated - kept for backwards compat)
export function ActivityTab({ agent }: { agent: Agent }) {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch(`/api/activities?actor=${agent.name}&limit=50`)
        if (response.ok) {
          const data = await response.json()
          setActivities(data.activities || [])
        }
      } catch (error) {
        log.error('Failed to fetch activities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [agent.name])

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">Loading activity...</span>
        </div>
      </div>
    )
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'agent_status_change': return '~'
      case 'task_created': return '+'
      case 'task_updated': return '>'
      case 'comment_added': return '#'
      case 'agent_heartbeat': return '*'
      case 'agent_soul_updated': return '@'
      case 'agent_memory_updated': return '='
      default: return '.'
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h4 className="text-lg font-medium text-foreground">Recent Activity</h4>
      
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
          <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center mb-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 4h12M2 8h8M2 12h10" />
            </svg>
          </div>
          <p className="text-sm">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map(activity => (
            <div key={activity.id} className="bg-surface-1/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                <div className="flex-1">
                  <p className="text-foreground">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{activity.type}</span>
                    <span>•</span>
                    <span>{new Date(activity.created_at * 1000).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===== NEW COMPONENTS: CreateAgentModal (template wizard) + ConfigTab =====
// These replace the old CreateAgentModal and add the Config tab

// Template data for the wizard (client-side mirror of agent-templates.ts)
const TEMPLATES = [
  { type: 'orchestrator', label: 'Orchestrator', emoji: '\ud83e\udded', description: 'Primary coordinator with full tool access', modelTier: 'opus' as const, toolCount: 23, theme: 'operator strategist' },
  { type: 'developer', label: 'Developer', emoji: '\ud83d\udee0\ufe0f', description: 'Full-stack builder with Docker bridge', modelTier: 'sonnet' as const, toolCount: 21, theme: 'builder engineer' },
  { type: 'specialist-dev', label: 'Specialist Dev', emoji: '\u2699\ufe0f', description: 'Focused developer for specific domains', modelTier: 'sonnet' as const, toolCount: 15, theme: 'specialist developer' },
  { type: 'reviewer', label: 'Reviewer / QA', emoji: '\ud83d\udd2c', description: 'Read-only code review and quality gates', modelTier: 'haiku' as const, toolCount: 7, theme: 'quality reviewer' },
  { type: 'researcher', label: 'Researcher', emoji: '\ud83d\udd0d', description: 'Browser and web access for research', modelTier: 'sonnet' as const, toolCount: 8, theme: 'research analyst' },
  { type: 'content-creator', label: 'Content Creator', emoji: '\u270f\ufe0f', description: 'Write and edit for content generation', modelTier: 'haiku' as const, toolCount: 9, theme: 'content creator' },
  { type: 'security-auditor', label: 'Security Auditor', emoji: '\ud83d\udee1\ufe0f', description: 'Read-only + bash for security scanning', modelTier: 'sonnet' as const, toolCount: 10, theme: 'security auditor' },
]

const MODEL_TIER_COLORS: Record<string, string> = {
  opus: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  sonnet: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  haiku: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const MODEL_TIER_LABELS: Record<string, string> = {
  opus: 'Opus $$$',
  sonnet: 'Sonnet $$',
  haiku: 'Haiku $',
}

const DEFAULT_MODEL_BY_TIER: Record<'opus' | 'sonnet' | 'haiku', string> = {
  opus: 'anthropic/claude-opus-4-5',
  sonnet: 'anthropic/claude-sonnet-4-20250514',
  haiku: 'anthropic/claude-haiku-4-5',
}

// Enhanced Create Agent Modal with Template Wizard
export function CreateAgentModal({
  onClose,
  onCreated
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    id: '',
    role: '',
    emoji: '',
    modelTier: 'sonnet' as 'opus' | 'sonnet' | 'haiku',
    modelPrimary: DEFAULT_MODEL_BY_TIER.sonnet,
    workspaceAccess: 'rw' as 'rw' | 'ro' | 'none',
    sandboxMode: 'all' as 'all' | 'non-main',
    dockerNetwork: 'none' as 'none' | 'bridge',
    session_key: '',
    write_to_gateway: true,
    provision_openclaw_workspace: true,
  })
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedTemplateData = TEMPLATES.find(t => t.type === selectedTemplate)

  // Auto-generate kebab-case ID from name
  const updateName = (name: string) => {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    setFormData(prev => ({ ...prev, name, id }))
  }

  useEffect(() => {
    const loadAvailableModels = async () => {
      try {
        const response = await fetch('/api/status?action=models')
        if (!response.ok) return
        const data = await response.json()
        const models = Array.isArray(data.models) ? data.models : []
        const names = models
          .map((model: any) => String(model.name || model.alias || '').trim())
          .filter(Boolean)
        setAvailableModels(Array.from(new Set<string>(names)))
      } catch {
        // Keep modal usable without model suggestions.
      }
    }
    loadAvailableModels()
  }, [])

  // When template is selected, pre-fill form
  const selectTemplate = (type: string | null) => {
    setSelectedTemplate(type)
    if (type) {
      const tmpl = TEMPLATES.find(t => t.type === type)
      if (tmpl) {
        setFormData(prev => ({
          ...prev,
          role: tmpl.theme,
          emoji: tmpl.emoji,
          modelTier: tmpl.modelTier,
          modelPrimary: DEFAULT_MODEL_BY_TIER[tmpl.modelTier],
          workspaceAccess: type === 'researcher' || type === 'content-creator' ? 'none' : type === 'reviewer' || type === 'security-auditor' ? 'ro' : 'rw',
          sandboxMode: type === 'orchestrator' ? 'non-main' : 'all',
          dockerNetwork: type === 'developer' || type === 'specialist-dev' ? 'bridge' : 'none',
        }))
      }
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }
    setIsCreating(true)
    setError(null)
    try {
      const primaryModel = formData.modelPrimary.trim() || DEFAULT_MODEL_BY_TIER[formData.modelTier]
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          openclaw_id: formData.id || undefined,
          role: formData.role,
          session_key: formData.session_key || undefined,
          template: selectedTemplate || undefined,
          write_to_gateway: formData.write_to_gateway,
          provision_openclaw_workspace: formData.provision_openclaw_workspace,
          gateway_config: {
            model: { primary: primaryModel },
            identity: { name: formData.name, theme: formData.role, emoji: formData.emoji },
            sandbox: {
              mode: formData.sandboxMode,
              workspaceAccess: formData.workspaceAccess,
              scope: 'agent',
              ...(formData.dockerNetwork === 'bridge' ? { docker: { network: 'bridge' } } : {}),
            },
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create agent')
      }
      onCreated()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-foreground">Create New Agent</h3>
              <div className="flex gap-3 mt-2">
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      step === s ? 'bg-primary text-primary-foreground' :
                      step > s ? 'bg-green-500/20 text-green-400' :
                      'bg-surface-2 text-muted-foreground'
                    }`}>
                      {step > s ? '\u2713' : s}
                    </div>
                    <span className={`text-xs ${step === s ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {s === 1 ? 'Template' : s === 2 ? 'Configure' : 'Review'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl">x</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 mb-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Choose Template */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map(tmpl => (
                <button
                  key={tmpl.type}
                  onClick={() => { selectTemplate(tmpl.type); setStep(2) }}
                  className={`p-4 rounded-lg border text-left transition-smooth hover:bg-surface-1 ${
                    selectedTemplate === tmpl.type ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{tmpl.emoji}</span>
                    <span className="font-semibold text-foreground">{tmpl.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{tmpl.description}</p>
                  <div className="flex gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded border ${MODEL_TIER_COLORS[tmpl.modelTier]}`}>
                      {MODEL_TIER_LABELS[tmpl.modelTier]}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded bg-surface-2 text-muted-foreground">
                      {tmpl.toolCount} tools
                    </span>
                  </div>
                </button>
              ))}
              {/* Custom option */}
              <button
                onClick={() => { selectTemplate(null); setStep(2) }}
                className={`p-4 rounded-lg border text-left transition-smooth hover:bg-surface-1 border-dashed ${
                  selectedTemplate === null ? 'border-primary' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">+</span>
                  <span className="font-semibold text-foreground">Custom</span>
                </div>
                <p className="text-xs text-muted-foreground">Start from scratch with blank config</p>
              </button>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Display Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateName(e.target.value)}
                    className="w-full bg-surface-1 text-foreground border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder="e.g., Frontend Dev"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Agent ID</label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                    className="w-full bg-surface-1 text-foreground border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono text-sm"
                    placeholder="frontend-dev"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Role / Theme</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full bg-surface-1 text-foreground border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder="builder engineer"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Emoji</label>
                  <input
                    type="text"
                    value={formData.emoji}
                    onChange={(e) => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                    className="w-full bg-surface-1 text-foreground border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder="e.g. \ud83d\udee0\ufe0f"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">Model Tier</label>
                <div className="flex gap-2">
                  {(['opus', 'sonnet', 'haiku'] as const).map(tier => (
                    <button
                      key={tier}
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        modelTier: tier,
                        modelPrimary: DEFAULT_MODEL_BY_TIER[tier],
                      }))}
                      className={`flex-1 px-3 py-2 text-sm rounded-md border transition-smooth ${
                        formData.modelTier === tier ? MODEL_TIER_COLORS[tier] + ' border' : 'bg-surface-1 text-muted-foreground border-border'
                      }`}
                    >
                      {MODEL_TIER_LABELS[tier]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">Primary Model</label>
                <input
                  type="text"
                  value={formData.modelPrimary}
                  onChange={(e) => setFormData(prev => ({ ...prev, modelPrimary: e.target.value }))}
                  list="create-agent-model-suggestions"
                  className="w-full bg-surface-1 text-foreground border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono text-sm"
                  placeholder={DEFAULT_MODEL_BY_TIER[formData.modelTier]}
                />
                <datalist id="create-agent-model-suggestions">
                  {availableModels.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Workspace</label>
                  <select
                    value={formData.workspaceAccess}
                    onChange={(e) => setFormData(prev => ({ ...prev, workspaceAccess: e.target.value as any }))}
                    className="w-full bg-surface-1 text-foreground border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="rw">Read/Write</option>
                    <option value="ro">Read Only</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Sandbox</label>
                  <select
                    value={formData.sandboxMode}
                    onChange={(e) => setFormData(prev => ({ ...prev, sandboxMode: e.target.value as any }))}
                    className="w-full bg-surface-1 text-foreground border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="all">All (Docker)</option>
                    <option value="non-main">Non-main</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Network</label>
                  <select
                    value={formData.dockerNetwork}
                    onChange={(e) => setFormData(prev => ({ ...prev, dockerNetwork: e.target.value as any }))}
                    className="w-full bg-surface-1 text-foreground border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="none">None (isolated)</option>
                    <option value="bridge">Bridge (internet)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">Session Key (optional)</label>
                <input
                  type="text"
                  value={formData.session_key}
                  onChange={(e) => setFormData(prev => ({ ...prev, session_key: e.target.value }))}
                  className="w-full bg-surface-1 text-foreground border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="OpenClaw session identifier"
                />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-surface-1/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{formData.emoji || (selectedTemplateData?.emoji || '?')}</span>
                  <div>
                    <h4 className="text-lg font-bold text-foreground">{formData.name || 'Unnamed'}</h4>
                    <p className="text-muted-foreground text-sm">{formData.role}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">ID:</span> <span className="text-foreground font-mono">{formData.id}</span></div>
                  <div><span className="text-muted-foreground">Template:</span> <span className="text-foreground">{selectedTemplateData?.label || 'Custom'}</span></div>
                  <div><span className="text-muted-foreground">Model:</span> <span className={`px-2 py-0.5 rounded text-xs ${MODEL_TIER_COLORS[formData.modelTier]}`}>{MODEL_TIER_LABELS[formData.modelTier]}</span></div>
                  <div><span className="text-muted-foreground">Tools:</span> <span className="text-foreground">{selectedTemplateData?.toolCount || 'Custom'}</span></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Primary Model:</span> <span className="text-foreground font-mono">{formData.modelPrimary || DEFAULT_MODEL_BY_TIER[formData.modelTier]}</span></div>
                  <div><span className="text-muted-foreground">Workspace:</span> <span className="text-foreground">{formData.workspaceAccess}</span></div>
                  <div><span className="text-muted-foreground">Sandbox:</span> <span className="text-foreground">{formData.sandboxMode}</span></div>
                  <div><span className="text-muted-foreground">Network:</span> <span className="text-foreground">{formData.dockerNetwork}</span></div>
                  {formData.session_key && (
                    <div><span className="text-muted-foreground">Session:</span> <span className="text-foreground font-mono">{formData.session_key}</span></div>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.write_to_gateway}
                  onChange={(e) => setFormData(prev => ({ ...prev, write_to_gateway: e.target.checked }))}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm text-foreground">Add to gateway config (openclaw.json)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.provision_openclaw_workspace}
                  onChange={(e) => setFormData(prev => ({ ...prev, provision_openclaw_workspace: e.target.checked }))}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm text-foreground">Provision full OpenClaw workspace (`openclaw agents add`)</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex gap-3 flex-shrink-0">
          {step > 1 && (
            <button
              onClick={() => setStep((step - 1) as 1 | 2)}
              className="px-4 py-2 bg-secondary text-muted-foreground rounded-md hover:bg-surface-2 transition-smooth"
            >
              Back
            </button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as 2 | 3)}
              disabled={step === 2 && !formData.name.trim()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-smooth"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={isCreating || !formData.name.trim()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-smooth"
            >
              {isCreating ? 'Creating...' : 'Create Agent'}
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 bg-secondary text-muted-foreground rounded-md hover:bg-surface-2 transition-smooth">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Config Tab Component for Agent Detail Modal
export function ConfigTab({
  agent,
  onSave
}: {
  agent: Agent & { config?: any }
  onSave: (updatedAgent?: any) => void
}) {
  const [config, setConfig] = useState<any>(agent.config || {})
  const [editing, setEditing] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jsonInput, setJsonInput] = useState('')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [newFallbackModel, setNewFallbackModel] = useState('')
  const [newAllowTool, setNewAllowTool] = useState('')
  const [newDenyTool, setNewDenyTool] = useState('')

  useEffect(() => {
    setConfig(agent.config || {})
    setJsonInput(JSON.stringify(agent.config || {}, null, 2))
  }, [agent.config])

  useEffect(() => {
    const loadAvailableModels = async () => {
      try {
        const response = await fetch('/api/status?action=models')
        if (!response.ok) return
        const data = await response.json()
        const models = Array.isArray(data.models) ? data.models : []
        const names = models
          .map((model: any) => String(model.name || model.alias || '').trim())
          .filter(Boolean)
        setAvailableModels(Array.from(new Set<string>(names)))
      } catch {
        // Ignore model suggestions if unavailable.
      }
    }
    loadAvailableModels()
  }, [])

  const updateModelConfig = (updater: (current: { primary?: string; fallbacks?: string[] }) => { primary?: string; fallbacks?: string[] }) => {
    setConfig((prev: any) => {
      const nextModel = updater({ ...(prev?.model || {}) })
      const dedupedFallbacks = [...new Set((nextModel.fallbacks || []).map((value) => value.trim()).filter(Boolean))]
      return {
        ...prev,
        model: {
          ...nextModel,
          fallbacks: dedupedFallbacks,
        },
      }
    })
  }

  const addFallbackModel = () => {
    const trimmed = newFallbackModel.trim()
    if (!trimmed) return
    updateModelConfig((current) => ({
      ...current,
      fallbacks: [...(current.fallbacks || []), trimmed],
    }))
    setNewFallbackModel('')
  }

  const updateIdentityField = (field: string, value: string) => {
    setConfig((prev: any) => ({
      ...prev,
      identity: { ...(prev.identity || {}), [field]: value },
    }))
  }

  const updateSandboxField = (field: string, value: string) => {
    setConfig((prev: any) => ({
      ...prev,
      sandbox: { ...(prev.sandbox || {}), [field]: value },
    }))
  }

  const addTool = (list: 'allow' | 'deny', value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    setConfig((prev: any) => {
      const tools = prev.tools || {}
      const existing = Array.isArray(tools[list]) ? tools[list] : []
      if (existing.includes(trimmed)) return prev
      return { ...prev, tools: { ...tools, [list]: [...existing, trimmed] } }
    })
  }

  const removeTool = (list: 'allow' | 'deny', index: number) => {
    setConfig((prev: any) => {
      const tools = prev.tools || {}
      const existing = Array.isArray(tools[list]) ? [...tools[list]] : []
      existing.splice(index, 1)
      return { ...prev, tools: { ...tools, [list]: existing } }
    })
  }

  const handleSave = async () => {
    if (agent.id == null || agent.id === undefined) {
      setError('Agent ID is missing; cannot save config')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (!showJson) {
        const primary = String(config?.model?.primary || '').trim()
        if (!primary) {
          throw new Error('Primary model is required')
        }
      }
      const gatewayConfig = showJson ? JSON.parse(jsonInput) : config
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway_config: gatewayConfig,
          write_to_gateway: true,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.message || 'Failed to save')
      setEditing(false)
      setConfig(data.agent?.config ?? gatewayConfig)
      setJsonInput(JSON.stringify(data.agent?.config ?? gatewayConfig, null, 2))
      onSave(data.agent)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save config')
    } finally {
      setSaving(false)
    }
  }

  const model = config.model || {}
  const identity = config.identity || {}
  const sandbox = config.sandbox || {}
  const tools = config.tools || {}
  const subagents = config.subagents || {}
  const memorySearch = config.memorySearch || {}
  const sandboxMode = sandbox.mode || sandbox.sandboxMode || sandbox.sandbox_mode || config.sandboxMode || 'not configured'
  const sandboxWorkspace = sandbox.workspaceAccess || sandbox.workspace_access || sandbox.workspace || config.workspaceAccess || 'not configured'
  const sandboxNetwork = sandbox?.docker?.network || sandbox.network || sandbox.dockerNetwork || sandbox.docker_network || 'none'
  const identityName = identity.name || agent.name || 'not configured'
  const identityTheme = identity.theme || agent.role || 'not configured'
  const identityEmoji = identity.emoji || '?'
  const identityPreview = identity.content || ''
  const toolAllow = Array.isArray(tools.allow) ? tools.allow : []
  const toolDeny = Array.isArray(tools.deny) ? tools.deny : []
  const toolRawPreview = typeof tools.raw === 'string' ? tools.raw : ''
  const modelPrimary = model.primary || ''
  const modelFallbacks = Array.isArray(model.fallbacks) ? model.fallbacks : []

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-medium text-foreground">OpenClaw Config</h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowJson(!showJson)}
            className="px-3 py-1 text-xs bg-surface-2 text-muted-foreground rounded-md hover:bg-surface-1 transition-smooth"
          >
            {showJson ? 'Structured' : 'JSON'}
          </button>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-smooth"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {config.openclawId && (
        <div className="text-xs text-muted-foreground">
          OpenClaw ID: <span className="font-mono text-foreground">{config.openclawId}</span>
          {config.isDefault && <span className="ml-2 px-1.5 py-0.5 bg-primary/20 text-primary rounded text-xs">Default</span>}
        </div>
      )}

      {showJson ? (
        /* JSON view */
        <div>
          {editing ? (
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={20}
              className="w-full bg-surface-1 text-foreground border border-border rounded-md px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          ) : (
            <pre className="bg-surface-1/30 rounded p-4 text-xs text-foreground/90 overflow-auto max-h-96 font-mono">
              {JSON.stringify(config, null, 2)}
            </pre>
          )}
        </div>
      ) : (
        /* Structured view */
        <div className="space-y-4">
          {/* Model */}
          <div className="bg-surface-1/50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-foreground mb-2">Model</h5>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Primary model</label>
                  <input
                    value={modelPrimary}
                    onChange={(e) => updateModelConfig((current) => ({ ...current, primary: e.target.value }))}
                    list="agent-model-suggestions"
                    placeholder="anthropic/claude-sonnet-4-20250514"
                    className="w-full bg-surface-1 text-foreground rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <datalist id="agent-model-suggestions">
                    {availableModels.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Fallback models</label>
                  <div className="space-y-2">
                    {modelFallbacks.map((fallback: string, index: number) => (
                      <div key={`${fallback}-${index}`} className="flex gap-2">
                        <input
                          value={fallback}
                          onChange={(e) => {
                            const next = [...modelFallbacks]
                            next[index] = e.target.value
                            updateModelConfig((current) => ({ ...current, fallbacks: next }))
                          }}
                          list="agent-model-suggestions"
                          className="flex-1 bg-surface-1 text-foreground rounded px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                        <button
                          onClick={() => {
                            const next = modelFallbacks.filter((_: string, i: number) => i !== index)
                            updateModelConfig((current) => ({ ...current, fallbacks: next }))
                          }}
                          className="px-3 py-2 text-xs bg-red-500/10 text-red-400 border border-red-500/30 rounded hover:bg-red-500/20 transition-smooth"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        value={newFallbackModel}
                        onChange={(e) => setNewFallbackModel(e.target.value)}
                        list="agent-model-suggestions"
                        placeholder="Add fallback model"
                        className="flex-1 bg-surface-1 text-foreground rounded px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                      <button
                        onClick={addFallbackModel}
                        className="px-3 py-2 text-xs bg-secondary text-foreground rounded hover:bg-surface-2 transition-smooth"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm">
                <div><span className="text-muted-foreground">Primary:</span> <span className="text-foreground font-mono">{modelPrimary || 'not configured'}</span></div>
                {modelFallbacks.length > 0 && (
                  <div className="mt-1">
                    <span className="text-muted-foreground">Fallbacks:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {modelFallbacks.map((fb: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 text-xs bg-surface-2 rounded text-muted-foreground font-mono">{fb.split('/').pop()}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="bg-surface-1/50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-foreground mb-2">Identity</h5>
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Emoji</label>
                    <input
                      value={identityEmoji}
                      onChange={(e) => updateIdentityField('emoji', e.target.value)}
                      className="w-full bg-surface-1 text-foreground rounded px-3 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary/50"
                      placeholder="🤖"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Name</label>
                    <input
                      value={identity.name || ''}
                      onChange={(e) => updateIdentityField('name', e.target.value)}
                      className="w-full bg-surface-1 text-foreground rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                      placeholder="Agent name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Theme / Role</label>
                    <input
                      value={identity.theme || ''}
                      onChange={(e) => updateIdentityField('theme', e.target.value)}
                      className="w-full bg-surface-1 text-foreground rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                      placeholder="e.g. backend engineer"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Identity content</label>
                  <textarea
                    value={identity.content || ''}
                    onChange={(e) => updateIdentityField('content', e.target.value)}
                    rows={4}
                    className="w-full bg-surface-1 text-foreground border border-border rounded-md px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder="Describe the agent's identity and personality..."
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-2xl">{identityEmoji}</span>
                  <div>
                    <div className="text-foreground font-medium">{identityName}</div>
                    <div className="text-muted-foreground">{identityTheme}</div>
                  </div>
                </div>
                {identityPreview && (
                  <pre className="mt-3 text-xs text-muted-foreground bg-surface-1 rounded p-2 overflow-auto whitespace-pre-wrap">
                    {identityPreview}
                  </pre>
                )}
              </>
            )}
          </div>

          {/* Sandbox */}
          <div className="bg-surface-1/50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-foreground mb-2">Sandbox</h5>
            {editing ? (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Mode</label>
                  <select
                    value={sandbox.mode || ''}
                    onChange={(e) => updateSandboxField('mode', e.target.value)}
                    className="w-full bg-surface-1 text-foreground rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">Not configured</option>
                    <option value="all">All</option>
                    <option value="non-main">Non-main</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Workspace Access</label>
                  <select
                    value={sandbox.workspaceAccess || ''}
                    onChange={(e) => updateSandboxField('workspaceAccess', e.target.value)}
                    className="w-full bg-surface-1 text-foreground rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">Not configured</option>
                    <option value="rw">Read-write</option>
                    <option value="ro">Read-only</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Network</label>
                  <input
                    value={sandbox.network || ''}
                    onChange={(e) => updateSandboxField('network', e.target.value)}
                    className="w-full bg-surface-1 text-foreground rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder="none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><span className="text-muted-foreground">Mode:</span> <span className="text-foreground">{sandboxMode}</span></div>
                <div><span className="text-muted-foreground">Workspace:</span> <span className="text-foreground">{sandboxWorkspace}</span></div>
                <div><span className="text-muted-foreground">Network:</span> <span className="text-foreground">{sandboxNetwork}</span></div>
              </div>
            )}
          </div>

          {/* Tools */}
          <div className="bg-surface-1/50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-foreground mb-2">Tools</h5>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-green-400 font-medium mb-1">Allow list</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {toolAllow.map((tool: string, i: number) => (
                      <span key={`${tool}-${i}`} className="px-2 py-0.5 text-xs bg-green-500/10 text-green-400 rounded border border-green-500/20 flex items-center gap-1">
                        {tool}
                        <button onClick={() => removeTool('allow', i)} className="text-green-400/60 hover:text-green-400 ml-1">&times;</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newAllowTool}
                      onChange={(e) => setNewAllowTool(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTool('allow', newAllowTool); setNewAllowTool('') } }}
                      placeholder="Add allowed tool name"
                      className="flex-1 bg-surface-1 text-foreground rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button
                      onClick={() => { addTool('allow', newAllowTool); setNewAllowTool('') }}
                      className="px-3 py-2 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-smooth"
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-red-400 font-medium mb-1">Deny list</label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {toolDeny.map((tool: string, i: number) => (
                      <span key={`${tool}-${i}`} className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 rounded border border-red-500/20 flex items-center gap-1">
                        {tool}
                        <button onClick={() => removeTool('deny', i)} className="text-red-400/60 hover:text-red-400 ml-1">&times;</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newDenyTool}
                      onChange={(e) => setNewDenyTool(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTool('deny', newDenyTool); setNewDenyTool('') } }}
                      placeholder="Add denied tool name"
                      className="flex-1 bg-surface-1 text-foreground rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button
                      onClick={() => { addTool('deny', newDenyTool); setNewDenyTool('') }}
                      className="px-3 py-2 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-smooth"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {toolAllow.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs text-green-400 font-medium">Allow ({toolAllow.length}):</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {toolAllow.map((tool: string) => (
                        <span key={tool} className="px-2 py-0.5 text-xs bg-green-500/10 text-green-400 rounded border border-green-500/20">{tool}</span>
                      ))}
                    </div>
                  </div>
                )}
                {toolDeny.length > 0 && (
                  <div>
                    <span className="text-xs text-red-400 font-medium">Deny ({toolDeny.length}):</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {toolDeny.map((tool: string) => (
                        <span key={tool} className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 rounded border border-red-500/20">{tool}</span>
                      ))}
                    </div>
                  </div>
                )}
                {toolAllow.length === 0 && toolDeny.length === 0 && !toolRawPreview && (
                  <div className="text-xs text-muted-foreground">No tools configured</div>
                )}
                {toolRawPreview && (
                  <pre className="mt-3 text-xs text-muted-foreground bg-surface-1 rounded p-2 overflow-auto whitespace-pre-wrap">
                    {toolRawPreview}
                  </pre>
                )}
              </>
            )}
          </div>

          {/* Subagents */}
          {subagents.allowAgents && subagents.allowAgents.length > 0 && (
            <div className="bg-surface-1/50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-foreground mb-2">Subagents</h5>
              <div className="flex flex-wrap gap-1">
                {subagents.allowAgents.map((a: string) => (
                  <span key={a} className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">{a}</span>
                ))}
              </div>
              {subagents.model && (
                <div className="text-xs text-muted-foreground mt-1">Model: {subagents.model}</div>
              )}
            </div>
          )}

          {/* Memory Search */}
          {memorySearch.sources && (
            <div className="bg-surface-1/50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-foreground mb-2">Memory Search</h5>
              <div className="flex gap-1">
                {memorySearch.sources.map((s: string) => (
                  <span key={s} className="px-2 py-0.5 text-xs bg-cyan-500/10 text-cyan-400 rounded">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {editing && (
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 transition-smooth"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false)
              setConfig(agent.config || {})
              setJsonInput(JSON.stringify(agent.config || {}, null, 2))
            }}
            className="px-4 py-2 bg-secondary text-muted-foreground rounded-md hover:bg-surface-2 transition-smooth"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
