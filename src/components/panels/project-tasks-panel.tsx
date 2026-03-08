'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClientLogger } from '@/lib/client-logger'

const log = createClientLogger('ProjectTasksPanel')

interface BrainProject {
  slug: string
  name: string
  hasProjectMd: boolean
  hasTasksMd: boolean
}

interface ParsedTask {
  id: string
  status: string
  priority: string
  owner: string
  description: string
}

export function ProjectTasksPanel() {
  const [projects, setProjects] = useState<BrainProject[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [tasks, setTasks] = useState<ParsedTask[]>([])
  const [ownerFilter, setOwnerFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newOwner, setNewOwner] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/brain/projects')
      if (!res.ok) throw new Error('Failed to load projects')
      const data = await res.json()
      setProjects(data.projects || [])
      if (!selectedProject && data.projects?.length > 0) {
        setSelectedProject(data.projects[0].slug)
      }
    } catch (err) {
      log.error('Failed to load projects:', err)
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [selectedProject])

  const loadTasks = useCallback(async () => {
    if (!selectedProject) {
      setTasks([])
      return
    }
    setTasksLoading(true)
    try {
      const url = ownerFilter
        ? `/api/brain/projects/${encodeURIComponent(selectedProject)}/tasks?owner=${encodeURIComponent(ownerFilter)}`
        : `/api/brain/projects/${encodeURIComponent(selectedProject)}/tasks`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load tasks')
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch (err) {
      log.error('Failed to load tasks:', err)
      setTasks([])
    } finally {
      setTasksLoading(false)
    }
  }, [selectedProject, ownerFilter])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handleAddTask = async () => {
    if (!selectedProject || !newTitle.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/brain/projects/${encodeURIComponent(selectedProject)}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          title: newTitle.trim(),
          owner: newOwner.trim() || undefined,
          status: 'pending',
          priority: 'medium'
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add task')
      setNewTitle('')
      setNewOwner('')
      setShowAddTask(false)
      loadTasks()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStatus = async (taskId: string, status: string) => {
    if (!selectedProject) return
    try {
      const res = await fetch(`/api/brain/projects/${encodeURIComponent(selectedProject)}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: taskId,
          updates: { status }
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      loadTasks()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  const project = projects.find((p) => p.slug === selectedProject)

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-3xl font-bold text-foreground">Projects</h1>
        <p className="text-muted-foreground mt-2">
          Manage project tasks from BRAIN/projects/&lt;project&gt;/TASKS.md
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="ml-3 text-muted-foreground">Loading projects...</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          No projects found. Create BRAIN/projects/&lt;slug&gt;/ and add PROJECT.md and TASKS.md.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 items-center">
            <label className="text-sm font-medium text-foreground">Project:</label>
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value || null)}
              className="px-3 py-2 bg-surface-1 border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {projects.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} ({p.slug})
                </option>
              ))}
            </select>
            <label className="text-sm font-medium text-muted-foreground">Filter by owner:</label>
            <input
              type="text"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              placeholder="agent name"
              className="px-3 py-2 bg-surface-1 border border-border rounded-md text-foreground w-40 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={() => setShowAddTask(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
            >
              + Add Task
            </button>
          </div>

          {selectedProject && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  {project?.name || selectedProject}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                </span>
              </div>

              {tasksLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No tasks. Add one to get started.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-secondary/30"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm text-muted-foreground">{task.id}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              task.status === 'done'
                                ? 'bg-green-500/20 text-green-400'
                                : task.status === 'in_progress'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-secondary text-muted-foreground'
                            }`}
                          >
                            {task.status}
                          </span>
                          <span className="text-xs text-muted-foreground">{task.priority}</span>
                          {task.owner && (
                            <span className="text-xs text-muted-foreground">owner: {task.owner}</span>
                          )}
                        </div>
                        <p className="text-foreground mt-1">{task.description || '(no description)'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {task.status !== 'done' ? (
                          <button
                            onClick={() => handleUpdateStatus(task.id, 'done')}
                            className="px-2 py-1 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/30 transition-colors"
                          >
                            Mark done
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(task.id, 'pending')}
                            className="px-2 py-1 text-xs bg-secondary text-muted-foreground rounded hover:bg-secondary/80 transition-colors"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showAddTask && selectedProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground mb-4">Add Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Task description"
                  className="w-full px-3 py-2 bg-surface-1 border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Owner (optional)</label>
                <input
                  type="text"
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  placeholder="agent-id"
                  className="w-full px-3 py-2 bg-surface-1 border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddTask}
                  disabled={submitting || !newTitle.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Adding...' : 'Add'}
                </button>
                <button
                  onClick={() => {
                    setShowAddTask(false)
                    setNewTitle('')
                    setNewOwner('')
                  }}
                  className="px-4 py-2 bg-secondary text-muted-foreground rounded-md hover:bg-secondary/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
