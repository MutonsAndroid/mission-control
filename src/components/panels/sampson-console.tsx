'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigateToPanel } from '@/lib/navigation'
import { AgentCommsPanel } from './agent-comms-panel'

interface PortfolioData {
  'active-recall'?: string
  'morning-brief'?: string
  escalations?: string
  'expansion-requests'?: string
  'recent-reports'?: string
}

interface BrainProject {
  slug: string
  name: string
  hasProjectMd: boolean
  hasTasksMd: boolean
}

export function SampsonConsole() {
  const navigateToPanel = useNavigateToPanel()

  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [projects, setProjects] = useState<BrainProject[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [portfolioRes, projectsRes] = await Promise.all([
        fetch('/api/brain/portfolio'),
        fetch('/api/brain/projects'),
      ])
      if (portfolioRes.ok) {
        const data = await portfolioRes.json()
        setPortfolio(data)
      }
      if (projectsRes.ok) {
        const data = await projectsRes.json()
        setProjects(data.projects || [])
      }
    } catch {
      setPortfolio(null)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-foreground">Sampson</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Portfolio control center · Dustin&apos;s OpenClaw ecosystem
        </p>
      </div>

      {/* Create Project CTA */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Create Project</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Start a new operational organism</p>
          </div>
          <button
            onClick={() => navigateToPanel('projects/create')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-smooth text-sm font-medium"
          >
            New Project
          </button>
        </div>
      </div>

      {/* Project Status */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <h3 className="text-sm font-semibold text-foreground px-4 py-3 border-b border-border">Project Status</h3>
        {loading ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">No projects yet</div>
        ) : (
          <div className="divide-y divide-border">
            {projects.map((p) => (
              <button
                key={p.slug}
                onClick={() => navigateToPanel('project', p.slug)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-smooth text-left"
              >
                <span className="font-medium text-foreground">{p.name || p.slug}</span>
                <span className="text-xs text-muted-foreground font-mono">{p.slug}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Morning Brief */}
      {portfolio?.['morning-brief'] && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <h3 className="text-sm font-semibold text-foreground px-4 py-3 border-b border-border">Morning Brief</h3>
          <div className="p-4 text-sm text-foreground/90 whitespace-pre-wrap">
            {portfolio['morning-brief']}
          </div>
        </div>
      )}

      {/* Escalations */}
      {portfolio?.escalations && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 overflow-hidden">
          <h3 className="text-sm font-semibold text-amber-400 px-4 py-3 border-b border-amber-500/20">Escalations</h3>
          <div className="p-4 text-sm text-foreground/90 whitespace-pre-wrap">
            {portfolio.escalations}
          </div>
        </div>
      )}

      {/* Expansion Requests */}
      {portfolio?.['expansion-requests'] && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <h3 className="text-sm font-semibold text-foreground px-4 py-3 border-b border-border">Expansion Requests</h3>
          <div className="p-4 text-sm text-foreground/90 whitespace-pre-wrap">
            {portfolio['expansion-requests']}
          </div>
        </div>
      )}

      {/* Sampson Chat */}
      <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
        <AgentCommsPanel defaultToAgent="Sampson" />
      </div>
    </div>
  )
}
