'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigateToPanel } from '@/lib/navigation'
import { AddAgentModal } from './add-agent-modal'

interface ProjectCommandCenterProps {
  slug: string
}

interface ParsedTask {
  id: string
  status: string
  priority: string
  owner: string
  description: string
}

interface HierarchyNode {
  id: string
  children: HierarchyNode[]
}

interface RecentFile {
  name: string
  path: string
  mtime: number
}

function formatTree(node: HierarchyNode, depth = 0): React.ReactNode {
  const prefix = depth === 0 ? '' : ' '.repeat(depth * 2) + (depth === 1 ? '├ ' : '└ ')
  return (
    <div key={node.id} className="flex flex-col">
      <div className="text-sm font-mono text-foreground/90">
        {prefix}{node.id}
      </div>
      {node.children.map((child, i) => (
        <div key={child.id} className="ml-2">
          {formatTree(child, depth + 1)}
        </div>
      ))}
    </div>
  )
}

export function ProjectCommandCenter({ slug }: ProjectCommandCenterProps) {
  const navigateToPanel = useNavigateToPanel()
  const [mission, setMission] = useState('')
  const [missionEditing, setMissionEditing] = useState(false)
  const [missionSaving, setMissionSaving] = useState(false)
  const [tasks, setTasks] = useState<ParsedTask[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [structureLog, setStructureLog] = useState('')
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([])
  const [hierarchy, setHierarchy] = useState<HierarchyNode | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskOwner, setNewTaskOwner] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [ownerFilter, setOwnerFilter] = useState('')
  const [addAgentOpen, setAddAgentOpen] = useState(false)

  const loadMission = useCallback(async () => {
    try {
      const res = await fetch(`/api/brain/projects/${encodeURIComponent(slug)}`)
      if (res.ok) {
        const data = await res.json()
        setMission(data.content || '')
      }
    } catch { /* ignore */ }
  }, [slug])

  const loadTasks = useCallback(async () => {
    setTasksLoading(true)
    try {
      const url = ownerFilter
        ? `/api/brain/projects/${encodeURIComponent(slug)}/tasks?owner=${encodeURIComponent(ownerFilter)}`
        : `/api/brain/projects/${encodeURIComponent(slug)}/tasks`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch { setTasks([]) }
    finally { setTasksLoading(false) }
  }, [slug, ownerFilter])

  const loadStructureLog = useCallback(async () => {
    try {
      const res = await fetch(`/api/brain/projects/${encodeURIComponent(slug)}/logs/structure`)
      if (res.ok) {
        const data = await res.json()
        setStructureLog(data.content || '')
      }
    } catch { /* ignore */ }
  }, [slug])

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch(`/api/brain/projects/${encodeURIComponent(slug)}/recent`)
      if (res.ok) {
        const data = await res.json()
        setRecentFiles(data.files || [])
      }
    } catch { /* ignore */ }
  }, [slug])

  const loadHierarchy = useCallback(async () => {
    try {
      const res = await fetch(`/api/brain/hierarchy?project=${encodeURIComponent(slug)}`)
      if (res.ok) {
        const data = await res.json()
        setHierarchy(data.hierarchy?.root || null)
      }
    } catch { /* ignore */ }
  }, [slug])

  useEffect(() => { loadMission() }, [loadMission])
  useEffect(() => { loadTasks() }, [loadTasks])
  useEffect(() => { loadStructureLog() }, [loadStructureLog])
  useEffect(() => { loadRecent() }, [loadRecent])
  useEffect(() => { loadHierarchy() }, [loadHierarchy])

  const saveMission = async () => {
    setMissionSaving(true)
    try {
      const res = await fetch(`/api/brain/projects/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: mission }),
      })
      if (res.ok) setMissionEditing(false)
    } catch { /* ignore */ }
    finally { setMissionSaving(false) }
  }

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return
    setAddingTask(true)
    try {
      const res = await fetch(`/api/brain/projects/${encodeURIComponent(slug)}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          title: newTaskTitle.trim(),
          owner: newTaskOwner.trim() || undefined,
          status: 'pending',
          priority: 'medium',
        }),
      })
      if (res.ok) {
        setNewTaskTitle('')
        setNewTaskOwner('')
        loadTasks()
      }
    } catch { /* ignore */ }
    finally { setAddingTask(false) }
  }

  const handleTaskStatus = async (taskId: string, status: string) => {
    try {
      await fetch(`/api/brain/projects/${encodeURIComponent(slug)}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: taskId, updates: { status } }),
      })
      loadTasks()
    } catch { /* ignore */ }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
          <p className="text-muted-foreground text-sm mt-1 font-mono">{slug}</p>
        </div>
        <button
          onClick={() => navigateToPanel('projects')}
          className="px-3 py-1.5 text-sm bg-secondary text-foreground rounded-md hover:bg-secondary/80"
        >
          Back to Projects
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Mission */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Mission</h3>
            {missionEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={saveMission}
                  disabled={missionSaving}
                  className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded"
                >
                  {missionSaving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setMissionEditing(false)} className="text-xs px-2 py-1 bg-secondary rounded">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setMissionEditing(true)} className="text-xs text-muted-foreground hover:text-foreground">
                Edit
              </button>
            )}
          </div>
          <div className="p-4">
            {missionEditing ? (
              <textarea
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                className="w-full h-32 px-3 py-2 rounded border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            ) : (
              <div className="text-sm text-foreground/90 whitespace-pre-wrap">
                {mission || '(No mission yet)'}
              </div>
            )}
          </div>
        </div>

        {/* Agent Team */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Agent Team</h3>
            <button
              onClick={() => setAddAgentOpen(true)}
              className="text-xs px-2 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30"
            >
              Add Agent
            </button>
          </div>
          <div className="p-4">
            {hierarchy ? (
              formatTree(hierarchy)
            ) : (
              <p className="text-sm text-muted-foreground">No agents in this project yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground">Tasks</h3>
          <input
            type="text"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            placeholder="Filter by owner"
            className="w-32 px-2 py-1 text-sm rounded border border-border bg-background"
          />
          <div className="flex-1" />
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="New task..."
              className="w-48 px-2 py-1 text-sm rounded border border-border bg-background"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            />
            <input
              type="text"
              value={newTaskOwner}
              onChange={(e) => setNewTaskOwner(e.target.value)}
              placeholder="Owner"
              className="w-24 px-2 py-1 text-sm rounded border border-border bg-background"
            />
            <button
              onClick={handleAddTask}
              disabled={addingTask || !newTaskTitle.trim()}
              className="px-2 py-1 text-sm bg-primary text-primary-foreground rounded disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
        <div className="divide-y divide-border max-h-64 overflow-y-auto">
          {tasksLoading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
          ) : tasks.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">No tasks</div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between px-4 py-2 hover:bg-secondary/30">
                <div>
                  <span className="font-mono text-xs text-muted-foreground">{task.id}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                    task.status === 'done' ? 'bg-green-500/20 text-green-400' : 'bg-secondary'
                  }`}>{task.status}</span>
                  <span className="ml-2 text-sm text-foreground">{task.description}</span>
                </div>
                {task.status !== 'done' ? (
                  <button onClick={() => handleTaskStatus(task.id, 'done')} className="text-xs text-green-400 hover:underline">
                    Mark done
                  </button>
                ) : (
                  <button onClick={() => handleTaskStatus(task.id, 'pending')} className="text-xs text-muted-foreground hover:underline">
                    Reopen
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Work */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <h3 className="text-sm font-semibold text-foreground px-4 py-3 border-b border-border">Recent Work</h3>
          <div className="p-4">
            {recentFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent files</p>
            ) : (
              <ul className="text-sm font-mono text-foreground/80 space-y-1">
                {recentFiles.map((f) => (
                  <li key={f.path}>{f.path}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Structure Log */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <h3 className="text-sm font-semibold text-foreground px-4 py-3 border-b border-border">Structure Log</h3>
          <div className="p-4 max-h-48 overflow-y-auto">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
              {structureLog || '(Empty)'}
            </pre>
          </div>
        </div>
      </div>

      {addAgentOpen && (
        <AddAgentModal
          projectSlug={slug}
          reportsToOptions={[
            { id: 'sampson', label: 'Sampson' },
            { id: `${slug}-pm`, label: `${slug} (Project Manager)` },
          ]}
          onClose={() => setAddAgentOpen(false)}
          onCreated={() => {
            setAddAgentOpen(false)
            loadHierarchy()
            loadStructureLog()
          }}
        />
      )}
    </div>
  )
}
