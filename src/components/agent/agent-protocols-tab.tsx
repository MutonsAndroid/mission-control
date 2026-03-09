'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigateToPanel } from '@/lib/navigation'

interface AgentProtocolsTabProps {
  agentId: string
  agentName: string
}

export function AgentProtocolsTab({ agentId, agentName }: AgentProtocolsTabProps) {
  const navigateToPanel = useNavigateToPanel()
  const [assigned, setAssigned] = useState<string[]>([])
  const [allProtocols, setAllProtocols] = useState<{ name: string; path: string; meta?: { title?: string } }[]>([])
  const [loading, setLoading] = useState(true)
  const [assignModalOpen, setAssignModalOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [agentRes, protocolsRes] = await Promise.all([
        fetch(`/api/brain/agents/${encodeURIComponent(agentId)}/protocols`),
        fetch('/api/protocols'),
      ])
      const agentData = await agentRes.json()
      const protocolsData = await protocolsRes.json()
      setAssigned(agentData.protocols || [])
      setAllProtocols(protocolsData.protocols || [])
    } catch {
      setAssigned([])
      setAllProtocols([])
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const assign = async (protocol: string) => {
    try {
      const res = await fetch(`/api/brain/agents/${encodeURIComponent(agentId)}/protocols`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol }),
      })
      if (res.ok) {
        const data = await res.json()
        setAssigned(data.protocols || [])
        setAssignModalOpen(false)
      }
    } catch {
      // ignore
    }
  }

  const unassign = async (protocol: string) => {
    try {
      const res = await fetch(
        `/api/brain/agents/${encodeURIComponent(agentId)}/protocols?protocol=${encodeURIComponent(protocol)}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        const data = await res.json()
        setAssigned(data.protocols || [])
      }
    } catch {
      // ignore
    }
  }

  const unassignedProtocols = allProtocols.filter((p) => !assigned.includes(p.name))

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <h4 className="text-lg font-medium text-foreground">Assigned Protocols</h4>
      <p className="text-sm text-muted-foreground">
        Protocols define operational procedures this agent should follow. They are stored as Markdown in
        BRAIN/_portfolio/protocols/.
      </p>

      {assigned.length === 0 ? (
        <div className="bg-surface-1/50 rounded-lg p-4 text-center text-muted-foreground text-sm">
          No protocols assigned
        </div>
      ) : (
        <div className="space-y-2">
          {assigned.map((name) => (
            <div
              key={name}
              className="flex items-center justify-between gap-3 p-3 bg-surface-1/50 rounded-lg border border-border"
            >
              <button
                onClick={() => navigateToPanel('protocols', name)}
                className="text-foreground hover:text-primary text-left font-mono text-sm truncate flex-1"
              >
                {name}
              </button>
              <button
                onClick={() => unassign(name)}
                className="px-2 py-1 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded hover:bg-red-500/20 transition-smooth shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setAssignModalOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-smooth"
        >
          Assign Protocol
        </button>
        <button
          onClick={() => navigateToPanel('protocols')}
          className="px-4 py-2 bg-secondary text-muted-foreground rounded-md text-sm hover:bg-surface-2 transition-smooth"
        >
          Browse Protocols
        </button>
      </div>

      {assignModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-foreground mb-4">Assign Protocol</h3>
            {unassignedProtocols.length === 0 ? (
              <p className="text-muted-foreground text-sm mb-4">
                All protocols are already assigned, or no protocols exist yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {unassignedProtocols.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => assign(p.name)}
                    className="w-full text-left px-3 py-2 rounded-md bg-surface-1 hover:bg-surface-2 text-foreground text-sm transition-smooth"
                  >
                    <div className="font-medium">{p.meta?.title || p.name.replace(/\.md$/, '').replace(/-/g, ' ')}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.name}</div>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setAssignModalOpen(false)}
              className="w-full px-4 py-2 bg-secondary text-muted-foreground rounded-md hover:bg-surface-2 transition-smooth"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
